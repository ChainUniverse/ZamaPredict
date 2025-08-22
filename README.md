# ZamaPredict - Private Prediction Market

ZamaPredict is a decentralized prediction market platform built with Zama's Fully Homomorphic Encryption (FHE) technology. It allows users to place encrypted bets on future events while keeping their bet amounts and directions completely private until the event is resolved.

## 🔒 Privacy Features

- **Encrypted Betting**: Bet amounts and directions are encrypted using Zama FHE
- **Private Until Resolution**: Individual bets remain hidden until event outcomes are determined
- **Public Verification**: Final results and payouts are transparent and verifiable
- **No Front-running**: Encrypted bets prevent market manipulation

## 🏗️ Architecture

### Smart Contracts
- **PredictionMarket.sol**: Core contract managing events, bets, and payouts
- **FHE Integration**: Uses Zama's FHEVM for encrypted computations
- **Error Handling**: Encrypted error codes for privacy-preserving feedback

### Frontend
- **React + TypeScript**: Modern web interface in `/app` directory
- **Zama Relayer SDK**: Handles FHE encryption/decryption
- **RainbowKit + Wagmi**: Wallet connection and blockchain interactions
- **Tailwind CSS**: Responsive UI with glassmorphism design

## 🚀 Quick Start

### Prerequisites
- Node.js >= 20
- npm >= 7
- MetaMask or compatible wallet

### 1. Install Dependencies
```bash
npm install
```

### 2. Compile Contracts
```bash
npm run compile
```

### 3. Run Tests
```bash
# Local tests
npm test

# Sepolia testnet tests
npm run test:sepolia
```

### 4. Deploy Contracts

#### Local Deployment
```bash
# Start local Hardhat node
npx hardhat node

# Deploy to local network
npx hardhat deploy --network localhost
```

#### Sepolia Testnet Deployment
```bash
# Set up environment variables
npx hardhat vars set MNEMONIC
npx hardhat vars set INFURA_API_KEY

# Deploy to Sepolia
npx hardhat deploy --network sepolia
```

### 5. Start Frontend Application
```bash
cd app
npm install
npm run dev
```

The application will be available at `http://localhost:3000`

## 📖 Usage Guide

### For Event Creators (Contract Owner)

1. **Connect Wallet**: Use the owner wallet to connect
2. **Create Event**: Navigate to "Create Event" tab
3. **Set Parameters**:
   - Event description and time window
   - Betting prices for YES/NO options
4. **Deploy Event**: Submit transaction to create the event

### For Bettors

1. **Connect Wallet**: Any wallet can participate in betting
2. **Browse Events**: View available prediction events
3. **Place Encrypted Bets**:
   - Choose number of shares
   - Select YES or NO direction
   - Both amount and direction are encrypted
4. **Monitor Events**: Track event progress and outcomes
5. **Claim Rewards**: Automatically calculated based on final results

### For Event Resolution

1. **Owner Resolves**: After event end time, owner sets the outcome
2. **Winners Claim**: Winning bettors can claim their share of the pool
3. **Transparent Payouts**: Final distributions are publicly verifiable

## 🛠️ Development

### Project Structure
```
├── contracts/           # Smart contracts
│   ├── PredictionMarket.sol
│   └── FHECounter.sol  # Example contract
├── deploy/             # Deployment scripts
├── tasks/              # Hardhat tasks for contract interaction
├── test/               # Contract tests
├── app/                # Frontend React application
│   ├── src/
│   │   ├── components/ # React components
│   │   ├── utils/      # FHE and helper utilities
│   │   ├── types/      # TypeScript type definitions
│   │   └── constants/  # Configuration constants
└── docs/               # Documentation
```

### Smart Contract Tasks

The project includes several Hardhat tasks for easy contract interaction:

```bash
# Create a prediction event
npx hardhat prediction:create-event \
  --contract <CONTRACT_ADDRESS> \
  --description "Will ETH reach $5000?" \
  --starttime 1704067200 \
  --endtime 1704153600 \
  --priceyes 100000000000000000 \
  --priceno 100000000000000000

# Place an encrypted bet
npx hardhat prediction:place-bet \
  --contract <CONTRACT_ADDRESS> \
  --eventid 0 \
  --shares 5 \
  --direction yes \
  --payment 500000000000000000

# Resolve an event
npx hardhat prediction:resolve-event \
  --contract <CONTRACT_ADDRESS> \
  --eventid 0 \
  --outcome yes

# View event details
npx hardhat prediction:get-event \
  --contract <CONTRACT_ADDRESS> \
  --eventid 0

# List all events
npx hardhat prediction:list-events \
  --contract <CONTRACT_ADDRESS>
```

## 📜 Available Scripts

| Script             | Description              |
| ------------------ | ------------------------ |
| `npm run compile`  | Compile all contracts    |
| `npm run test`     | Run all tests            |
| `npm run coverage` | Generate coverage report |
| `npm run lint`     | Run linting checks       |
| `npm run clean`    | Clean build artifacts    |

## 📚 Documentation

- [FHEVM Documentation](https://docs.zama.ai/fhevm)
- [FHEVM Hardhat Setup Guide](https://docs.zama.ai/protocol/solidity-guides/getting-started/setup)
- [FHEVM Testing Guide](https://docs.zama.ai/protocol/solidity-guides/development-guide/hardhat/write_test)
- [FHEVM Hardhat Plugin](https://docs.zama.ai/protocol/solidity-guides/development-guide/hardhat)

## 📄 License

This project is licensed under the BSD-3-Clause-Clear License. See the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/zama-ai/fhevm/issues)
- **Documentation**: [FHEVM Docs](https://docs.zama.ai)
- **Community**: [Zama Discord](https://discord.gg/zama)

---

**Built with ❤️ by the Zama team**
