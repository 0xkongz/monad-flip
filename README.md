# Monad Coin Flip (MCF) 🎲

A provably fair coin flip betting game built on Monad testnet using Pyth Entropy for true randomness.

![Monad](https://img.shields.io/badge/Monad-Testnet-purple)
![Solidity](https://img.shields.io/badge/Solidity-0.8.30-blue)
![Foundry](https://img.shields.io/badge/Foundry-Latest-orange)

## 🎮 Overview

Monad Coin Flip is a decentralized betting game where users can bet MON (Monad's native token) on a coin flip. The game uses Pyth Entropy's commit-reveal scheme to ensure provably fair and unpredictable outcomes.

## ✨ Features

- **🔒 Provably Fair**: Uses Pyth Entropy for true randomness - results cannot be predicted or manipulated
- **💰 Fair Payouts**: Win 1.9x your bet (5% house fee)
- **⚡ Fast**: Built on Monad for high-performance transactions
- **🛡️ Secure**: Two-step commit-reveal process prevents frontrunning
- **⏰ Timeout Protection**: Players can cancel and get refunds if reveal times out (1 hour)
- **📊 Full History**: Complete game history tracking for all players

## 🚀 Deployed Contract

- **Network**: Monad Testnet
- **Contract Address**: `0x7E917915Cefc7f98d6d3cA07f21c4B950803D1dD`
- **Explorer**: [View on Monad Explorer](https://testnet.monad.xyz/address/0x7E917915Cefc7f98d6d3cA07f21c4B950803D1dD)

## 📋 Contract Details

### Configuration
- **Min Bet**: 0.01 MON
- **Max Bet**: 1 MON
- **House Fee**: 5% on all bets
- **Payout**: 1.9x for winners
- **Entropy Provider**: Pyth Network

### Key Functions

#### For Players

```solidity
// Place a bet (0 = Heads, 1 = Tails)
function placeBet(uint8 _choice, bytes32 _userRandomness) external payable returns (uint256 gameId)

// Reveal the result (anyone can call after Pyth provides randomness)
function revealResult(uint256 _gameId, bytes32 _providerRevelation) external

// Cancel game and get refund if reveal times out (after 1 hour)
function cancelGame(uint256 _gameId) external

// View game history
function getPlayerGames(address _player) external view returns (uint256[] memory)
function getGame(uint256 _gameId) external view returns (Game memory)
```

#### For Owner

```solidity
// Withdraw accumulated fees
function withdrawHouseFees(uint256 _amount) external onlyOwner

// Update betting limits
function setMinBet(uint256 _minBet) external onlyOwner
function setMaxBet(uint256 _maxBet) external onlyOwner

// Emergency functions
function emergencyWithdraw() external onlyOwner
function transferOwnership(address _newOwner) external onlyOwner
```

## 🎯 How It Works

1. **Player Places Bet**
   - Player chooses heads (0) or tails (1)
   - Sends MON with their bet + entropy fee
   - Provides random bytes32 for commitment
   - Contract requests randomness from Pyth Entropy

2. **Randomness Generation**
   - Pyth Entropy combines player's randomness with oracle's randomness
   - Uses commit-reveal scheme for security
   - Result is cryptographically verifiable

3. **Result Reveal**
   - Anyone can reveal the result using Pyth's revelation
   - Contract determines win/loss
   - Winner receives 1.9x payout automatically
   - 5% fee collected for house

4. **Safety Net**
   - If reveal doesn't happen within 1 hour
   - Player can cancel and get full refund

## 🛠️ Development

### Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation)
- Node.js (for frontend)
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/monad-flip.git
cd monad-flip

# Install dependencies
forge install
npm install
```

### Configuration

Create a `.env` file:

```env
# Private key for deployment (with 0x prefix)
PRIVATE_KEY=0xyour_private_key_here

# Monad RPC URL
RPC_URL=https://testnet-rpc.monad.xyz

# Pyth Entropy contract address on Monad
ENTROPY_ADDRESS=0x36825bf3fbdf5a29e2d5148bfe7dcf7b5639e320
```

### Testing

```bash
# Run all tests
forge test

# Run with verbosity
forge test -vv

# Run specific test
forge test --match-test testPlaceBet
```

### Deployment

```bash
# Deploy to Monad testnet
forge script script/DeployCoinFlip.s.sol --rpc-url $RPC_URL --broadcast --legacy

# Verify contract (when service is available)
forge verify-contract <CONTRACT_ADDRESS> src/CoinFlip.sol:CoinFlip --chain 10143 --verifier sourcify --verifier-url https://sourcify-api-monad.blockvision.org
```

## 🏗️ Project Structure

```
monad-flip/
├── src/
│   ├── CoinFlip.sol          # Main contract
│   └── IEntropy.sol          # Pyth Entropy interface
├── script/
│   └── DeployCoinFlip.s.sol  # Deployment script
├── test/
│   └── CoinFlip.t.sol        # Test suite
├── frontend/                  # Web interface (coming soon)
├── foundry.toml              # Foundry configuration
└── README.md
```

## 🎨 Frontend

The frontend is a modern, fully-featured web application with:

### Tech Stack
- **Next.js 15** - React framework with Turbopack
- **Tailwind CSS 4** - Modern utility-first styling
- **wagmi v2** - Ethereum wallet connections
- **@tanstack/react-query** - Data fetching
- **viem** - Ethereum interactions
- **TypeScript** - Type safety

### Features
- 🌓 **Dark Mode** - Toggle between light and dark themes
- 🔌 **Multi-Wallet Support** - MetaMask & Phantom wallet integration
- 🔄 **Auto Network Detection** - Prompts to switch to Monad Testnet
- 📊 **Live Statistics** - Real-time contract balance and stats
- 📜 **Game History** - Complete betting history per wallet
- ❓ **FAQ Modal** - Comprehensive help without leaving the page
- 📱 **Responsive** - Works on desktop, tablet, and mobile

### Running the Frontend

```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:3000` to see the app.

## 🔐 Security Features

- **Pyth Entropy**: Industry-standard oracle for randomness
- **Commit-Reveal**: Prevents prediction and frontrunning
- **Timeout Protection**: Players can recover funds if issues occur
- **House Balance Checks**: Ensures contract can pay winners
- **Access Controls**: Owner-only functions for management

## 📊 Game Economics

| Event | Player Impact | House Impact |
|-------|---------------|--------------|
| Player Wins | +90% of bet | +5% fee, -100% of bet |
| Player Loses | -100% of bet | +95% of bet, +5% fee |

Example: 1 MON bet
- **Win**: Receive 1.9 MON (1 MON original + 0.9 MON winnings)
- **Lose**: Lose 1 MON
- **House Fee**: 0.05 MON either way

## 🧪 Testing Coverage

- ✅ Deployment and initialization
- ✅ Bet placement with validation
- ✅ Result revealing
- ✅ Multiple players and games
- ✅ Game cancellation and refunds
- ✅ House fee management
- ✅ Owner functions
- ✅ Edge cases and errors

## 📝 License

MIT License - see LICENSE file for details

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 🐛 Known Issues

- Sourcify verification service currently unavailable on Monad testnet
- Entropy fee is deducted from bet amount

## 🔗 Links

- [Monad Website](https://monad.xyz)
- [Monad Testnet Explorer](https://testnet.monad.xyz)
- [Pyth Entropy Docs](https://docs.pyth.network/entropy)
- [Foundry Book](https://book.getfoundry.sh/)

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

**⚠️ Disclaimer**: This is experimental software deployed on testnet. Use at your own risk. Never bet more than you can afford to lose.
