const { createPublicClient, http, formatUnits } = require('viem');
const { baseSepolia } = require('viem/chains');

const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
const YOUR_ADDRESS = '0x6F20BAcc1972e43186a04dAE1e8c93f6aA9B5149';

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

async function checkBalances() {
  console.log('Checking balances for:', YOUR_ADDRESS);
  console.log('');

  // Check ETH balance
  const ethBalance = await publicClient.getBalance({ address: YOUR_ADDRESS });
  console.log('ETH Balance:', formatUnits(ethBalance, 18), 'ETH');

  // Check USDC balance
  const usdcBalance = await publicClient.readContract({
    address: USDC_ADDRESS,
    abi: [
      {
        constant: true,
        inputs: [{ name: '_owner', type: 'address' }],
        name: 'balanceOf',
        outputs: [{ name: 'balance', type: 'uint256' }],
        type: 'function',
      },
    ],
    functionName: 'balanceOf',
    args: [YOUR_ADDRESS],
  });

  console.log('USDC Balance:', formatUnits(usdcBalance, 6), 'USDC');
  console.log('');
  console.log('Required for transaction: 0.001 USDC + gas fees');
  console.log('');

  if (BigInt(usdcBalance) < BigInt(1000)) {
    console.log('❌ Insufficient USDC! You need at least 0.001 USDC');
    console.log('');
    console.log('How to get testnet USDC:');
    console.log('1. Visit https://faucet.circle.com/');
    console.log('2. Or swap ETH for USDC on a Base Sepolia DEX');
    console.log('3. Or use the Coinbase faucet');
  } else {
    console.log('✅ Sufficient USDC balance!');
  }

  if (ethBalance < BigInt(10000000000000000)) {
    console.log('⚠️  Low ETH balance for gas fees!');
    console.log('Get testnet ETH: https://www.coinbase.com/faucets');
  } else {
    console.log('✅ Sufficient ETH for gas!');
  }
}

checkBalances().catch(console.error);
