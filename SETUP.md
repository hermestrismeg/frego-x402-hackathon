# Setup Guide

## Prerequisites

1. Node.js v20 or higher
2. npm or pnpm
3. API Keys:
   - Anthropic API key (for AI agent)
   - GoShippo API token
   - Ethereum address (for receiving x402 payments)

## Quick Start

### 1. Install Dependencies

Already done! Dependencies are installed.

### 2. Configure Environment

Create a `.env` file from the example:

```bash
cp .env.example .env
```

Then edit `.env` and add your credentials:

```env
# Server Configuration
PORT=3000
SERVER_URL=http://localhost:3000

# x402 Payment Configuration
PAYMENT_ADDRESS=0xYourEthereumAddress
PAYMENT_NETWORK=base-sepolia
PAYMENT_PRICE=$0.001

# GoShippo API Configuration
SHIPPO_API_TOKEN=your_shippo_api_token_here

# AI Agent Configuration (Anthropic Claude)
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

### 3. Get API Keys

#### Anthropic API Key
1. Go to https://console.anthropic.com/
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key

#### GoShippo API Token
1. Go to https://goshippo.com/
2. Sign up for an account
3. Navigate to Settings > API
4. Copy your API token (use test token for development)

#### Ethereum Address
- Use any Ethereum address you control for receiving payments
- For testing on base-sepolia, you can use a testnet wallet

### 4. Run the Application

#### Start the Server

In one terminal:
```bash
npm run dev:server
```

This starts the Express server with x402 payment middleware on port 3000.

#### Use the CLI

In another terminal:
```bash
npm run dev:cli
```

This launches the interactive CLI where you can:
- Get shipping quotes for items
- Purchase shipping labels

## Usage Examples

### Interactive Mode (Default)

Just run:
```bash
npm run dev:cli
```

You'll be prompted to choose between getting quotes or purchasing a label.

### Get Shipping Quotes

```bash
npm run dev:cli quote
```

### Purchase a Shipping Label

```bash
npm run dev:cli label
```

## How It Works

1. **User Input**: You describe what you're shipping in natural language
   - Example: "A small laptop, about 3 pounds, fairly valuable"

2. **AI Processing**: Claude analyzes your description and extracts:
   - Weight and dimensions
   - Item category
   - Whether it's fragile
   - Estimated value

3. **Shipping Quotes**: The service queries GoShippo for available rates

4. **AI Recommendation**: Claude recommends the best shipping option based on:
   - Cost-effectiveness
   - Item fragility
   - Delivery speed
   - Item value

5. **x402 Payment**: The service requires payment via x402 protocol

6. **Label Generation**: Once paid, you receive a shipping label with tracking

## API Endpoints

### Health Check
```
GET /health
```
No payment required. Returns server status.

### Get Shipping Quotes
```
POST /api/shipping/quote
```
Requires x402 payment.

Request body:
```json
{
  "itemDescription": "A small laptop, about 3 pounds",
  "fromAddress": {
    "name": "John Seller",
    "street1": "123 Seller St",
    "city": "San Francisco",
    "state": "CA",
    "zip": "94103",
    "country": "US"
  },
  "toAddress": {
    "name": "Jane Buyer",
    "street1": "456 Buyer Ave",
    "city": "New York",
    "state": "NY",
    "zip": "10001",
    "country": "US"
  }
}
```

### Purchase Shipping Label
```
POST /api/shipping/label
```
Requires x402 payment.

Request body: Same as quote endpoint, optionally with `selectedRate` field.

## Troubleshooting

### Port Already in Use
If port 3000 is in use, change the PORT in `.env`

### API Key Issues
- Make sure all API keys in `.env` are valid
- For GoShippo, make sure you're using the test token during development

### x402 Payment Issues
- The current CLI implementation shows payment requirements but doesn't automatically process them
- For full x402 integration, you'll need to use `x402-fetch` client with wallet configuration

## Next Steps

To enable full x402 payment automation:
1. Set up a crypto wallet (MetaMask, etc.)
2. Configure `x402-fetch` client with wallet credentials
3. Update the CLI to use `x402-fetch` instead of regular fetch

## Development

### Build TypeScript
```bash
npm run build
```

### Run Production Build
```bash
npm start
```
