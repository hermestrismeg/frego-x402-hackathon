import { connectWallet, makeX402Request, isWalletConnected } from './x402-browser.js';

// Global state
let walletConnected = false;
let userAddress = null;

// Connect wallet
document.getElementById('connectWallet').addEventListener('click', async () => {
    try {
        userAddress = await connectWallet();
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
            country: 'US'
        },
        toAddress: {
            name: document.getElementById('toName').value,
            street1: document.getElementById('toStreet').value,
            city: document.getElementById('toCity').value,
            state: document.getElementById('toState').value,
            zip: document.getElementById('toZip').value,
            country: 'US'
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
        // Use x402 payment-protected endpoint
        document.getElementById('loadingText').textContent = 'Requesting quotes (may require payment)...';

        const response = await makeX402Request('/api/shipping/quote', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        console.log('Response status:', response.status);

        if (response.ok) {
            const result = await response.json();
            displayResults(result);
        } else {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Request failed: ' + response.statusText);
        }

    } catch (error) {
        console.error('Error:', error);
        showError(error.message);
        document.getElementById('loading').style.display = 'none';
        document.getElementById('mainForm').style.display = 'block';
    }
}

// Payment is now handled automatically by x402-fetch via the makeX402Request function

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

    // Display quotes
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
            </div>
        `;
    }).join('');

    document.getElementById('quotes').innerHTML = quotesHtml;
}

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
