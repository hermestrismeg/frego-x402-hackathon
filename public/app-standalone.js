// Standalone app without module imports - works in all browsers

// Global state
let walletConnected = false;
let userAddress = null;
let walletClient = null;

// Connect wallet
document.getElementById('connectWallet').addEventListener('click', async () => {
    try {
        if (typeof window.ethereum === 'undefined') {
            showError('Please install MetaMask or another Web3 wallet to continue.');
            return;
        }

        // Request account access
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        userAddress = accounts[0];

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

        walletConnected = true;
        updateWalletUI();
    } catch (error) {
        console.error('Wallet connection error:', error);
        showError('Failed to connect wallet: ' + error.message);
    }
});

function updateWalletUI() {
    const statusEl = document.getElementById('walletStatus');
    const textEl = document.getElementById('walletText');
    const connectBtn = document.getElementById('connectWallet');
    const mainForm = document.getElementById('mainForm');

    if (walletConnected) {
        statusEl.classList.add('connected');
        textEl.textContent = `Connected: ${userAddress.substring(0, 6)}...${userAddress.substring(38)}`;
        connectBtn.style.display = 'none';
        mainForm.style.display = 'block';
    }
}

// Form submission
document.getElementById('shippingForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = {
        itemDescription: document.getElementById('itemDescription').value,
        fromAddress: {
            name: document.getElementById('fromName').value,
            street1: document.getElementById('fromStreet').value,
            city: document.getElementById('fromCity').value,
            state: document.getElementById('fromState').value,
            zip: document.getElementById('fromZip').value,
            country: 'US',
            email: document.getElementById('fromEmail').value,
            phone: document.getElementById('fromPhone').value
        },
        toAddress: {
            name: document.getElementById('toName').value,
            street1: document.getElementById('toStreet').value,
            city: document.getElementById('toCity').value,
            state: document.getElementById('toState').value,
            zip: document.getElementById('toZip').value,
            country: 'US',
            email: document.getElementById('toEmail').value,
            phone: document.getElementById('toPhone').value
        }
    };

    await getShippingQuotes(formData);
});

async function getShippingQuotes(data) {
    hideError();
    document.getElementById('mainForm').style.display = 'none';
    document.getElementById('loading').style.display = 'block';
    document.getElementById('loadingText').textContent = 'Processing your request...';

    try {
        // First request - check if payment required
        let response = await fetch('/api/web/shipping/quote', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        if (response.status === 402) {
            // Payment required
            const paymentInfo = await response.json();
            console.log('Payment required:', paymentInfo.paymentRequired);

            document.getElementById('loadingText').textContent = 'Please approve the payment in MetaMask...';

            // Make the USDC payment
            const txHash = await makeUSDCPayment(
                paymentInfo.paymentRequired.usdcContract,
                paymentInfo.paymentRequired.recipient,
                paymentInfo.paymentRequired.amount
            );

            console.log('Payment transaction:', txHash);

            // Wait for confirmation
            document.getElementById('loadingText').textContent = 'Waiting for payment confirmation...';
            await waitForTransactionConfirmation(txHash);

            // Retry with payment proof
            document.getElementById('loadingText').textContent = 'Payment confirmed. Getting shipping quotes...';

            response = await fetch('/api/web/shipping/quote', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-PAYMENT-TX': txHash
                },
                body: JSON.stringify(data)
            });
        }

        if (response.ok) {
            const result = await response.json();
            displayResults(result);
        } else {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Request failed');
        }

    } catch (error) {
        console.error('Error:', error);
        showError(error.message);
        document.getElementById('loading').style.display = 'none';
        document.getElementById('mainForm').style.display = 'block';
    }
}

