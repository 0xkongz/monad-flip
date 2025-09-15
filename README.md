# MonadFlip - Coin Flip Game on Monad## Monad-flavored Foundry



MonadFlip is a decentralized coin flip gambling game built on the Monad blockchain, utilizing Pyth Entropy for provably fair random number generation.> [!NOTE]

> In this Foundry template, the default chain is `monadTestnet`. If you wish to change it, change the network in `foundry.toml`

## Features

<h4 align="center">

- **Provably Fair Randomness**: Uses Pyth Entropy to generate cryptographically secure random numbers  <a href="https://docs.monad.xyz">Monad Documentation</a> | <a href="https://book.getfoundry.sh/">Foundry Documentation</a> |

- **Simple Coin Flip Game**: Players bet on HEADS or TAILS   <a href="https://github.com/monad-developers/foundry-monad/issues">Report Issue</a>

- **Configurable Fees**: Owner can set fee percentage (max 20%)</h4>

- **Bet Limits**: Configurable minimum and maximum bet amounts

- **House Protection**: Contract checks it has enough balance to pay winnings

- **Event Logging**: All bets and results are logged for transparency**Foundry is a blazing fast, portable and modular toolkit for Ethereum application development written in Rust.**



## How It WorksFoundry consists of:



1. **Place Bet**: Player calls `placeBet(CoinSide guess)` with their wager and guess (HEADS/TAILS)-   **Forge**: Ethereum testing framework (like Truffle, Hardhat, and DappTools).

2. **Random Number Generation**: Contract requests random number from Pyth Entropy-   **Cast**: Swiss army knife for interacting with EVM smart contracts, sending transactions, and getting chain data.

3. **Result Calculation**: Random number is converted to coin flip (even = HEADS, odd = TAILS)-   **Anvil**: Local Ethereum node, akin to Ganache, Hardhat Network.

4. **Payout**: If player wins, they receive 2x their bet minus fees. If they lose, their bet is kept by the house.-   **Chisel**: Fast, utilitarian, and verbose Solidity REPL.



## Contract Details## Documentation



### Core Functionshttps://book.getfoundry.sh/



- `placeBet(CoinSide guess)`: Place a bet on coin flip outcome## Usage

- `calculatePayout(uint256 betAmount)`: Calculate payout after fees

- `getBet(uint64 sequenceNumber)`: Get details of a specific bet### Build

- `getPlayerBets(address player)`: Get all bet sequence numbers for a player

```shell

### Owner Functionsforge build

```

- `setFeePercentage(uint256 _feePercentage)`: Set fee percentage (max 20%)

- `setBetLimits(uint256 _minimumBet, uint256 _maximumBet)`: Set bet limits### Test

- `withdrawFees(uint256 amount)`: Withdraw collected fees

- `addFunds()`: Add funds to ensure contract can pay winnings```shell

- `transferOwnership(address newOwner)`: Transfer contract ownershipforge test

```

### Default Settings

### Format

- **Fee Percentage**: 10% (1000 basis points)

- **Minimum Bet**: 0.001 ETH```shell

- **Maximum Bet**: 10 ETHforge fmt

```

## Deployment

### Gas Snapshots

### Prerequisites

```shell

1. Install Foundry: https://getfoundry.sh/forge snapshot

2. Install dependencies: `npm install````

3. Set up environment variables in `.env`:

   ```### Anvil

   PRIVATE_KEY=your_private_key_here

   ENTROPY_ADDRESS=pyth_entropy_contract_address_on_monad```shell

   RPC_URL=monad_rpc_urlanvil

   ``````



### Deploy to Monad### Deploy to Monad Testnet



```bashFirst, you need to create a keystore file. Do not forget to remember the password! You will need it to deploy your contract.

# Compile contracts

forge build```shell

cast wallet import monad-deployer --private-key $(cast wallet new | grep 'Private key:' | awk '{print $3}')

# Run tests```

forge test

After creating the keystore, you can read its address using:

# Deploy to Monad testnet

forge script script/DeployMonadFlip.s.sol:DeployMonadFlip --rpc-url $RPC_URL --broadcast --verify```shell

```cast wallet address --account monad-deployer

```

## Testing

The command above will create a keystore file named `monad-deployer` in the `~/.foundry/keystores` directory.

The project includes comprehensive tests with a mock Entropy contract:

Then, you can deploy your contract to the Monad Testnet using the keystore file you created.

```bash

# Run all tests```shell

forge testforge create src/Counter.sol:Counter --account monad-deployer --broadcast

```

# Run tests with verbosity

forge test -vvv### Verify Contract



# Run specific test```shell

forge test --match-test test_PlaceBetforge verify-contract \

  <contract_address> \

# Run fuzz tests  src/Counter.sol:Counter \

forge test --match-test testFuzz  --chain 10143 \

```  --verifier sourcify \

  --verifier-url https://sourcify-api-monad.blockvision.org

## Security Considerations```



### Production Considerations### Cast

[Cast reference](https://book.getfoundry.sh/cast/)

1. **User Randomness**: The current implementation uses predictable values for user randomness. In production, implement proper user-provided randomness.```shell

cast <subcommand>

2. **MEV Protection**: Consider implementing commit-reveal schemes or other MEV protection mechanisms.```



3. **Circuit Breakers**: Add emergency pause functionality for security incidents.### Help



4. **Upgradability**: Consider using proxy patterns for contract upgrades.```shell

forge --help

### Auditinganvil --help

cast --help

This contract should be thoroughly audited before mainnet deployment, focusing on:```

- Random number generation security

- Economic attack vectors

- Access control mechanisms## FAQ

- Edge cases in betting logic

### Error: `Error: server returned an error response: error code -32603: Signer had insufficient balance`

## Gas Optimization

This error happens when you don't have enough balance to deploy your contract. You can check your balance with the following command:

- Batch operations where possible

- Consider using packed structs for gas efficiency```shell

- Optimize storage layoutcast wallet address --account monad-deployer

```

## Events

### I have constructor arguments, how do I deploy my contract?

The contract emits the following events for transparency and indexing:

```shell

- `BetPlaced`: When a bet is placedforge create \

- `BetSettled`: When a bet result is determined  src/Counter.sol:Counter \

- `FeesWithdrawn`: When owner withdraws fees  --account monad-deployer \

- `FeePercentageUpdated`: When fee percentage is changed  --broadcast \

- `BetLimitsUpdated`: When bet limits are changed  --constructor-args <constructor_arguments>

```

## License

### I have constructor arguments, how do I verify my contract?

MIT License

```shell

## Disclaimerforge verify-contract \

  <contract_address> \

This is experimental software. Use at your own risk. Gambling can be addictive and may be illegal in your jurisdiction. Please gamble responsibly.  src/Counter.sol:Counter \
  --chain 10143 \
  --verifier sourcify \
  --verifier-url https://sourcify-api-monad.blockvision.org \
  --constructor-args <abi_encoded_constructor_arguments>
```

Please refer to the [Foundry Book](https://book.getfoundry.sh/) for more information.