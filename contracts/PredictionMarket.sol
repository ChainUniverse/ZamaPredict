// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, euint64, ebool, externalEuint32, externalEuint64, externalEbool} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

contract PredictionMarket is SepoliaConfig {
    struct PredictionEvent {
        uint256 id;
        string description;
        uint256 startTime;
        uint256 endTime;
        uint256 priceYes;  // Fixed price for YES bets (in wei)
        uint256 priceNo;   // Fixed price for NO bets (in wei)
        bool isResolved;
        bool outcome;      // true = YES wins, false = NO wins
        euint64 totalYesBets;   // Total encrypted YES bet amounts
        euint64 totalNoBets;    // Total encrypted NO bet amounts
        uint256 totalYesShares; // Total public YES shares count
        uint256 totalNoShares;  // Total public NO shares count
        uint256 totalPoolEth;   // Total ETH in the pool
    }

    struct UserBet {
        euint64 encryptedAmount;  // Encrypted bet amount in wei
        euint32 encryptedShares;  // Encrypted number of shares
        ebool isYesBet;          // Encrypted bet direction (true = YES, false = NO)
        bool hasPlacedBet;       // Public flag to prevent double betting
    }

    mapping(uint256 => PredictionEvent) public predictionEvents;
    mapping(uint256 => mapping(address => UserBet)) public userBets;
    mapping(address => euint64) public userRewards;
    
    uint256 public eventCounter;
    address public owner;
    
    // Error codes for encrypted error handling
    euint32 internal NO_ERROR;
    euint32 internal BETTING_NOT_ACTIVE;
    euint32 internal INSUFFICIENT_PAYMENT;
    euint32 internal ALREADY_BET;
    euint32 internal EVENT_NOT_RESOLVED;
    euint32 internal NO_WINNINGS;

    struct LastError {
        euint32 error;
        uint256 timestamp;
    }
    
    mapping(address => LastError) private _lastErrors;

    event PredictionEventCreated(
        uint256 indexed eventId,
        string description,
        uint256 startTime,
        uint256 endTime,
        uint256 priceYes,
        uint256 priceNo
    );
    
    event BetPlaced(
        uint256 indexed eventId,
        address indexed user,
        uint256 timestamp
    );
    
    event EventResolved(
        uint256 indexed eventId,
        bool outcome
    );
    
    event RewardsClaimed(
        address indexed user,
        uint256 timestamp
    );

    event ErrorChanged(address indexed user);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier eventExists(uint256 eventId) {
        require(eventId < eventCounter, "Event does not exist");
        _;
    }

    constructor() {
        owner = msg.sender;
        eventCounter = 0;
        
        // Initialize error codes
        NO_ERROR = FHE.asEuint32(0);
        BETTING_NOT_ACTIVE = FHE.asEuint32(1);
        INSUFFICIENT_PAYMENT = FHE.asEuint32(2);
        ALREADY_BET = FHE.asEuint32(3);
        EVENT_NOT_RESOLVED = FHE.asEuint32(4);
        NO_WINNINGS = FHE.asEuint32(5);
    }

    function createPredictionEvent(
        string memory description,
        uint256 startTime,
        uint256 endTime,
        uint256 priceYes,
        uint256 priceNo
    ) external onlyOwner {
        require(startTime > block.timestamp, "Start time must be in the future");
        require(endTime > startTime, "End time must be after start time");
        require(priceYes > 0 && priceNo > 0, "Prices must be greater than 0");

        predictionEvents[eventCounter] = PredictionEvent({
            id: eventCounter,
            description: description,
            startTime: startTime,
            endTime: endTime,
            priceYes: priceYes,
            priceNo: priceNo,
            isResolved: false,
            outcome: false,
            totalYesBets: FHE.asEuint64(0),
            totalNoBets: FHE.asEuint64(0),
            totalYesShares: 0,
            totalNoShares: 0,
            totalPoolEth: 0
        });

        // Grant ACL permissions for the encrypted totals
        FHE.allowThis(predictionEvents[eventCounter].totalYesBets);
        FHE.allowThis(predictionEvents[eventCounter].totalNoBets);

        emit PredictionEventCreated(
            eventCounter,
            description,
            startTime,
            endTime,
            priceYes,
            priceNo
        );

        eventCounter++;
    }

    function placeBet(
        uint256 eventId,
        externalEuint32 encryptedShares,
        externalEbool encryptedIsYesBet,
        bytes calldata inputProof
    ) external payable eventExists(eventId) {
        PredictionEvent storage event_ = predictionEvents[eventId];
        
        // Check if betting is active
        bool bettingActive = block.timestamp >= event_.startTime && 
                           block.timestamp <= event_.endTime && 
                           !event_.isResolved;
        
        if (!bettingActive) {
            setLastError(BETTING_NOT_ACTIVE, msg.sender);
            return;
        }

        // Check if user already placed a bet
        if (userBets[eventId][msg.sender].hasPlacedBet) {
            setLastError(ALREADY_BET, msg.sender);
            return;
        }

        // Validate and convert encrypted inputs
        euint32 shares = FHE.fromExternal(encryptedShares, inputProof);
        ebool isYesBet = FHE.fromExternal(encryptedIsYesBet, inputProof);

        // Calculate required payment based on bet direction
        // We use FHE.select to choose the price without revealing the direction
        euint64 yesPrice = FHE.asEuint64(event_.priceYes);
        euint64 noPrice = FHE.asEuint64(event_.priceNo);
        euint64 selectedPrice = FHE.select(isYesBet, yesPrice, noPrice);
        
        // Convert shares to euint64 for calculation
        euint64 sharesU64 = FHE.asEuint64(shares);
        euint64 requiredPayment = FHE.mul(sharesU64, selectedPrice);

        // Check if user sent enough ETH (we need to decrypt this for validation)
        euint64 sentAmount = FHE.asEuint64(msg.value);
        ebool hasEnoughPayment = FHE.gte(sentAmount, requiredPayment);

        // Set error if insufficient payment
        euint32 errorCode = FHE.select(hasEnoughPayment, NO_ERROR, INSUFFICIENT_PAYMENT);
        setLastError(errorCode, msg.sender);

        // Only process bet if payment is sufficient
        euint64 actualBetAmount = FHE.select(hasEnoughPayment, requiredPayment, FHE.asEuint64(0));
        euint32 actualShares = FHE.select(hasEnoughPayment, shares, FHE.asEuint32(0));

        // Store user bet
        userBets[eventId][msg.sender] = UserBet({
            encryptedAmount: actualBetAmount,
            encryptedShares: actualShares,
            isYesBet: isYesBet,
            hasPlacedBet: true
        });

        // Update totals (obfuscated - we add to both sides to hide bet direction)
        euint64 yesAmount = FHE.select(isYesBet, actualBetAmount, FHE.asEuint64(0));
        euint64 noAmount = FHE.select(isYesBet, FHE.asEuint64(0), actualBetAmount);

        event_.totalYesBets = FHE.add(event_.totalYesBets, yesAmount);
        event_.totalNoBets = FHE.add(event_.totalNoBets, noAmount);

        // Update public share counts (we reveal this for transparency)
        uint256 publicShares = FHE.decrypt(actualShares);
        bool publicIsYes = FHE.decrypt(isYesBet);
        
        if (publicShares > 0) {
            if (publicIsYes) {
                event_.totalYesShares += publicShares;
            } else {
                event_.totalNoShares += publicShares;
            }
            event_.totalPoolEth += FHE.decrypt(actualBetAmount);
        }

        // Grant ACL permissions
        FHE.allowThis(userBets[eventId][msg.sender].encryptedAmount);
        FHE.allow(userBets[eventId][msg.sender].encryptedAmount, msg.sender);
        FHE.allowThis(userBets[eventId][msg.sender].encryptedShares);
        FHE.allow(userBets[eventId][msg.sender].encryptedShares, msg.sender);
        FHE.allowThis(userBets[eventId][msg.sender].isYesBet);
        FHE.allow(userBets[eventId][msg.sender].isYesBet, msg.sender);

        FHE.allowThis(event_.totalYesBets);
        FHE.allowThis(event_.totalNoBets);

        emit BetPlaced(eventId, msg.sender, block.timestamp);
    }

    function resolveEvent(uint256 eventId, bool outcome) external onlyOwner eventExists(eventId) {
        PredictionEvent storage event_ = predictionEvents[eventId];
        require(block.timestamp > event_.endTime, "Event has not ended yet");
        require(!event_.isResolved, "Event already resolved");

        event_.outcome = outcome;
        event_.isResolved = true;

        emit EventResolved(eventId, outcome);
    }

    function claimRewards(uint256 eventId) external eventExists(eventId) {
        PredictionEvent storage event_ = predictionEvents[eventId];
        require(event_.isResolved, "Event not resolved yet");
        
        UserBet storage userBet = userBets[eventId][msg.sender];
        require(userBet.hasPlacedBet, "No bet placed");

        // Check if user won
        ebool userWon = FHE.eq(userBet.isYesBet, FHE.asEbool(event_.outcome));
        
        // Calculate winnings: user gets back their bet + share of losers' pool
        euint64 winnings = FHE.asEuint64(0);
        
        if (FHE.decrypt(userWon)) {
            // Calculate user's share of the winning pool
            uint256 totalWinningShares = event_.outcome ? event_.totalYesShares : event_.totalNoShares;
            uint256 userSharesDecrypted = FHE.decrypt(userBet.encryptedShares);
            
            if (totalWinningShares > 0) {
                // User gets proportional share of total pool
                uint256 userWinnings = (event_.totalPoolEth * userSharesDecrypted) / totalWinningShares;
                winnings = FHE.asEuint64(userWinnings);
            }
        }

        // Set error if no winnings
        ebool hasWinnings = FHE.gt(winnings, FHE.asEuint64(0));
        euint32 errorCode = FHE.select(hasWinnings, NO_ERROR, NO_WINNINGS);
        setLastError(errorCode, msg.sender);

        // Add to user rewards
        userRewards[msg.sender] = FHE.add(userRewards[msg.sender], winnings);
        
        // Mark bet as claimed (prevent double claiming)
        userBet.hasPlacedBet = false;

        // Grant ACL permissions
        FHE.allowThis(userRewards[msg.sender]);
        FHE.allow(userRewards[msg.sender], msg.sender);

        // Transfer winnings if any
        uint256 actualWinnings = FHE.decrypt(winnings);
        if (actualWinnings > 0) {
            payable(msg.sender).transfer(actualWinnings);
            emit RewardsClaimed(msg.sender, block.timestamp);
        }
    }

    function withdrawRewards() external {
        euint64 rewards = userRewards[msg.sender];
        uint256 rewardAmount = FHE.decrypt(rewards);
        
        require(rewardAmount > 0, "No rewards to withdraw");
        
        userRewards[msg.sender] = FHE.asEuint64(0);
        FHE.allowThis(userRewards[msg.sender]);
        FHE.allow(userRewards[msg.sender], msg.sender);
        
        payable(msg.sender).transfer(rewardAmount);
        emit RewardsClaimed(msg.sender, block.timestamp);
    }

    function setLastError(euint32 error, address user) private {
        _lastErrors[user] = LastError(error, block.timestamp);
        FHE.allowThis(_lastErrors[user].error);
        FHE.allow(_lastErrors[user].error, user);
        emit ErrorChanged(user);
    }

    // View functions
    function getPredictionEvent(uint256 eventId) external view eventExists(eventId) returns (
        uint256 id,
        string memory description,
        uint256 startTime,
        uint256 endTime,
        uint256 priceYes,
        uint256 priceNo,
        bool isResolved,
        bool outcome,
        uint256 totalYesShares,
        uint256 totalNoShares,
        uint256 totalPoolEth
    ) {
        PredictionEvent storage event_ = predictionEvents[eventId];
        return (
            event_.id,
            event_.description,
            event_.startTime,
            event_.endTime,
            event_.priceYes,
            event_.priceNo,
            event_.isResolved,
            event_.outcome,
            event_.totalYesShares,
            event_.totalNoShares,
            event_.totalPoolEth
        );
    }

    function getUserBet(uint256 eventId, address user) external view returns (
        euint64 encryptedAmount,
        euint32 encryptedShares,
        ebool isYesBet,
        bool hasPlacedBet
    ) {
        UserBet storage bet = userBets[eventId][user];
        return (
            bet.encryptedAmount,
            bet.encryptedShares,
            bet.isYesBet,
            bet.hasPlacedBet
        );
    }

    function getUserRewards(address user) external view returns (euint64) {
        return userRewards[user];
    }

    function getLastError(address user) external view returns (euint32, uint256) {
        LastError memory lastError = _lastErrors[user];
        return (lastError.error, lastError.timestamp);
    }

    function getEventCount() external view returns (uint256) {
        return eventCounter;
    }

    // Emergency functions
    function emergencyWithdraw() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        owner = newOwner;
    }
}