# Complete Tutorial: Building a Provably Fair Coin Flip Game on Monad

This is a complete step-by-step guide to building a decentralized coin flip game with provably fair randomness using Pyth Entropy on the Monad blockchain.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Understanding the Technology Stack](#understanding-the-technology-stack)
3. [Part 1: Smart Contract Development](#part-1-smart-contract-development)
4. [Part 2: Frontend Development](#part-2-frontend-development)
5. [Part 3: Deployment](#part-3-deployment)
6. [Part 4: Testing and Verification](#part-4-testing-and-verification)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### What You Need to Know (Beginner Level)
- **Basic Programming**: Understanding of variables, functions, and loops
- **Command Line**: How to open a terminal and run commands
- **Git**: Basic understanding of version control (cloning, committing)

### What You'll Learn
- Smart contract development with Solidity
- Blockchain deployment with Foundry
- Frontend development with Next.js and React
- Web3 wallet integration with Wagmi
- Working with oracles (Pyth Entropy)

### Tools You Need to Install

1. **Node.js** (v18 or higher)
   - Download from: https://nodejs.org/
   - Verify installation: `node --version`

2. **Foundry** (Solidity development framework)
   ```bash
   # Install Foundry
   curl -L https://foundry.paradigm.xyz | bash
   foundryup

   # Verify installation
   forge --version
   ```

3. **Git**
   - Download from: https://git-scm.com/
   - Verify installation: `git --version`

4. **A Code Editor**
   - Recommended: Visual Studio Code (https://code.visualstudio.com/)

5. **MetaMask Wallet**
   - Browser extension: https://metamask.io/
   - Mobile app available for iOS/Android

---

## Understanding the Technology Stack

### Blockchain Layer
- **Monad**: A high-performance EVM-compatible blockchain (10,000 TPS)
- **Solidity**: Programming language for smart contracts
- **Foundry**: Fast, portable toolkit for Ethereum application development

### Randomness Layer
- **Pyth Entropy**: Decentralized oracle providing verifiable randomness
- **Entropy V2**: Latest version with instant randomness reveal

### Frontend Layer
- **Next.js 15**: React framework for production
- **Tailwind CSS v4**: Utility-first CSS framework
- **Wagmi**: React hooks for Ethereum
- **Viem**: TypeScript interface for Ethereum

### Deployment
- **Vercel**: Platform for deploying Next.js applications
- **GitHub**: Version control and collaboration

---

## Part 1: Smart Contract Development

### Step 1.1: Understanding the Game Logic

**What is a Coin Flip Game?**
A coin flip is a simple gambling game where:
1. Player chooses Heads or Tails
2. Player bets an amount (e.g., 0.1 MON)
3. A random coin flip determines the result
4. If player wins, they get 1.9x their bet (minus 5% house fee)
5. If player loses, they lose their bet

**Why Do We Need a Smart Contract?**
Smart contracts are programs that run on the blockchain. They:
- Execute automatically without human intervention
- Cannot be modified once deployed (immutable)
- Are transparent - anyone can verify the code
- Handle money securely without intermediaries

### Step 1.2: Create the Project Structure

```bash
# Create a new directory for your project
mkdir monad-flip
cd monad-flip

# Initialize Foundry project
forge init

# Your directory structure should look like:
# monad-flip/
# ├── src/           # Smart contract source code
# ├── test/          # Test files
# ├── script/        # Deployment scripts
# ├── lib/           # Dependencies
# └── foundry.toml   # Foundry configuration
```

### Step 1.3: Understanding Pyth Entropy

**What is an Oracle?**
Blockchains can't generate truly random numbers on their own. An oracle is an external service that provides data to smart contracts.

**Pyth Entropy** is a specialized oracle that provides:
- **Verifiable Randomness**: Can prove the random number wasn't manipulated
- **Fast Results**: Instant reveal with Entropy V2
- **Fair Distribution**: No one can predict the outcome

**How Pyth Entropy Works:**

```
1. Smart Contract Requests Randomness
   ↓
2. Pyth Entropy Generates Random Number
   ↓
3. Result is Instantly Revealed
   ↓
4. Smart Contract Uses Random Number for Game
```

### Step 1.4: Write the Smart Contract

Create a file `src/CoinFlipV2.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

// Import Pyth Entropy interface
interface IEntropyV2 {
    function requestV2() external payable returns (uint64);
    function getFeeV2() external view returns (uint256);
    function revealV2(uint64 sequenceNumber) external view returns (bytes32);
}

contract CoinFlipV2 {
    // ===== EXPLANATION OF KEY CONCEPTS =====

    // 'immutable' = Set once during deployment, can't change
    IEntropyV2 private immutable entropy;

    // 'public' = Anyone can read this value
    address public owner;
    uint256 public minBet;
    uint256 public maxBet;
    uint256 public houseFees;

    // Counter for unique game IDs
    uint256 public gameIdCounter;

    // House fee percentage (5%)
    uint256 public constant HOUSE_FEE_PERCENT = 5;

    // ===== GAME STATES =====
    // Enum = A custom type with specific values
    enum GameState {
        Pending,    // 0 - Waiting for result
        Revealed,   // 1 - Result revealed
        Cancelled   // 2 - Game cancelled
    }

    // ===== GAME STRUCTURE =====
    // Struct = A custom data type grouping related data
    struct Game {
        address player;         // Who placed the bet
        uint256 betAmount;      // How much they bet
        uint8 playerChoice;     // 0 = Heads, 1 = Tails
        uint8 result;          // The coin flip result
        bool won;              // Did they win?
        uint256 payout;        // How much they won
        uint256 timestamp;     // When the game was played
        GameState state;       // Current game state
    }

    // ===== STORAGE =====
    // 'mapping' = Like a dictionary/hash map
    mapping(uint256 => Game) public games;                    // gameId => Game
    mapping(address => uint256[]) public playerGames;         // player => gameIds
    mapping(uint64 => uint256) public sequenceToGameId;       // entropy sequence => gameId

    // ===== EVENTS =====
    // Events = Logs that frontends can listen to
    event BetPlaced(
        address indexed player,
        uint256 indexed gameId,
        uint256 amount,
        uint8 choice,
        uint64 sequenceNumber
    );

    event GameResult(
        address indexed player,
        uint256 indexed gameId,
        uint8 choice,
        uint8 result,
        bool won,
        uint256 payout
    );

    // ===== ERRORS =====
    // Custom errors save gas compared to require strings
    error OnlyOwner();
    error InvalidChoice();
    error BetTooLow();
    error BetTooHigh();
    error BetTooLowForEntropyFee();
    error InsufficientHouseBalance();

    // ===== MODIFIERS =====
    // Modifiers = Reusable code that can be added to functions
    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;  // This is where the function code runs
    }

    // ===== CONSTRUCTOR =====
    // Constructor runs ONCE when contract is deployed
    constructor(
        address _entropyAddress,
        address _entropyProvider,
        uint256 _minBet,
        uint256 _maxBet
    ) payable {
        // msg.sender = The address deploying the contract
        entropy = IEntropyV2(_entropyAddress);
        owner = msg.sender;
        minBet = _minBet;
        maxBet = _maxBet;
        gameIdCounter = 0;
    }

    // ===== MAIN GAME FUNCTION =====
    /**
     * Place a bet on the coin flip
     * @param _choice 0 for Heads, 1 for Tails
     */
    function placeBet(uint8 _choice) external payable returns (uint256 gameId) {
        // VALIDATION: Check if choice is valid
        if (_choice != 0 && _choice != 1) revert InvalidChoice();

        // GET ENTROPY FEE: Pyth charges a small fee for randomness
        uint256 entropyFee = entropy.getFeeV2();
        uint256 betAmount = msg.value - entropyFee;

        // VALIDATION: Check bet amount
        if (betAmount < minBet) revert BetTooLow();
        if (betAmount > maxBet) revert BetTooHigh();

        // CALCULATE WINNINGS: 1.9x payout (90% of bet is profit)
        uint256 netWinnings = (betAmount * 90) / 100;
        if (netWinnings <= entropyFee) revert BetTooLowForEntropyFee();

        uint256 potentialPayout = (betAmount * 190) / 100;

        // CHECK CONTRACT BALANCE: Can we pay if player wins?
        if (address(this).balance < betAmount + potentialPayout) {
            revert InsufficientHouseBalance();
        }

        // CREATE NEW GAME
        gameId = gameIdCounter++;

        // REQUEST RANDOMNESS from Pyth Entropy
        // This costs 'entropyFee' which we send as value
        uint64 sequenceNumber = entropy.requestV2{value: entropyFee}();

        // STORE GAME DATA
        games[gameId] = Game({
            player: msg.sender,
            betAmount: betAmount,
            playerChoice: _choice,
            result: 0,
            won: false,
            payout: 0,
            timestamp: block.timestamp,
            state: GameState.Pending
        });

        // TRACK GAME IDs
        playerGames[msg.sender].push(gameId);
        sequenceToGameId[sequenceNumber] = gameId;

        // EMIT EVENT: Frontend can listen for this
        emit BetPlaced(msg.sender, gameId, betAmount, _choice, sequenceNumber);

        // INSTANT REVEAL: Get random number immediately
        bytes32 randomBytes = entropy.revealV2(sequenceNumber);
        uint256 randomNumber = uint256(randomBytes);

        // DETERMINE RESULT: Use random number to flip coin
        // 0 = Heads, 1 = Tails
        uint8 result = uint8(randomNumber % 2);

        // CHECK WIN/LOSS
        bool won = (result == _choice);

        // UPDATE GAME STATE
        games[gameId].result = result;
        games[gameId].won = won;
        games[gameId].state = GameState.Revealed;

        // HANDLE PAYOUT
        if (won) {
            // Player wins! Pay them 1.9x
            games[gameId].payout = potentialPayout;
            (bool success, ) = msg.sender.call{value: potentialPayout}("");
            require(success, "Payout failed");
        } else {
            // Player loses, collect 5% house fee
            uint256 houseFee = (betAmount * HOUSE_FEE_PERCENT) / 100;
            houseFees += houseFee;
        }

        // EMIT RESULT EVENT
        emit GameResult(msg.sender, gameId, _choice, result, won, games[gameId].payout);
    }

    // ===== VIEW FUNCTIONS =====
    // 'view' = Reads data but doesn't modify state (free to call)

    function getEntropyFee() external view returns (uint256) {
        return entropy.getFeeV2();
    }

    function getGame(uint256 _gameId) external view returns (Game memory) {
        return games[_gameId];
    }

    function getPlayerGames(address _player) external view returns (uint256[] memory) {
        return playerGames[_player];
    }

    // ===== ADMIN FUNCTIONS =====

    /**
     * Owner can deposit funds to pay winners
     */
    function depositHouseFunds() external payable onlyOwner {
        // msg.value = Amount of ETH/MON sent with transaction
    }

    /**
     * Owner can withdraw collected fees
     */
    function withdrawHouseFees() external onlyOwner {
        uint256 amount = houseFees;
        houseFees = 0;
        (bool success, ) = owner.call{value: amount}("");
        require(success, "Withdrawal failed");
    }

    /**
     * Contract can receive ETH/MON directly
     */
    receive() external payable {}
}
```

**Key Concepts Explained:**

1. **Variables:**
   - `uint256`: Unsigned integer (positive numbers only)
   - `address`: Ethereum/Monad wallet address
   - `bool`: True or false
   - `uint8`: Small number (0-255)

2. **Visibility:**
   - `public`: Anyone can read/call
   - `private`: Only this contract can access
   - `external`: Only external calls (saves gas)
   - `internal`: This contract + inherited contracts

3. **Function Modifiers:**
   - `view`: Reads state, doesn't modify
   - `pure`: Doesn't read or modify state
   - `payable`: Can receive ETH/MON

4. **Special Variables:**
   - `msg.sender`: Who called this function
   - `msg.value`: How much ETH/MON was sent
   - `block.timestamp`: Current block time

### Step 1.5: Write Deployment Script

Create `script/DeployCoinFlipV2.s.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Script.sol";
import "../src/CoinFlipV2.sol";

contract DeployCoinFlipV2 is Script {
    function run() external {
        // Get private key from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        // Monad Testnet Pyth Entropy V2 addresses
        address entropyAddress = 0x4374e5a8b9C22271E9EB878A2AA31DE97DF15DAF;
        address entropyProvider = 0x52DeaA1c84233F7bb8C8A45baeDE41091c616506;

        // Game parameters
        uint256 minBet = 0.01 ether;  // 0.01 MON
        uint256 maxBet = 1 ether;     // 1 MON

        // Start broadcasting transactions
        vm.startBroadcast(deployerPrivateKey);

        // Deploy contract with 10 MON for house balance
        CoinFlipV2 coinFlip = new CoinFlipV2{value: 10 ether}(
            entropyAddress,
            entropyProvider,
            minBet,
            maxBet
        );

        console.log("CoinFlipV2 deployed to:", address(coinFlip));

        vm.stopBroadcast();
    }
}
```

### Step 1.6: Deploy to Monad Testnet

**Step 1: Get Monad Testnet MON**

1. Add Monad Testnet to MetaMask:
   - Network Name: `Monad Testnet`
   - RPC URL: `https://testnet-rpc.monad.xyz`
   - Chain ID: `10143`
   - Currency Symbol: `MON`
   - Block Explorer: `https://testnet.monad.xyz`

2. Get testnet MON from faucet:
   - Visit: https://faucet.monad.xyz
   - Connect your wallet
   - Request MON tokens

**Step 2: Set Up Environment**

Create a `.env` file in your project root:

```bash
# Your wallet private key (NEVER share this!)
PRIVATE_KEY=your_private_key_here

# Monad Testnet RPC
RPC_URL=https://testnet-rpc.monad.xyz
```

**Step 3: Deploy Contract**

```bash
# Load environment variables
source .env

# Deploy to Monad Testnet
forge script script/DeployCoinFlipV2.s.sol:DeployCoinFlipV2 \
  --rpc-url $RPC_URL \
  --broadcast \
  --legacy

# Save the deployed contract address!
```

**Step 4: Verify Deployment**

Visit the Monad block explorer and search for your contract address:
- URL: https://testnet.monad.xyz/address/YOUR_CONTRACT_ADDRESS

---

## Part 2: Frontend Development

### Step 2.1: Understanding the Frontend Architecture

**What is a Frontend?**
The frontend is the user interface - what people see and interact with in their browser.

**Our Tech Stack:**
- **Next.js**: React framework for building web apps
- **Tailwind CSS**: Utility classes for styling
- **Wagmi**: React hooks for blockchain interactions
- **Viem**: TypeScript library for Ethereum

**How It Works:**

```
User's Browser
    ↓
Next.js App (React)
    ↓
Wagmi Hooks
    ↓
MetaMask Wallet
    ↓
Monad Blockchain
    ↓
Your Smart Contract
```

### Step 2.2: Create Next.js Project

```bash
# Navigate to your project directory
cd monad-flip

# Create frontend folder
npx create-next-app@latest frontend --typescript --tailwind --app --no-src-dir

# Navigate to frontend
cd frontend

# Install blockchain dependencies
npm install wagmi viem @tanstack/react-query
```

**Project Structure:**
```
frontend/
├── app/
│   ├── layout.tsx        # Root layout (wraps all pages)
│   ├── page.tsx          # Home page
│   └── globals.css       # Global styles
├── components/
│   ├── CoinFlip.tsx      # Main game component
│   ├── GameHistory.tsx   # Shows past games
│   ├── ConnectButton.tsx # Wallet connection
│   └── ThemeToggle.tsx   # Dark/light mode
├── config/
│   ├── chains.ts         # Blockchain configuration
│   ├── contract.ts       # Contract address & ABI
│   └── wagmi.ts          # Wagmi configuration
└── contexts/
    └── ThemeContext.tsx  # Theme management
```

### Step 2.3: Configure Blockchain Connection

Create `frontend/config/chains.ts`:

```typescript
import { defineChain } from 'viem';

// Define Monad Testnet
export const monadTestnet = defineChain({
  id: 10143,
  name: 'Monad Testnet',
  network: 'monad-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Monad',
    symbol: 'MON',
  },
  rpcUrls: {
    default: {
      http: ['https://testnet-rpc.monad.xyz'],
    },
    public: {
      http: ['https://testnet-rpc.monad.xyz'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Monad Explorer',
      url: 'https://testnet.monad.xyz',
    },
  },
  testnet: true,
});
```

**What This Does:**
- Tells your app how to connect to Monad Testnet
- Specifies the RPC URL (like a phone number for the blockchain)
- Defines the currency (MON tokens)

Create `frontend/config/contract.ts`:

```typescript
// Replace with your deployed contract address!
export const COIN_FLIP_ADDRESS = '0xYourContractAddressHere' as `0x${string}`;

// Contract ABI (Application Binary Interface)
// This tells the frontend what functions the contract has
export const COIN_FLIP_ABI = [
  {
    type: 'function',
    name: 'placeBet',
    inputs: [{ name: '_choice', type: 'uint8' }],
    outputs: [{ name: 'gameId', type: 'uint256' }],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'getGame',
    inputs: [{ name: '_gameId', type: 'uint256' }],
    outputs: [{
      type: 'tuple',
      components: [
        { name: 'player', type: 'address' },
        { name: 'betAmount', type: 'uint256' },
        { name: 'playerChoice', type: 'uint8' },
        { name: 'result', type: 'uint8' },
        { name: 'won', type: 'bool' },
        { name: 'payout', type: 'uint256' },
        { name: 'timestamp', type: 'uint256' },
        { name: 'state', type: 'uint8' },
      ],
    }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getPlayerGames',
    inputs: [{ name: '_player', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getEntropyFee',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'minBet',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'maxBet',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'BetPlaced',
    inputs: [
      { name: 'player', type: 'address', indexed: true },
      { name: 'gameId', type: 'uint256', indexed: true },
      { name: 'amount', type: 'uint256' },
      { name: 'choice', type: 'uint8' },
      { name: 'sequenceNumber', type: 'uint64' },
    ],
  },
  {
    type: 'event',
    name: 'GameResult',
    inputs: [
      { name: 'player', type: 'address', indexed: true },
      { name: 'gameId', type: 'uint256', indexed: true },
      { name: 'choice', type: 'uint8' },
      { name: 'result', type: 'uint8' },
      { name: 'won', type: 'bool' },
      { name: 'payout', type: 'uint256' },
    ],
  },
] as const;
```

**What is an ABI?**
Think of it like a menu at a restaurant. It lists:
- What functions are available (`placeBet`, `getGame`, etc.)
- What inputs they need (`_choice`, `_gameId`)
- What outputs they return
- Events the contract can emit

Create `frontend/config/wagmi.ts`:

```typescript
import { http, createConfig } from 'wagmi';
import { monadTestnet } from './chains';
import { injected } from 'wagmi/connectors';

// Configure Wagmi
export const config = createConfig({
  chains: [monadTestnet],
  connectors: [
    injected(), // MetaMask, Coinbase Wallet, etc.
  ],
  transports: {
    [monadTestnet.id]: http(),
  },
});
```

### Step 2.4: Create Theme System

Create `frontend/contexts/ThemeContext.tsx`:

```typescript
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Initialize theme from localStorage or default to light
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'light';
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  });

  useEffect(() => {
    // Save theme preference and update DOM
    localStorage.setItem('theme', theme);
    const htmlElement = document.documentElement;

    if (theme === 'dark') {
      htmlElement.classList.add('dark');
      htmlElement.style.colorScheme = 'dark';
    } else {
      htmlElement.classList.remove('dark');
      htmlElement.style.colorScheme = 'light';
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
```

### Step 2.5: Create Main Components

I'll create the key components with detailed comments.

Create `frontend/components/CoinFlip.tsx`:

```typescript
'use client';

import { useState, useEffect, useRef } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { COIN_FLIP_ADDRESS, COIN_FLIP_ABI } from '../config/contract';

type CoinSide = 0 | 1; // 0 = Heads, 1 = Tails

interface CoinFlipProps {
  onGameComplete?: () => void;
}

export function CoinFlip({ onGameComplete }: CoinFlipProps) {
  // Get wallet connection status
  const { address, isConnected } = useAccount();

  // Component state
  const [betAmount, setBetAmount] = useState('0.01');
  const [selectedSide, setSelectedSide] = useState<CoinSide>(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [isFlipping, setIsFlipping] = useState(false);
  const [currentGameId, setCurrentGameId] = useState<bigint | null>(null);

  // Use refs to avoid stale closures
  const isFlippingRef = useRef(false);
  const currentGameIdRef = useRef<bigint | null>(null);

  useEffect(() => {
    isFlippingRef.current = isFlipping;
  }, [isFlipping]);

  useEffect(() => {
    currentGameIdRef.current = currentGameId;
  }, [currentGameId]);

  // Read contract data
  const { data: minBet } = useReadContract({
    address: COIN_FLIP_ADDRESS,
    abi: COIN_FLIP_ABI,
    functionName: 'minBet',
  });

  const { data: maxBet } = useReadContract({
    address: COIN_FLIP_ADDRESS,
    abi: COIN_FLIP_ABI,
    functionName: 'maxBet',
  });

  const { data: entropyFee } = useReadContract({
    address: COIN_FLIP_ADDRESS,
    abi: COIN_FLIP_ABI,
    functionName: 'getEntropyFee',
  });

  // Write to contract
  const {
    writeContract,
    data: hash,
    isPending,
    error
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    data: receipt
  } = useWaitForTransactionReceipt({
    hash,
  });

  // Handle placing a bet
  const handlePlaceBet = async () => {
    if (!isConnected || !address) {
      setStatusMessage('Please connect your wallet');
      return;
    }

    const betValue = parseFloat(betAmount);
    const minBetEth = minBet ? parseFloat(formatEther(minBet)) : 0.01;
    const maxBetEth = maxBet ? parseFloat(formatEther(maxBet)) : 1;

    if (betValue < minBetEth || betValue > maxBetEth) {
      setStatusMessage(`Bet must be between ${minBetEth} and ${maxBetEth} MON`);
      return;
    }

    try {
      setIsFlipping(true);
      setStatusMessage('Placing bet...');

      const betWei = parseEther(betAmount);
      const totalValue = entropyFee ? betWei + BigInt(entropyFee) : betWei;

      writeContract({
        address: COIN_FLIP_ADDRESS,
        abi: COIN_FLIP_ABI,
        functionName: 'placeBet',
        args: [selectedSide],
        value: totalValue,
      });
    } catch (err) {
      console.error('Error placing bet:', err);
      setStatusMessage('Failed to place bet');
      setIsFlipping(false);
    }
  };

  // Poll for game result
  useEffect(() => {
    if (!currentGameId || !isFlipping) return;

    const pollInterval = setInterval(async () => {
      try {
        const { createPublicClient, http } = await import('viem');
        const { monadTestnet } = await import('../config/chains');

        const publicClient = createPublicClient({
          chain: monadTestnet,
          transport: http('https://testnet-rpc.monad.xyz'),
        });

        const game = await publicClient.readContract({
          address: COIN_FLIP_ADDRESS,
          abi: COIN_FLIP_ABI,
          functionName: 'getGame',
          args: [currentGameId],
        }) as any;

        // Check if game is completed
        if (game.state === 1) {
          clearInterval(pollInterval);

          const resultSide = game.result === 0 ? 'Heads' : 'Tails';

          if (game.won) {
            setStatusMessage(`🎉 YOU WIN! Result: ${resultSide}. Payout: ${formatEther(game.payout)} MON`);
          } else {
            setStatusMessage(`😢 YOU LOSE! Result: ${resultSide}. Better luck next time!`);
          }

          setIsFlipping(false);
          setCurrentGameId(null);
          onGameComplete?.();

          setTimeout(() => {
            setStatusMessage('');
          }, 5000);
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [currentGameId, isFlipping, onGameComplete]);

  if (!isConnected) {
    return (
      <div className="text-center p-8">
        <p>Connect your wallet to play</p>
      </div>
    );
  }

  const isProcessing = isPending || isConfirming || isFlipping;

  return (
    <div className="max-w-md mx-auto p-8 bg-white dark:bg-gray-800 rounded-3xl shadow-xl">
      <h2 className="text-3xl font-bold mb-8 text-center">Coin Flip</h2>

      {/* Coin Animation */}
      <div className="flex justify-center mb-8">
        <div className={`w-32 h-32 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-2xl flex items-center justify-center text-4xl font-bold text-white ${isFlipping ? 'animate-spin' : ''}`}>
          {selectedSide === 0 ? 'H' : 'T'}
        </div>
      </div>

      {/* Bet Amount */}
      <div className="mb-6">
        <label className="block font-medium mb-2">Bet Amount (MON)</label>
        <input
          type="number"
          value={betAmount}
          onChange={(e) => setBetAmount(e.target.value)}
          step="0.01"
          min={minBet ? formatEther(minBet) : '0.01'}
          max={maxBet ? formatEther(maxBet) : '1'}
          className="w-full px-4 py-3 rounded-xl border"
          disabled={isProcessing}
        />
      </div>

      {/* Heads/Tails Selection */}
      <div className="mb-6">
        <label className="block font-medium mb-3">Choose Side</label>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setSelectedSide(0)}
            disabled={isProcessing}
            className={`py-4 rounded-xl font-bold ${selectedSide === 0 ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            Heads
          </button>
          <button
            onClick={() => setSelectedSide(1)}
            disabled={isProcessing}
            className={`py-4 rounded-xl font-bold ${selectedSide === 1 ? 'bg-purple-500 text-white' : 'bg-gray-200'}`}
          >
            Tails
          </button>
        </div>
      </div>

      {/* Place Bet Button */}
      <button
        onClick={handlePlaceBet}
        disabled={isProcessing}
        className="w-full py-4 bg-green-500 text-white font-bold rounded-xl disabled:opacity-50"
      >
        {isProcessing ? 'Processing...' : 'Place Bet'}
      </button>

      {/* Status Message */}
      {statusMessage && (
        <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-xl">
          <p className="text-center">{statusMessage}</p>
        </div>
      )}
    </div>
  );
}
```

**Key Concepts in the Component:**

1. **React Hooks:**
   - `useState`: Manages component state
   - `useEffect`: Runs code when things change
   - `useRef`: Stores values that don't trigger re-renders

2. **Wagmi Hooks:**
   - `useAccount`: Get wallet connection info
   - `useReadContract`: Read data from contract
   - `useWriteContract`: Send transactions
   - `useWaitForTransactionReceipt`: Wait for transaction confirmation

3. **Polling:**
   - Check every 2 seconds if game result is ready
   - Stop polling when result is found
   - Clean up interval when component unmounts

### Step 2.6: Update Layout and Styling

Update `frontend/app/layout.tsx`:

```typescript
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Monad Coin Flip - Provably Fair Gaming",
  description: "Win 1.9x your bet with provably fair coin flips",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="light dark" />
        <script
          dangerouslySetInnerHTML={{
            __html: `!function(){try{var t=localStorage.getItem("theme");"dark"===t||!t&&window.matchMedia("(prefers-color-scheme: dark)").matches?document.documentElement.classList.add("dark"):document.documentElement.classList.remove("dark")}catch(t){}}();`,
          }}
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

Update `frontend/app/globals.css`:

```css
@import "tailwindcss";

:root {
  --background: #ffffff;
  --foreground: #171717;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-inter);
}

body {
  background: var(--background);
  color: var(--foreground);
}

html {
  scroll-behavior: smooth;
}
```

---

## Part 3: Deployment

### Step 3.1: Deploy to Vercel

**What is Vercel?**
Vercel is a cloud platform that makes deploying Next.js apps super easy. It:
- Builds your app automatically
- Hosts it on fast servers worldwide
- Gives you a free HTTPS URL
- Auto-deploys when you push to GitHub

**Steps:**

1. **Push to GitHub**
   ```bash
   # Initialize git (if not already done)
   git init
   git add .
   git commit -m "Initial commit"

   # Create GitHub repo and push
   git remote add origin https://github.com/yourusername/monad-flip.git
   git branch -M main
   git push -u origin main
   ```

2. **Deploy on Vercel**
   - Go to https://vercel.com
   - Sign up/login with GitHub
   - Click "New Project"
   - Import your `monad-flip` repository
   - Set Root Directory to `frontend`
   - Click "Deploy"

3. **Configure Environment**
   - In Vercel dashboard, go to Settings → Environment Variables
   - Add any needed variables
   - Redeploy if needed

**Your app is now live!** You'll get a URL like `https://monad-flip.vercel.app`

### Step 3.2: Custom Domain (Optional)

1. Buy a domain (e.g., from Namecheap, GoDaddy)
2. In Vercel: Settings → Domains
3. Add your domain
4. Update DNS records as instructed
5. Wait for DNS propagation (can take 24-48 hours)

---

## Part 4: Testing and Verification

### Step 4.1: Test Smart Contract

Create `test/CoinFlipV2.t.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Test.sol";
import "../src/CoinFlipV2.sol";

contract CoinFlipV2Test is Test {
    CoinFlipV2 public coinFlip;
    address public player = address(1);

    function setUp() public {
        // Deploy mock entropy (you'd need to create this)
        // Deploy CoinFlip contract
        coinFlip = new CoinFlipV2{value: 10 ether}(
            address(mockEntropy),
            address(0),
            0.01 ether,
            1 ether
        );
    }

    function testPlaceBet() public {
        vm.deal(player, 1 ether);
        vm.prank(player);

        uint256 gameId = coinFlip.placeBet{value: 0.1 ether}(0);

        assertEq(gameId, 0);
    }
}
```

Run tests:
```bash
forge test
```

### Step 4.2: Test Frontend Locally

```bash
cd frontend
npm run dev
```

Open http://localhost:3000

**Testing Checklist:**
- [ ] Wallet connects successfully
- [ ] Can switch to Monad Testnet
- [ ] Bet amount validates correctly
- [ ] Can select Heads/Tails
- [ ] Transaction sends and confirms
- [ ] Result shows WIN/LOSE message
- [ ] Game history updates
- [ ] Dark/light mode toggles
- [ ] Responsive on mobile

### Step 4.3: Security Checklist

**Smart Contract:**
- [ ] No private keys in code
- [ ] Access control on admin functions
- [ ] Proper input validation
- [ ] Reentrancy guards (if needed)
- [ ] Integer overflow protection (Solidity 0.8+)

**Frontend:**
- [ ] No private keys in frontend code
- [ ] No API keys exposed
- [ ] Proper error handling
- [ ] User input validation
- [ ] HTTPS enabled (automatic on Vercel)

---

## Troubleshooting

### Common Issues and Solutions

#### 1. "Insufficient House Balance" Error

**Problem:** Contract doesn't have enough MON to pay winners

**Solution:**
```bash
# Send more MON to contract
cast send $CONTRACT_ADDRESS \
  --value 10ether \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY
```

#### 2. Transaction Fails with "BetTooLowForEntropyFee"

**Problem:** Bet amount doesn't cover the Pyth Entropy fee

**Solution:** Increase minimum bet in contract or bet more

#### 3. Frontend Not Connecting to Wallet

**Problem:** MetaMask not detecting

**Solutions:**
- Make sure MetaMask is installed
- Try refreshing the page
- Check browser console for errors
- Ensure you're on correct network

#### 4. Dark Mode Not Working

**Problem:** Theme toggle doesn't change appearance

**Solution:** Clear browser cache and localStorage:
```javascript
// In browser console
localStorage.clear();
location.reload();
```

#### 5. "Game stuck at 'Waiting for result'"

**Problem:** Polling not working or transaction failed

**Solutions:**
- Check browser console for errors
- Verify transaction on block explorer
- Check contract balance
- Ensure RPC URL is correct

#### 6. Build Fails on Vercel

**Problem:** TypeScript or dependency errors

**Solutions:**
- Check `package.json` for correct versions
- Run `npm install` locally to test
- Check Vercel build logs
- Ensure all files are committed to Git

---

## Advanced Topics

### Adding Features

**1. Betting History with Pagination**
```typescript
// Limit games to show
const visibleGames = allGames.slice(0, 10);
```

**2. Statistics Dashboard**
- Total games played
- Win rate
- Total wagered
- Biggest win

**3. Provably Fair Verification**
- Show entropy sequence number
- Link to Pyth verification
- Display randomness proof

**4. Multiplayer Mode**
- Player vs Player bets
- Leaderboard
- Chat system

### Optimization

**Gas Optimization:**
```solidity
// Use uint8 instead of uint256 when possible
uint8 choice;  // Saves gas

// Pack variables together
struct Game {
    address player;    // 20 bytes
    uint8 choice;      // 1 byte
    uint8 result;      // 1 byte
    bool won;          // 1 byte
    // These will be packed into same slot
}
```

**Frontend Performance:**
```typescript
// Use React.memo to prevent unnecessary re-renders
const CoinFlip = React.memo(({ onGameComplete }) => {
  // Component code
});

// Debounce user input
const debouncedSetBetAmount = useDeBounce(setBetAmount, 300);
```

### Monitoring

**Track Contract Events:**
```typescript
// Listen for all game results
const { data: events } = useWatchContractEvent({
  address: COIN_FLIP_ADDRESS,
  abi: COIN_FLIP_ABI,
  eventName: 'GameResult',
  onLogs(logs) {
    console.log('New game results:', logs);
  },
});
```

**Analytics:**
- Add Google Analytics
- Track wallet connections
- Monitor win rates
- Track popular bet amounts

---

## Conclusion

Congratulations! You've built a complete decentralized gambling application with:

✅ **Smart Contract** with provably fair randomness
✅ **Beautiful Frontend** with dark mode and responsive design
✅ **Wallet Integration** using MetaMask
✅ **Deployed on Monad** Testnet
✅ **Live Website** on Vercel

### Next Steps

1. **Mainnet Deployment**
   - Audit smart contract (get professional audit!)
   - Deploy to Monad Mainnet
   - Add more house funds

2. **Marketing**
   - Create social media presence
   - Write documentation
   - Make tutorial videos
   - Build community

3. **Features**
   - Add more games (dice, roulette)
   - Implement referral system
   - Create token rewards
   - Build mobile app

### Resources

**Learning:**
- Solidity: https://docs.soliditylang.org/
- Next.js: https://nextjs.org/docs
- Wagmi: https://wagmi.sh/
- Tailwind: https://tailwindcss.com/

**Tools:**
- Foundry: https://book.getfoundry.sh/
- Monad Docs: https://docs.monad.xyz/
- Pyth Entropy: https://docs.pyth.network/entropy

**Community:**
- Monad Discord: https://discord.gg/monad
- Ethereum Stack Exchange
- BuildSpace
- Developer DAO

### Final Notes

**Security Warning:**
This is a tutorial project. Before deploying to mainnet:
1. Get a professional security audit
2. Test extensively on testnet
3. Start with small house funds
4. Have emergency pause functionality
5. Consider regulatory compliance in your jurisdiction

**Good Luck!** 🚀

Remember: Building on blockchain is a journey. Start small, learn continuously, and ship often!

---

## Appendix: Complete File Reference

### Directory Structure
```
monad-flip/
├── src/
│   └── CoinFlipV2.sol
├── script/
│   └── DeployCoinFlipV2.s.sol
├── test/
│   └── CoinFlipV2.t.sol
├── frontend/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── CoinFlip.tsx
│   │   ├── GameHistory.tsx
│   │   ├── ConnectButton.tsx
│   │   ├── ThemeToggle.tsx
│   │   └── Providers.tsx
│   ├── config/
│   │   ├── chains.ts
│   │   ├── contract.ts
│   │   └── wagmi.ts
│   ├── contexts/
│   │   └── ThemeContext.tsx
│   └── package.json
├── .env
├── .gitignore
└── foundry.toml
```

### Environment Variables

**.env (Root)**
```bash
PRIVATE_KEY=your_private_key
RPC_URL=https://testnet-rpc.monad.xyz
```

### Package.json
```json
{
  "name": "monad-flip-frontend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "15.5.4",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "wagmi": "^2.12.29",
    "viem": "^2.21.54",
    "@tanstack/react-query": "^5.59.20"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "typescript": "^5",
    "tailwindcss": "^4.0.0"
  }
}
```

### Foundry.toml
```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc = "0.8.30"

[rpc_endpoints]
monad_testnet = "https://testnet-rpc.monad.xyz"
```

---

**Document Version:** 1.0
**Last Updated:** 2025-01-03
**Author:** Created with Claude Code
**License:** MIT
