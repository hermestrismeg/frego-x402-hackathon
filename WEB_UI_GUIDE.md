# Web UI Guide

## Quick Start

1. **Start the server:**
   ```bash
   npm run dev:server
   ```

2. **Open your browser:**
   ```
   http://localhost:3000
   ```

3. **Connect your wallet** (MetaMask or any Web3 wallet)

4. **Get shipping quotes!**

## How It Works

### 1. Connect Wallet
- Click "Connect Wallet"
- Approve the connection in MetaMask
- The app will automatically switch you to Base Sepolia network
- If you don't have Base Sepolia added, it will add it for you

### 2. Fill Out Form
- **Item Description**: Describe what you're shipping in natural language
  - Example: "A laptop, about 3 pounds, fairly valuable"
  - The AI will analyze this and extract weight, dimensions, category, etc.

- **From Address**: Where you're shipping from
- **To Address**: Where you're shipping to

### 3. Payment Flow
When you click "Get Shipping Quotes":

1. **First Request** → Server returns 402 Payment Required
2. **Payment Prompt** → MetaMask asks you to approve $0.001 USDC payment
3. **Payment Sent** → Transaction submitted to Base Sepolia
4. **Retry Request** → App retries with payment proof
5. **Results** → You see your shipping quotes!

### 4. View Results
- **AI Analysis**: See how Claude analyzed your item
- **Shipping Quotes**: Compare rates from different carriers
- **AI Recommendation**: ⭐ marked quote is AI-recommended based on your item

## Requirements

### Wallet Setup
- Install MetaMask: https://metamask.io/
- Your wallet needs:
  - Base Sepolia ETH (for gas fees)
  - Base Sepolia USDC (for x402 payment)

### Getting Test Funds
1. **ETH**: https://www.coinbase.com/faucets
2. **USDC**: Bridge or swap from ETH on Base Sepolia testnet

## Features

### x402 Payment
- Payments are made in USDC on Base Sepolia
- Cost: $0.001 per quote request
- Automatic payment handling through MetaMask
- Transaction confirmation before proceeding

### AI Features
- **Smart Parsing**: Understands natural language item descriptions
- **Auto-Extraction**: Weight, dimensions, category, fragility
- **Smart Recommendations**: Picks best shipping option for your item

### Shipping Integration
- Real rates from USPS, UPS, FedEx, DHL
- Multiple service levels (Ground, Priority, Express)
- Estimated delivery times
- Sorted by price (cheapest first)

## UI Features

- **Responsive Design**: Works on desktop and mobile
- **Real-time Status**: See connection and payment status
- **Error Handling**: Clear error messages
- **Loading States**: Visual feedback during processing
- **Beautiful Design**: Modern, gradient UI

## Troubleshooting

### "Please install MetaMask"
- Install MetaMask browser extension
- Or use another Web3 wallet

### "Insufficient USDC"
- You need at least 0.001 USDC on Base Sepolia
- Get USDC from a testnet faucet or DEX

### "Payment failed"
- Check you have enough ETH for gas
- Make sure you're on Base Sepolia network
- Try approving the transaction again

### "No shipping quotes found"
- Check server logs for Shippo API errors
- Verify addresses are valid US addresses
- Ensure Shippo API token is valid

## Architecture

```
Browser (Web UI)
    ↓
    ↓ POST /api/shipping/quote
    ↓
Server (Express + x402)
    ↓
    ↓ Returns 402 Payment Required
    ↓
Browser
    ↓
    ↓ Makes USDC payment via MetaMask
    ↓
    ↓ Retries with X-PAYMENT header
    ↓
Server
    ↓
    ↓ Verifies payment on-chain
    ↓
    ↓ Calls Claude AI
    ↓
    ↓ Calls Shippo API
    ↓
    ↓ Returns shipping quotes
    ↓
Browser (Display results)
```

## Development

### File Structure
```
public/
  ├── index.html    # Main HTML page
  ├── styles.css    # Styling
  └── app.js        # JavaScript app logic

src/
  └── server.ts     # Express server with x402
```

### Customization

**Change payment amount**: Edit `.env`
```
PAYMENT_PRICE=$0.005
```

**Modify styling**: Edit `public/styles.css`

**Add features**: Edit `public/app.js`

## Security Notes

⚠️ **Important**:
- Never share your private keys
- Use testnet only for this demo
- Don't use real funds
- The payment proof implementation is simplified for demo purposes

## Next Steps

1. Try different item descriptions
2. Compare shipping quotes
3. See how AI analyzes different items
4. Test with different addresses

## Support

- Check server logs for detailed errors
- Open browser console for client-side errors
- Verify all credentials in `.env`
- Ensure wallet has sufficient funds

Enjoy your AI-powered shipping agent! 🚀📦
