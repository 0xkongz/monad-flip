export const COIN_FLIP_ADDRESS = '0x54Af6f5dcCB7CE0654cA80Cb0B8d1348752beA57' as const;

export const COIN_FLIP_ABI = [
  {
    inputs: [
      { internalType: 'address', name: '_entropyAddress', type: 'address' },
      { internalType: 'address', name: '_entropyProvider', type: 'address' },
      { internalType: 'uint256', name: '_minBet', type: 'uint256' },
      { internalType: 'uint256', name: '_maxBet', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    inputs: [{ internalType: 'uint8', name: '_choice', type: 'uint8' }],
    name: 'placeBet',
    outputs: [{ internalType: 'uint256', name: 'gameId', type: 'uint256' }],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '_gameId', type: 'uint256' }],
    name: 'cancelGame',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '_player', type: 'address' }],
    name: 'getPlayerGames',
    outputs: [{ internalType: 'uint256[]', name: '', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '_gameId', type: 'uint256' }],
    name: 'getGame',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'player', type: 'address' },
          { internalType: 'uint256', name: 'betAmount', type: 'uint256' },
          { internalType: 'uint8', name: 'playerChoice', type: 'uint8' },
          { internalType: 'uint8', name: 'result', type: 'uint8' },
          { internalType: 'bool', name: 'won', type: 'bool' },
          { internalType: 'uint256', name: 'payout', type: 'uint256' },
          { internalType: 'uint256', name: 'timestamp', type: 'uint256' },
          { internalType: 'enum CoinFlipV2.GameState', name: 'state', type: 'uint8' },
        ],
        internalType: 'struct CoinFlipV2.Game',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getEntropyFee',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'minBet',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'maxBet',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'player', type: 'address' },
      { indexed: true, internalType: 'uint256', name: 'gameId', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' },
      { indexed: false, internalType: 'uint8', name: 'choice', type: 'uint8' },
      { indexed: false, internalType: 'uint64', name: 'sequenceNumber', type: 'uint64' },
    ],
    name: 'BetPlaced',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'player', type: 'address' },
      { indexed: true, internalType: 'uint256', name: 'gameId', type: 'uint256' },
      { indexed: false, internalType: 'uint8', name: 'choice', type: 'uint8' },
      { indexed: false, internalType: 'uint8', name: 'result', type: 'uint8' },
      { indexed: false, internalType: 'bool', name: 'won', type: 'bool' },
      { indexed: false, internalType: 'uint256', name: 'payout', type: 'uint256' },
    ],
    name: 'GameResult',
    type: 'event',
  },
] as const;
