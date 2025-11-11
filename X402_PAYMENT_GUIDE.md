# x402 Payment Integration Guide

This guide shows you **exactly** how to make x402 payments work in this application.

## Understanding x402 Payments

x402 is a payment protocol that allows API requests to require cryptocurrency payment (USDC) before serving a response. The flow works like this:

1. **Client sends request** → Server responds with HTTP 402 (Payment Required)
2. **Client detects 402** → Extracts payment details from response
3. **Client makes payment** → Sends USDC on-chain to server's address
4. **Client retries request** → Includes payment proof in `X-PAYMENT` header
5. **Server verifies payment** → Returns actual response with data

## Two Ways to Use This App

### Option 1: Simple CLI (No Automatic Payment)

Shows payment requirements but doesn't auto-pay:

```bash
npm run dev:cli-simple
```

This will display payment info when the server responds with 402, but won't make the payment.

### Option 2: Full CLI with Automatic x402 Payment

Automatically handles the entire payment flow:

```bash
npm run dev:cli
```

This guide shows you how to set up **Option 2**.

## Complete Setup Instructions

### Step 1: Create a Testnet Wallet

For testing, you'll create a **new** wallet specifically for this app. Don't use your main wallet!

#### Using MetaMask:

1. Install MetaMask browser extension
2. Click "Create a new wallet"
3. Follow the setup process
4. **Important**: Save your seed phrase securely!

#### Or Create a Wallet Programmatically:

```bash
node -e "const {generatePrivateKey, privateKeyToAccount} = require('viem/accounts'); const pk = generatePrivateKey(); const account = privateKeyToAccount(pk); console.log('Private Key:', pk); console.log('Address:', account.address);"
```

Save both the private key and address!

### Step 2: Get Your Private Key from MetaMask

If using MetaMask:

1. Click the three dots menu on your account
2. Select "Account Details"
3. Click "Show Private Key"
4. Enter your password
5. **Copy the private key** (starts with `0x`)

### Step 3: Add Base Sepolia Network to MetaMask

1. Go to https://chainlist.org/
2. Search for "Base Sepolia"
3. Click "Add to MetaMask"

Or manually add:
- **Network Name**: Base Sepolia
- **RPC URL**: https://sepolia.base.org
- **Chain ID**: 84532
- **Currency Symbol**: ETH
- **Block Explorer**: https://sepolia.basescan.org

### Step 4: Get Testnet ETH

You need ETH on Base Sepolia to pay for gas fees:

1. Go to https://www.coinbase.com/faucets/base-ethereum-goerli-faucet
2. Or use https://sepoliafaucet.com/
3. Enter your wallet address
4. Claim free testnet ETH

Verify you received it:
- Check your address on https://sepolia.basescan.org

### Step 5: Get USDC on Base Sepolia

x402 payments use USDC. Here's how to get testnet USDC:

#### Option A: Use a Testnet Faucet

Check if there's a Base Sepolia USDC faucet available:
- https://faucet.circle.com/ (if available for Base Sepolia)

#### Option B: Use a DEX on Base Sepolia

1. Go to Uniswap or another DEX that supports Base Sepolia
2. Connect your wallet
3. Swap some testnet ETH for USDC
4. You only need about $1-2 USDC for testing

#### Option C: Deploy Your Own Test USDC (Advanced)

If you can't find USDC, you can use the mock USDC contract that x402 provides for testing, or deploy your own ERC20 token.

### Step 6: Configure Your .env File

Add your credentials to `.env`:

```bash
# Server Configuration
PORT=3000
SERVER_URL=http://localhost:3000

# x402 Payment Configuration (Server - receives payments)
# This is YOUR address that will receive payments
PAYMENT_ADDRESS=0xYourWalletAddress
PAYMENT_NETWORK=base-sepolia
PAYMENT_PRICE=$0.001

# x402 Client Configuration (Client - makes payments)
# SECURITY WARNING: Never commit this to git!
# This is the PRIVATE KEY of the wallet making payments
WALLET_PRIVATE_KEY=0xYourPrivateKeyFromMetaMask

# GoShippo API Configuration
SHIPPO_API_TOKEN=your_shippo_token

# AI Agent Configuration
ANTHROPIC_API_KEY=your_anthropic_key
```

