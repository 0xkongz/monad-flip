# MonadFlip Production Deployment Guide

## 🔒 SECURITY CHECKLIST - CRITICAL

### ✅ **Implemented Security Features:**

1. **🛡️ Secure Randomness**
   - ✅ User-provided randomness instead of predictable block values
   - ✅ Commit-reveal scheme available for maximum security
   - ✅ No manipulation via block.timestamp or block.prevrandao

2. **🛡️ Reentrancy Protection**
   - ✅ NonReentrant modifier on all state-changing functions
   - ✅ Safe call patterns instead of transfer()

3. **🛡️ Emergency Controls**
   - ✅ Pause/unpause functionality
   - ✅ Emergency withdrawal when paused
   - ✅ Circuit breakers for DoS protection

4. **🛡️ Access Controls**
   - ✅ Owner-only administrative functions
   - ✅ Ownership transfer with validation
   - ✅ Event logging for all admin actions

5. **🛡️ DoS Protection**
   - ✅ Maximum concurrent bets limit
   - ✅ Bet amount limits
   - ✅ Gas-efficient patterns

## 🚨 CRITICAL VULNERABILITIES FIXED

### **❌ BEFORE (Vulnerable):**
```solidity
// INSECURE - DON'T USE
bytes32 userRandomNumber = keccak256(abi.encodePacked(
    msg.sender,        // Known by attacker
    block.timestamp,   // Predictable/manipulable
    block.prevrandao   // Public knowledge
));
```

### **✅ AFTER (Secure):**
```solidity
// SECURE - User provides secret randomness
function placeBet(CoinSide _guess, bytes32 _userRandomness) external payable {
    require(_userRandomness != bytes32(0), "Invalid user randomness");
    // User must provide truly random value
}
```

## 📋 PRE-DEPLOYMENT CHECKLIST

### **1. Environment Setup**
```bash
# Create production .env file
cp .env.example .env

# Set production variables
PRIVATE_KEY=your_production_private_key
RPC_URL=https://rpc.monad.xyz  # Mainnet URL
ENTROPY_ADDRESS=0x36825bf3Fbdf5a29E2d5148bfe7Dcf7B5639e320
```

### **2. Contract Compilation & Testing**
```bash
# Compile contracts
forge build

# Run comprehensive tests
forge test -vvv

# Run gas optimization checks
forge test --gas-report
```

### **3. Security Audit Requirements**
- [ ] **Professional security audit** (MANDATORY)
- [ ] **Code review** by multiple developers
- [ ] **Formal verification** of critical functions
- [ ] **Economic model validation**

## 🚀 PRODUCTION DEPLOYMENT

### **Step 1: Deploy Contract**
```bash
# Deploy to Monad mainnet
forge script script/DeployMonadFlipProduction.s.sol:DeployMonadFlipProduction \
  --rpc-url $RPC_URL \
  --broadcast \
  --verify \
  --slow
```

### **Step 2: Post-Deployment Configuration**
```bash
# Set production parameters
cast send $CONTRACT_ADDRESS "setBetLimits(uint256,uint256)" 10000000000000000 1000000000000000000 \
  --rpc-url $RPC_URL --private-key $PRIVATE_KEY

# Set production fee (5%)
cast send $CONTRACT_ADDRESS "setFeePercentage(uint256)" 500 \
  --rpc-url $RPC_URL --private-key $PRIVATE_KEY
```

### **Step 3: Transfer to MultiSig (HIGHLY RECOMMENDED)**
```bash
# Transfer ownership to multisig wallet
cast send $CONTRACT_ADDRESS "transferOwnership(address)" $MULTISIG_ADDRESS \
  --rpc-url $RPC_URL --private-key $PRIVATE_KEY
```

## 🔧 PRODUCTION CONFIGURATION

### **Recommended Settings:**
```solidity
minimumBet: 0.01 ether    // Prevent spam
maximumBet: 1 ether       // Limit exposure
feePercentage: 500        // 5% house edge
maxConcurrentBets: 50     // DoS protection
```

