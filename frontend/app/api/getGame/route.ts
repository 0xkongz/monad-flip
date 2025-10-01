import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { monadTestnet } from '@/config/chains';
import { COIN_FLIP_ADDRESS, COIN_FLIP_ABI } from '@/config/contract';

const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http('https://testnet-rpc.monad.xyz'),
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const gameId = searchParams.get('gameId');

    if (!gameId) {
      return NextResponse.json({ error: 'Game ID is required' }, { status: 400 });
    }

    const game = await publicClient.readContract({
      address: COIN_FLIP_ADDRESS,
      abi: COIN_FLIP_ABI,
      functionName: 'getGame',
      args: [BigInt(gameId)],
    });

    return NextResponse.json({ game });
  } catch (error) {
    console.error('Error fetching game:', error);
    return NextResponse.json({ error: 'Failed to fetch game' }, { status: 500 });
  }
}