async function makeUSDCPayment(usdcContract, recipient, amountUSDC) {
    try {
        // Convert USDC amount to micro-USDC (6 decimals)
        const amountMicroUSDC = Math.floor(parseFloat(amountUSDC) * 1000000);

        console.log('Making USDC payment:', {
            amount: amountUSDC + ' USDC (' + amountMicroUSDC + ' micro-USDC)',
            recipient,
            contract: usdcContract
        });

        // Encode USDC transfer transaction
        const transferData = encodeERC20Transfer(recipient, amountMicroUSDC);

        // Send transaction via MetaMask
        const txHash = await window.ethereum.request({
            method: 'eth_sendTransaction',
            params: [{
                from: userAddress,
                to: usdcContract,
                data: transferData,
                gas: '0x186A0', // 100000 gas
            }]
        });

        return txHash;

    } catch (error) {
        console.error('Payment error:', error);
        if (error.code === 4001) {
            throw new Error('Payment cancelled by user');
        }
        throw new Error('Payment failed: ' + error.message);
    }
}

function encodeERC20Transfer(to, amount) {
    // ERC20 transfer(address recipient, uint256 amount)
    // Function selector: 0xa9059cbb
    const methodId = 'a9059cbb';
    const paddedRecipient = to.substring(2).padStart(64, '0');
    const paddedAmount = BigInt(amount).toString(16).padStart(64, '0');

    return '0x' + methodId + paddedRecipient + paddedAmount;
}

async function waitForTransactionConfirmation(txHash) {
    // Poll for transaction receipt
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds max

    while (attempts < maxAttempts) {
        try {
            const receipt = await window.ethereum.request({
                method: 'eth_getTransactionReceipt',
                params: [txHash]
            });

            if (receipt && receipt.blockNumber) {
                console.log('Transaction confirmed in block:', receipt.blockNumber);
                return receipt;
            }
        } catch (error) {
            console.error('Error checking transaction:', error);
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
    }

    throw new Error('Transaction confirmation timeout');
}

// Store current form data for label purchase
let currentFormData = null;

function displayResults(result) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('results').style.display = 'block';

    // Display AI parsed info
    const parsedHtml = `
        <h3>🤖 AI Analyzed Your Item</h3>
        <p><strong>Weight:</strong> ${result.parsedInfo.weight} ${result.parsedInfo.weightUnit}</p>
        ${result.parsedInfo.dimensions ? `<p><strong>Dimensions:</strong> ${result.parsedInfo.dimensions.length}×${result.parsedInfo.dimensions.width}×${result.parsedInfo.dimensions.height} ${result.parsedInfo.dimensions.unit}</p>` : ''}
        <p><strong>Category:</strong> ${result.parsedInfo.category}</p>
        <p><strong>Fragile:</strong> ${result.parsedInfo.fragile ? 'Yes' : 'No'}</p>
        <p><strong>Estimated Value:</strong> $${result.parsedInfo.value}</p>
    `;
    document.getElementById('aiParsed').innerHTML = parsedHtml;

    // Display quotes with purchase buttons
    const quotesHtml = result.quotes.map(quote => {
        const isRecommended = result.recommended?.rateId === quote.rateId;
        return `
            <div class="quote-card ${isRecommended ? 'recommended' : ''}">
                ${isRecommended ? '<span class="recommended-badge">⭐ AI Recommended</span>' : ''}
                <div class="quote-header">
                    <div class="quote-carrier">${quote.carrier}</div>
                    <div class="quote-price">$${quote.price}</div>
                </div>
                <div class="quote-service">${quote.serviceName}</div>
                <div class="quote-details">
                    <span>📅 ${quote.estimatedDays} days</span>
                    <span>💵 ${quote.currency}</span>
                </div>
                <button class="btn btn-primary" style="margin-top: 15px; width: 100%;" onclick="purchaseLabel('${quote.rateId}', '${quote.carrier}', '${quote.serviceName}', '${quote.price}')">
                    Purchase Label ($${quote.price} + $0.001 fee)
                </button>
            </div>
        `;
    }).join('');

    document.getElementById('quotes').innerHTML = quotesHtml;
}