### **Initial Funding:**
- **Minimum:** 50 ETH (to handle large bets)
- **Recommended:** 100+ ETH for production

## 🔍 MONITORING & MAINTENANCE

### **1. Event Monitoring**
Monitor these critical events:
- `BetPlaced` - Track betting volume
- `BetSettled` - Monitor outcomes
- `EmergencyPause` - Alert on emergency situations
- `OwnershipTransferred` - Security critical

### **2. Health Checks**
- Contract balance vs. potential payouts
- Active bets count
- Pause status
- Entropy contract connectivity

### **3. Alert Thresholds**
- Contract balance < 10 ETH
- Active bets > 80% of maximum
- Unusual betting patterns
- Failed entropy callbacks

## 🚨 EMERGENCY PROCEDURES

### **Emergency Pause:**
```bash
# Pause contract immediately
cast send $CONTRACT_ADDRESS "pause()" \
  --rpc-url $RPC_URL --private-key $PRIVATE_KEY
```

### **Emergency Withdrawal:**
```bash
# Withdraw all funds (only when paused)
cast send $CONTRACT_ADDRESS "emergencyWithdraw()" \
  --rpc-url $RPC_URL --private-key $PRIVATE_KEY
```

## 🔐 ENHANCED SECURITY: COMMIT-REVEAL

For maximum security, use `MonadFlipWithCommitReveal.sol`:

### **Step 1: Commit**
```solidity
// Frontend generates secret randomness
bytes32 randomness = keccak256(abi.encodePacked(userInput, timestamp));
bytes32 nonce = keccak256(abi.encodePacked(randomness, block.timestamp));
bytes32 commitment = keccak256(abi.encodePacked(randomness, nonce));

// Commit on-chain
contract.commitRandomness(commitment);
```

### **Step 2: Wait (1 hour)**
- User must wait commitment duration
- Prevents manipulation attacks

### **Step 3: Reveal & Bet**
```solidity
// Reveal and place bet
contract.revealAndPlaceBet(guess, randomness, nonce);
```

## 📊 GAS OPTIMIZATION

### **Estimated Gas Costs:**
- `placeBet()`: ~150,000 gas
- `entropyCallback()`: ~100,000 gas
- `commitRandomness()`: ~50,000 gas
- `revealAndPlaceBet()`: ~180,000 gas

### **Optimization Tips:**
- Use `uint128` for smaller values
- Pack structs efficiently
- Minimize storage writes

## ⚖️ LEGAL CONSIDERATIONS

### **Compliance Requirements:**
- [ ] Gambling license (jurisdiction-dependent)
- [ ] KYC/AML procedures
- [ ] Responsible gambling features
- [ ] Age verification
- [ ] Terms of service
- [ ] Privacy policy

### **Risk Disclosures:**
- Smart contract risks
- Market volatility
- Regulatory changes
- Technical failures

## 🔄 UPGRADE STRATEGY

### **Current Version: Non-Upgradeable**
- Immutable contract design
- New features require new deployment
- Migration process for existing users

### **Future: Proxy Pattern**
Consider implementing upgradeability:
- Use OpenZeppelin's proxy pattern
- Time-locked upgrades
- Community governance

## 📈 BUSINESS METRICS

### **Key Performance Indicators:**
- Total volume wagered
- House edge efficiency
- User retention rate
- Average bet size
- Peak concurrent users

### **Financial Metrics:**
- Revenue per day/week/month
- Profit margins
- Operational costs
- Risk-adjusted returns

---

## ⚠️ FINAL WARNING

**THIS IS FINANCIAL SOFTWARE HANDLING REAL MONEY**

- Deploy ONLY after professional security audit
- Start with small bet limits
- Monitor continuously
- Have emergency procedures ready
- Consider legal and regulatory compliance
- Use multisig wallets for admin functions

**Remember: One bug can result in total loss of funds. Proceed with extreme caution.**