**Important Notes:**
- `PAYMENT_ADDRESS` = Where you receive payments (your public address)
- `WALLET_PRIVATE_KEY` = Your private key for making payments (keep secret!)
- For testing, you can use the **same wallet** for both (pay yourself)
- Never commit `.env` to git (it's in `.gitignore`)

### Step 7: Install Dependencies

```bash
npm install
```

This installs `x402-fetch` and `viem` which handle the payment flow.

### Step 8: Start the Server

In one terminal:

```bash
npm run dev:server
```

You should see:
```
🚀 Shippo x402 AI Agent server running on port 3000
💰 Payment address: 0xYour...Address
🌐 Network: base-sepolia
💵 Price per request: $0.001
```

### Step 9: Test the Payment Flow

In another terminal:

```bash
npm run dev:cli
```

Follow the prompts:
1. Choose "Get Shipping Quotes" or "Purchase Label"
2. Describe your item
3. Enter shipping addresses

**What Happens:**
1. CLI makes request to server
2. Server responds with 402 Payment Required
3. `x402-fetch` automatically:
   - Reads the payment requirements
   - Uses your private key to sign transaction
   - Sends USDC to the server's address
   - Retries request with payment proof
4. Server verifies payment and returns data
5. You see the shipping quotes!

## Complete Example Flow

Here's what a successful payment looks like:

```bash
$ npm run dev:cli

📦 Get Shipping Quote
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

? Describe the item you want to ship: A laptop, 3 pounds, valuable

Sender Address:
? Sender name: John Doe
? Street address: 123 Main St
? City: San Francisco
? State: CA
? ZIP: 94103
? Country: US

Recipient Address:
? Recipient name: Jane Smith
? Street address: 456 Oak Ave
? City: New York
? State: NY
? ZIP: 10001
? Country: US

⏳ Processing request...
💰 Making x402 payment...

✅ Payment successful! Shipping Quotes Retrieved!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🤖 AI Parsed Item Info:
  Weight: 3 lb
  Dimensions: 15x10x2 in
  Category: electronics
  Fragile: true
  Estimated Value: $800

📋 Available Shipping Options:

  1. USPS - Priority Mail ⭐ RECOMMENDED
     💵 Price: $12.50 USD
     📅 Estimated: 2 days
     🔑 Rate ID: abc123...

  2. UPS - Ground
     💵 Price: $18.75 USD
     📅 Estimated: 5 days
     🔑 Rate ID: def456...
```

## Troubleshooting

### Error: "WALLET_PRIVATE_KEY not set"

**Solution:** Add your private key to `.env`:
```
WALLET_PRIVATE_KEY=0xYourPrivateKey
```

### Error: "insufficient funds"

**Solution:**
- Check your USDC balance on Base Sepolia
- Get more testnet USDC from a faucet or DEX
- Make sure you have ETH for gas fees

### Error: "Cannot find module 'viem'"

**Solution:**
```bash
npm install
```

### Payment Doesn't Go Through

**Check:**
1. Is your wallet connected to Base Sepolia network?
2. Do you have USDC balance? Check on https://sepolia.basescan.org
3. Do you have ETH for gas? Need at least ~$0.50 worth
4. Is your private key correct? Should start with `0x`

### Server Returns 500 Error

**Check:**
1. Are your API keys (Shippo, Anthropic) valid?
2. Is the server running?
3. Check server logs for specific error

## How the Code Works

### Client Side (`src/client.ts`)

```typescript
import { x402Fetch } from 'x402-fetch';
import { privateKeyToAccount } from 'viem/accounts';

const account = privateKeyToAccount(privateKey);

// x402Fetch automatically handles payment
const response = await x402Fetch(url, {
  method: 'POST',
  body: JSON.stringify(data),
  account: account,  // This enables automatic payment!
});
```

The `account` parameter is the magic - `x402-fetch` uses it to:
1. Detect 402 responses
2. Sign and send payment transaction
3. Wait for confirmation
4. Retry with payment proof

### Server Side (`src/server.ts`)

```typescript
import { paymentMiddleware } from 'x402-express';

app.use(
  paymentMiddleware(paymentAddress, {
    'POST /api/shipping/quote': {
      price: '$0.001',
      network: 'base-sepolia',
    },
  })
);
```

The middleware:
1. Intercepts requests to protected routes
2. Checks for `X-PAYMENT` header
3. If missing, returns 402 with payment requirements
4. If present, verifies payment on-chain
5. If valid, allows request through

## Testing End-to-End

### Test 1: Verify Server Payment Requirement

```bash
curl -X POST http://localhost:3000/api/shipping/quote \
  -H "Content-Type: application/json" \
  -d '{"itemDescription":"test","fromAddress":{},"toAddress":{}}'
```

Expected response: HTTP 402 with payment details

### Test 2: Run Full Payment Flow

```bash
npm run dev:cli
```

Select quote, enter item details, watch payment happen automatically!

### Test 3: Check Transaction on Block Explorer

After a successful payment:
1. Go to https://sepolia.basescan.org
2. Enter your wallet address
3. You should see:
   - USDC transfer transaction
   - From your wallet to PAYMENT_ADDRESS
   - Amount: $0.001 USDC

## Security Best Practices

1. **Never commit `.env`** - It's in `.gitignore`, keep it that way!
2. **Use testnet wallets** - Don't use real funds for testing
3. **Different wallets for production** - Use separate wallets for server and client
4. **Rotate keys** - Change private keys periodically
5. **Monitor balances** - Watch for unexpected transactions

## Advanced: Using Your Own Payment Processor

For production, you might want custom payment logic:

```typescript
import { x402Fetch } from 'x402-fetch';

const response = await x402Fetch(url, {
  method: 'POST',
  body: data,
  account: account,
  // Custom payment handler
  onPaymentRequired: async (paymentInfo) => {
    console.log('Payment needed:', paymentInfo);
    // Custom logic here
  },
});
```

## Next Steps

1. **Test the full flow** with testnet funds
2. **Monitor transactions** on block explorer
3. **Try different payment amounts** by changing `PAYMENT_PRICE`
4. **Build on top** - Add more x402-protected endpoints

## Resources

- x402 Documentation: https://www.x402.org
- x402 GitHub: https://github.com/coinbase/x402
- Base Sepolia Faucet: https://www.coinbase.com/faucets
- Viem Docs: https://viem.sh
- Block Explorer: https://sepolia.basescan.org
