# Shippo x402 AI Agent

An AI-powered shipping label service that accepts x402 payments. This tool helps e-commerce sellers get the best shipping labels at great prices through an intelligent agent.

## Features

- 🤖 AI agent processes natural language item descriptions
- 📦 Integration with GoShippo API for shipping labels
- 💰 x402 payment protocol for seamless crypto payments
- 🖥️ Simple command-line interface

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env with your credentials
```

3. Build the project:
```bash
npm run build
```

## Running

### Start the Server
```bash
npm run dev:server
```

### Use the CLI Client
```bash
npm run dev:cli
```

## Configuration

Edit `.env` file with:
- Your Ethereum address for x402 payments
- GoShippo API token
- Anthropic API key for AI agent

## How It Works

1. User describes their shipping item via CLI
2. AI agent processes the description and extracts details
3. Service queries GoShippo for best shipping rates
4. x402 payment is processed
5. Shipping label is generated and returned