async function purchaseLabel(rateId, carrier, service, price) {
    if (!confirm(`Purchase ${carrier} ${service} label for $${price}?\n\nYou'll also pay a $0.001 USDC service fee.`)) {
        return;
    }

    hideError();
    document.getElementById('results').style.display = 'none';
    document.getElementById('loading').style.display = 'block';
    document.getElementById('loadingText').textContent = 'Purchasing shipping label...';

    try {
        // First request - will require payment
        let response = await fetch('/api/web/shipping/label', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                rateId: rateId,
                carrier: carrier,
                service: service,
                price: price
            })
        });

        if (response.status === 402) {
            // Payment required
            const paymentInfo = await response.json();
            console.log('Payment required for label purchase:', paymentInfo.paymentRequired);

            document.getElementById('loadingText').textContent = 'Please approve the service fee payment in MetaMask...';

            // Make the USDC payment
            const txHash = await makeUSDCPayment(
                paymentInfo.paymentRequired.usdcContract,
                paymentInfo.paymentRequired.recipient,
                paymentInfo.paymentRequired.amount
            );

            console.log('Payment transaction:', txHash);

            // Wait for confirmation
            document.getElementById('loadingText').textContent = 'Waiting for payment confirmation...';
            await waitForTransactionConfirmation(txHash);

            // Retry with payment proof
            document.getElementById('loadingText').textContent = 'Payment confirmed. Purchasing label...';

            response = await fetch('/api/web/shipping/label', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-PAYMENT-TX': txHash
                },
                body: JSON.stringify({
                    rateId: rateId,
                    carrier: carrier,
                    service: service,
                    price: price
                })
            });
        }

        if (response.ok) {
            const result = await response.json();
            displayLabelPurchased(result.label, carrier, service);
        } else {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to purchase label');
        }

    } catch (error) {
        console.error('Error purchasing label:', error);
        showError(error.message);
        document.getElementById('loading').style.display = 'none';
        document.getElementById('results').style.display = 'block';
    }
}

function displayLabelPurchased(label, carrier, service) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('results').style.display = 'block';

    const labelHtml = `
        <div class="card" style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3);">
            <h3 style="color: #10b981;">✅ Shipping Label Purchased!</h3>
            <p style="color: rgba(255, 255, 255, 0.9);"><strong>Carrier:</strong> ${label.carrier}</p>
            <p style="color: rgba(255, 255, 255, 0.9);"><strong>Service:</strong> ${label.service}</p>
            <p style="color: rgba(255, 255, 255, 0.9);"><strong>Cost:</strong> $${label.cost}</p>
            <p style="color: rgba(255, 255, 255, 0.9);"><strong>Tracking Number:</strong> <code>${label.trackingNumber}</code></p>
            <p style="color: rgba(255, 255, 255, 0.9);"><strong>Payment Transaction:</strong> <code style="font-size: 0.8em;">${label.paymentTxHash}</code></p>
            <a href="https://sepolia.basescan.org/tx/${label.paymentTxHash}" target="_blank" style="color: #10b981; text-decoration: none; font-size: 0.9em; display: block; margin-top: 5px;">
                🔗 View payment on BaseScan
            </a>
            <a href="${label.labelUrl}" target="_blank" class="btn btn-primary" style="margin-top: 15px; display: inline-block;">
                📄 Download Shipping Label (PDF)
            </a>
        </div>
    `;

    // Insert at the top of results
    const aiParsed = document.getElementById('aiParsed');
    aiParsed.insertAdjacentHTML('beforebegin', labelHtml);

    // Scroll to top
    window.scrollTo(0, 0);
}

// Make purchaseLabel available globally
window.purchaseLabel = purchaseLabel;

function showError(message) {
    document.getElementById('error').style.display = 'block';
    document.getElementById('errorMessage').textContent = message;
}

function hideError() {
    document.getElementById('error').style.display = 'none';
}

function resetForm() {
    document.getElementById('results').style.display = 'none';
    document.getElementById('mainForm').style.display = 'block';
}

// Check if wallet is already connected
if (typeof window.ethereum !== 'undefined') {
    window.ethereum.request({ method: 'eth_accounts' }).then(accounts => {
        if (accounts.length > 0) {
            userAddress = accounts[0];
            walletConnected = true;
            updateWalletUI();
        }
    });
}

// Make resetForm available globally
window.resetForm = resetForm;
