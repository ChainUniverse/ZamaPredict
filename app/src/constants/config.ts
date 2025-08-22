import { NetworkConfig } from '@/types';

// Zama FHE Configuration for Sepolia testnet
export const SEPOLIA_CONFIG = {
  aclContractAddress: "0x687820221192C5B662b25367F70076A37bc79b6c",
  kmsContractAddress: "0x1364cBBf2cDF5032C47d8226a6f6FBD2AFCDacAC",
  inputVerifierContractAddress: "0xbc91f3daD1A5F19F8390c400196e58073B6a0BC4",
  verifyingContractAddressDecryption: "0xb6E160B1ff80D67Bfe90A85eE06Ce0A2613607D1",
  verifyingContractAddressInputVerification: "0x7048C39f048125eDa9d678AEbaDfB22F7900a29F",
  chainId: 11155111,
  gatewayChainId: 55815,
  network: "https://sepolia.infura.io/v3/YOUR_INFURA_KEY", // Replace with actual key
  relayerUrl: "https://relayer.testnet.zama.cloud",
};

export const NETWORKS: Record<string, NetworkConfig> = {
  sepolia: {
    chainId: 11155111,
    name: 'Sepolia Testnet',
    rpcUrl: 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY', // Replace with actual key
    blockExplorer: 'https://sepolia.etherscan.io',
    contractAddress: '', // Will be filled after deployment
  },
  localhost: {
    chainId: 31337,
    name: 'Local Hardhat',
    rpcUrl: 'http://localhost:8545',
    blockExplorer: '',
    contractAddress: '', // Will be filled after deployment
  }
};

// Error messages mapping
export const ERROR_MESSAGES = {
  0: 'No error',
  1: 'Betting is not active for this event',
  2: 'Insufficient payment for the bet',
  3: 'You have already placed a bet on this event',
  4: 'Event has not been resolved yet',
  5: 'No winnings available to claim'
};

// Contract ABI (will be replaced with actual ABI after compilation)
export const PREDICTION_MARKET_ABI = [
  // This will be populated with the actual contract ABI
  // For now, including key function signatures
  "function createPredictionEvent(string memory description, uint256 startTime, uint256 endTime, uint256 priceYes, uint256 priceNo) external",
  "function placeBet(uint256 eventId, bytes32 encryptedShares, bytes32 encryptedIsYesBet, bytes calldata inputProof) external payable",
  "function resolveEvent(uint256 eventId, bool outcome) external",
  "function claimRewards(uint256 eventId) external",
  "function getPredictionEvent(uint256 eventId) external view returns (uint256 id, string memory description, uint256 startTime, uint256 endTime, uint256 priceYes, uint256 priceNo, bool isResolved, bool outcome, uint256 totalYesShares, uint256 totalNoShares, uint256 totalPoolEth)",
  "function getUserBet(uint256 eventId, address user) external view returns (bytes32 encryptedAmount, bytes32 encryptedShares, bytes32 isYesBet, bool hasPlacedBet)",
  "function getEventCount() external view returns (uint256)",
  "function getLastError(address user) external view returns (bytes32, uint256)"
];

// Default contract address (update after deployment)
export const DEFAULT_CONTRACT_ADDRESS = "0x042155e8Ee5688adEBe209E3a04668b7fB10153e";

// UI Constants
export const UI_CONFIG = {
  REFRESH_INTERVAL: 5000, // 5 seconds
  MAX_DESCRIPTION_LENGTH: 200,
  MIN_BET_AMOUNT: 0.001, // Minimum bet in ETH
  MAX_BET_AMOUNT: 10,    // Maximum bet in ETH
  DATE_FORMAT: 'yyyy-MM-dd HH:mm',
  CURRENCY_DECIMALS: 4,
};

// Event status calculation helpers
export const getEventStatus = (startTime: number, endTime: number, isResolved: boolean) => {
  const now = Math.floor(Date.now() / 1000);

  if (isResolved) return 'resolved';
  if (now < startTime) return 'upcoming';
  if (now >= startTime && now <= endTime) return 'active';
  return 'ended';
};

export const isEventActive = (startTime: number, endTime: number, isResolved: boolean) => {
  const now = Math.floor(Date.now() / 1000);
  return now >= startTime && now <= endTime && !isResolved;
};