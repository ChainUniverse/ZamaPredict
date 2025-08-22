// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {
    FHE,
    euint32,
    euint64,
    ebool,
    externalEuint32,
    externalEuint64,
    externalEbool
} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title PredictionMarket - A confidential prediction market using FHE
/// @notice This contract allows users to place encrypted bets on prediction events
/// @dev Uses Zama's FHE for confidential betting amounts, shares, and directions
/// @author ZamaPredict Team
contract PredictionMarket is SepoliaConfig {
    /// @notice Represents a prediction event that users can bet on
    /// @dev Contains both public information and aggregated data for settlement
    struct PredictionEvent {
        uint256 id;                 // Unique identifier for the event
        string description;         // Human-readable description of the prediction
        uint256 startTime;         // Timestamp when betting starts
        uint256 endTime;           // Timestamp when betting ends
        uint256 priceYes;          // Fixed price for YES bets (in wei)
        uint256 priceNo;           // Fixed price for NO bets (in wei)
        bool isResolved;           // Whether the event outcome has been determined
        bool outcome;              // Final result: true = YES wins, false = NO wins
        uint256 totalYesShares;    // Total public YES shares count
        uint256 totalNoShares;     // Total public NO shares count
        uint256 totalPoolEth;      // Total ETH collected in the betting pool
    }

    /// @notice Represents a user's encrypted bet on a prediction event
    /// @dev All bet details are encrypted except the participation flag
    struct UserBet {
        euint64 encryptedAmount;   // Encrypted bet amount in wei (FHE protected)
        euint32 encryptedShares;   // Encrypted number of shares purchased (FHE protected)
        ebool isYesBet;            // Encrypted bet direction: true = YES, false = NO (FHE protected)
        bool hasPlacedBet;         // Public flag to prevent double betting (not encrypted)
    }

    /// @notice Mapping from event ID to prediction event details
    mapping(uint256 => PredictionEvent) public predictionEvents;
    
    /// @notice Mapping from event ID to user address to their encrypted bet
    mapping(uint256 => mapping(address => UserBet)) public userBets;
    
    /// @notice Mapping from user address to their encrypted accumulated rewards
    mapping(address => euint64) public userRewards;

    /// @notice Counter for generating unique event IDs
    uint256 public eventCounter;
    
    /// @notice Contract owner who can create events and resolve them
    address public owner;

    // Error codes for user feedback (since FHE operations don't revert on failure)
    uint32 constant NO_ERROR = 0;                // Operation successful
    uint32 constant BETTING_NOT_ACTIVE = 1;      // Betting period is not active
    uint32 constant INSUFFICIENT_PAYMENT = 2;    // Payment amount is insufficient
    uint32 constant ALREADY_BET = 3;             // User has already placed a bet
    uint32 constant EVENT_NOT_RESOLVED = 4;      // Event outcome not yet determined
    uint32 constant NO_WINNINGS = 5;             // User has no winnings to claim

    /// @notice Mapping to track the last error for each user
    mapping(address => uint32) public lastError;

    /// @notice Emitted when a new prediction event is created
    /// @param eventId Unique identifier of the created event
    /// @param description Human-readable description of the prediction
    /// @param startTime Timestamp when betting opens
    /// @param endTime Timestamp when betting closes
    /// @param priceYes Fixed price for YES bets in wei
    /// @param priceNo Fixed price for NO bets in wei
    event PredictionEventCreated(
        uint256 indexed eventId,
        string description,
        uint256 startTime,
        uint256 endTime,
        uint256 priceYes,
        uint256 priceNo
    );

    /// @notice Emitted when a user places an encrypted bet
    /// @param eventId ID of the event being bet on
    /// @param user Address of the user placing the bet
    /// @param timestamp Time when the bet was placed
    event BetPlaced(uint256 indexed eventId, address indexed user, uint256 timestamp);

    /// @notice Emitted when an event's outcome is resolved
    /// @param eventId ID of the resolved event
    /// @param outcome Final result: true = YES wins, false = NO wins
    event EventResolved(uint256 indexed eventId, bool outcome);

    /// @notice Emitted when a user successfully claims their rewards
    /// @param user Address of the user claiming rewards
    /// @param timestamp Time when rewards were claimed
    event RewardsClaimed(address indexed user, uint256 timestamp);

    /// @notice Restricts function access to the contract owner only
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    /// @notice Ensures the specified event ID exists
    /// @param eventId The event ID to validate
    modifier eventExists(uint256 eventId) {
        require(eventId < eventCounter, "Event does not exist");
        _;
    }

    /// @notice Initializes the contract with the deployer as owner
    constructor() {
        owner = msg.sender;
        eventCounter = 0;
    }

    /// @notice Creates a new prediction event (only owner)
    /// @param description Human-readable description of what's being predicted
    /// @param startTime Timestamp when betting should start
    /// @param endTime Timestamp when betting should end
    /// @param priceYes Fixed price in wei for purchasing YES shares
    /// @param priceNo Fixed price in wei for purchasing NO shares
    /// @dev Validates timing and pricing parameters before creation
    function createPredictionEvent(
        string memory description,
        uint256 startTime,
        uint256 endTime,
        uint256 priceYes,
        uint256 priceNo
    ) external onlyOwner {
        // Validate event timing
        require(startTime > block.timestamp, "Start time must be in the future");
        require(endTime > startTime, "End time must be after start time");
        require(priceYes > 0 && priceNo > 0, "Prices must be greater than 0");

        // Create and store the new prediction event
        predictionEvents[eventCounter] = PredictionEvent({
            id: eventCounter,
            description: description,
            startTime: startTime,
            endTime: endTime,
            priceYes: priceYes,
            priceNo: priceNo,
            isResolved: false,
            outcome: false,
            totalYesShares: 0,
            totalNoShares: 0,
            totalPoolEth: 0
        });

        emit PredictionEventCreated(eventCounter, description, startTime, endTime, priceYes, priceNo);

        // Increment counter for next event
        eventCounter++;
    }

    /// @notice Allows users to place an encrypted bet on a prediction event
    /// @param eventId ID of the event to bet on
    /// @param encryptedShares Encrypted number of shares to purchase
    /// @param encryptedIsYesBet Encrypted bet direction (true = YES, false = NO)
    /// @param inputProof Cryptographic proof for the encrypted inputs
    /// @dev All bet details remain confidential through FHE encryption
    function placeBet(
        uint256 eventId,
        externalEuint32 encryptedShares,
        externalEbool encryptedIsYesBet,
        bytes calldata inputProof
    ) external payable eventExists(eventId) {
        PredictionEvent storage event_ = predictionEvents[eventId];

        // Verify that betting is currently active for this event
        bool bettingActive = block.timestamp >= event_.startTime &&
            block.timestamp <= event_.endTime &&
            !event_.isResolved;

        // Set error and exit if betting is not active
        if (!bettingActive) {
            lastError[msg.sender] = BETTING_NOT_ACTIVE;
            return;
        }

        // Prevent double betting by the same user on the same event
        if (userBets[eventId][msg.sender].hasPlacedBet) {
            lastError[msg.sender] = ALREADY_BET;
            return;
        }

        // Validate and convert external encrypted inputs to internal FHE types
        euint32 shares = FHE.fromExternal(encryptedShares, inputProof);
        ebool isYesBet = FHE.fromExternal(encryptedIsYesBet, inputProof);

        // Basic payment validation (simplified for demo)
        // In production, more sophisticated FHE operations would validate payment amounts
        require(msg.value > 0, "Payment required");

        // Store the user's encrypted bet data
        userBets[eventId][msg.sender] = UserBet({
            encryptedAmount: FHE.asEuint64(uint64(msg.value)),  // Encrypt the payment amount
            encryptedShares: shares,                            // Store encrypted shares
            isYesBet: isYesBet,                                // Store encrypted bet direction
            hasPlacedBet: true                                 // Mark as participated (not encrypted)
        });

        // Add payment to the event's total pool
        event_.totalPoolEth += msg.value;

        // Grant ACL (Access Control List) permissions for encrypted data
        // Contract needs access for computations, user needs access for decryption
        FHE.allowThis(userBets[eventId][msg.sender].encryptedAmount);
        FHE.allow(userBets[eventId][msg.sender].encryptedAmount, msg.sender);
        FHE.allowThis(userBets[eventId][msg.sender].encryptedShares);
        FHE.allow(userBets[eventId][msg.sender].encryptedShares, msg.sender);
        FHE.allowThis(userBets[eventId][msg.sender].isYesBet);
        FHE.allow(userBets[eventId][msg.sender].isYesBet, msg.sender);

        // Mark operation as successful
        lastError[msg.sender] = NO_ERROR;

        emit BetPlaced(eventId, msg.sender, block.timestamp);
    }

    /// @notice Resolves a prediction event with the final outcome (only owner)
    /// @param eventId ID of the event to resolve
    /// @param outcome Final result: true = YES wins, false = NO wins
    /// @dev Can only be called after the event ends and before it's already resolved
    function resolveEvent(uint256 eventId, bool outcome) external onlyOwner eventExists(eventId) {
        PredictionEvent storage event_ = predictionEvents[eventId];
        
        // Ensure event has ended and hasn't been resolved yet
        require(block.timestamp > event_.endTime, "Event has not ended yet");
        require(!event_.isResolved, "Event already resolved");

        // Set the final outcome and mark as resolved
        event_.outcome = outcome;
        event_.isResolved = true;

        emit EventResolved(eventId, outcome);
    }

    /// @notice Allows users to claim their rewards after an event is resolved
    /// @param eventId ID of the resolved event to claim rewards from
    /// @dev Simplified reward calculation for demo purposes
    function claimRewards(uint256 eventId) external eventExists(eventId) {
        PredictionEvent storage event_ = predictionEvents[eventId];
        require(event_.isResolved, "Event not resolved yet");

        UserBet storage userBet = userBets[eventId][msg.sender];
        require(userBet.hasPlacedBet, "No bet placed");

        // Calculate winnings (simplified for demo)
        // In production, this would use FHE operations to determine if user won
        // and calculate proportional rewards based on encrypted bet amounts
        uint256 winnings = 0;

        // Simplified payout logic for demonstration
        if (event_.totalPoolEth > 0) {
            // In production: decrypt user's bet direction and compare with outcome
            // For now, give each participant a fixed share
            winnings = event_.totalPoolEth / 2; // Simple 50% payout per participant
        }

        // Update error status based on whether user has winnings
        lastError[msg.sender] = winnings > 0 ? NO_ERROR : NO_WINNINGS;

        // Add winnings to user's encrypted reward balance
        userRewards[msg.sender] = FHE.add(userRewards[msg.sender], FHE.asEuint64(uint64(winnings)));

        // Prevent double claiming by marking bet as claimed
        userBet.hasPlacedBet = false;

        // Grant ACL permissions for the updated reward balance
        FHE.allowThis(userRewards[msg.sender]);
        FHE.allow(userRewards[msg.sender], msg.sender);

        // Transfer actual ETH winnings if any
        if (winnings > 0) {
            payable(msg.sender).transfer(winnings);
            emit RewardsClaimed(msg.sender, block.timestamp);
        }
    }

    /// @notice Placeholder for reward withdrawal functionality
    /// @dev In production, this would use FHE decryption to allow users to withdraw accumulated rewards
    function withdrawRewards() external {
        // For demo purposes, this function is simplified
        // In production, would use FHE decryption requests to determine withdrawal amounts
        revert("Use claimRewards instead - withdrawRewards not implemented in demo");
    }

    // ========== VIEW FUNCTIONS ==========
    /// @notice Retrieves all public information about a prediction event
    /// @param eventId ID of the event to query
    /// @return id Event identifier
    /// @return description Human-readable event description
    /// @return startTime Betting start timestamp
    /// @return endTime Betting end timestamp
    /// @return priceYes Fixed price for YES bets in wei
    /// @return priceNo Fixed price for NO bets in wei
    /// @return isResolved Whether the event has been resolved
    /// @return outcome Final result if resolved (true = YES wins)
    /// @return totalYesShares Total YES shares sold
    /// @return totalNoShares Total NO shares sold
    /// @return totalPoolEth Total ETH in the betting pool
    function getPredictionEvent(
        uint256 eventId
    )
        external
        view
        eventExists(eventId)
        returns (
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
        )
    {
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

    /// @notice Retrieves a user's encrypted bet information for a specific event
    /// @param eventId ID of the event to query
    /// @param user Address of the user whose bet to retrieve
    /// @return encryptedAmount User's encrypted bet amount in wei
    /// @return encryptedShares User's encrypted number of shares
    /// @return isYesBet User's encrypted bet direction (true = YES, false = NO)
    /// @return hasPlacedBet Public flag indicating if user participated
    /// @dev Only the user who placed the bet can decrypt the encrypted values
    function getUserBet(
        uint256 eventId,
        address user
    ) external view returns (euint64 encryptedAmount, euint32 encryptedShares, ebool isYesBet, bool hasPlacedBet) {
        UserBet storage bet = userBets[eventId][user];
        return (bet.encryptedAmount, bet.encryptedShares, bet.isYesBet, bet.hasPlacedBet);
    }

    /// @notice Retrieves a user's encrypted accumulated rewards
    /// @param user Address of the user to query
    /// @return Encrypted total rewards available to the user
    /// @dev User needs proper ACL permissions to decrypt this value
    function getUserRewards(address user) external view returns (euint64) {
        return userRewards[user];
    }

    /// @notice Retrieves the last error code for a specific user
    /// @param user Address of the user to query
    /// @return Error code from the last operation (0 = success)
    /// @dev Used for debugging since FHE operations don't automatically revert
    function getLastError(address user) external view returns (uint32) {
        return lastError[user];
    }

    /// @notice Returns the total number of prediction events created
    /// @return Total count of events (used for iteration and validation)
    function getEventCount() external view returns (uint256) {
        return eventCounter;
    }

    // ========== EMERGENCY & ADMIN FUNCTIONS ==========
    /// @notice Emergency function to withdraw all contract funds (only owner)
    /// @dev Should only be used in exceptional circumstances
    function emergencyWithdraw() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }

    /// @notice Transfers contract ownership to a new address (only current owner)
    /// @param newOwner Address of the new owner
    /// @dev Validates that new owner is not the zero address
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        owner = newOwner;
    }
}
