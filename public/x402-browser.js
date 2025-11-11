// Import x402 libraries from CDN
import { createWalletClient, custom, http } from 'https://esm.sh/viem@2.21.0';
import { baseSepolia } from 'https://esm.sh/viem@2.21.0/chains';
import { wrapFetchWithPayment } from 'https://esm.sh/x402-fetch@0.6.6';

// Global state
let walletClient = null;
let fetchWithPayment = null;

export async function connectWallet() {
    if (typeof window.ethereum === 'undefined') {
        throw new Error('Please install MetaMask or another Web3 wallet to continue.');
    }

    // Request account access
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    const userAddress = accounts[0];

    // Check if on Base Sepolia
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    const baseSepoliaChainId = '0x14a34'; // 84532 in hex

    if (chainId !== baseSepoliaChainId) {
        // Try to switch to Base Sepolia
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: baseSepoliaChainId }],
            });
        } catch (switchError) {
            // Chain not added, try to add it
            if (switchError.code === 4902) {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: baseSepoliaChainId,
                        chainName: 'Base Sepolia',
                        nativeCurrency: {
                            name: 'Ethereum',
                            symbol: 'ETH',
                            decimals: 18
                        },
                        rpcUrls: ['https://sepolia.base.org'],
                        blockExplorerUrls: ['https://sepolia.basescan.org']
                    }]
                });
            } else {
                throw switchError;
            }
        }
    }

    // Create wallet client
    walletClient = createWalletClient({
        chain: baseSepolia,
        transport: custom(window.ethereum)
    });

    // Wrap fetch with x402 payment handling
    fetchWithPayment = wrapFetchWithPayment(fetch, walletClient);

    return userAddress;
}

export async function makeX402Request(url, options = {}) {
    if (!fetchWithPayment) {
        throw new Error('Wallet not connected. Please connect your wallet first.');
    }

    return await fetchWithPayment(url, options);
}

export function isWalletConnected() {
    return walletClient !== null;
}
