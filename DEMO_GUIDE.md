# Demo Guide - Shippo x402 AI Shipping Agent

## Two Ways to Demo

### 1. Web UI (Best for Quick Demo)

**Start:**
```bash
npm run dev:server
```

**Open:** http://localhost:3000

**Features:**
- ✅ Beautiful web interface
- ✅ AI-powered item analysis
- ✅ Real shipping quotes from USPS/UPS/FedEx
- ✅ AI recommendations
- ❌ No payment (free for demo)

**Great for:**
- Quick demonstrations
- Showing the AI features
- Testing the Shippo integration
- Non-technical audience

---

### 2. CLI (Shows Full x402 Payment)

**Start server:**
```bash
npm run dev:server
```

**Run CLI (in another terminal):**
```bash
npm run dev:cli
```

**Features:**
- ✅ Full x402 payment integration
- ✅ Automatic USDC payment ($0.001)
- ✅ On-chain verification
- ✅ All AI and shipping features

**Requirements:**
- Wallet with Base Sepolia USDC
- Base Sepolia ETH for gas

**Great for:**
- Showing x402 payment protocol
- Technical demonstrations
- Blockchain integration showcase

---

## Demo Script

### Web UI Demo (2 minutes)

1. **Open browser** → http://localhost:3000
2. **Connect wallet** → Click "Connect Wallet", approve MetaMask
3. **Show the form** → Point out the natural language input
4. **Enter item**: "A laptop, 3 pounds, valuable electronics"
5. **Fill addresses** → Use defaults or real addresses
6. **Submit** → Watch the loading states
7. **Show results**:
   - AI parsed: weight, dimensions, category, fragility
   - Multiple shipping quotes from carriers
   - AI recommendation (⭐ marked)
   - Prices sorted cheapest first

**Key Points:**
- "Describe in natural language, AI figures out the details"
- "Real rates from USPS, UPS, FedEx via Shippo API"
- "AI recommends based on item characteristics"

---

### CLI Demo (3 minutes)

1. **Show server running** with payment config
2. **Run CLI** → `npm run dev:cli`
3. **Choose "Get Shipping Quotes"**
4. **Enter item**: "A fragile laptop, about 3 pounds, worth $800"
5. **Fill addresses** → Use defaults or custom
6. **Payment prompt** → "Making x402 payment..."
7. **Show transaction**:
   - MetaMask signing
   - On-chain USDC transfer
   - Payment verification
8. **Show results** → Same as web UI

**Key Points:**
- "x402 payment: $0.001 USDC automatically"
- "Payment verified on Base Sepolia blockchain"
- "Server only responds after payment confirmed"

---

## Architecture Demo

Show the code structure:

```
User → Web UI/CLI
  ↓
  ↓ HTTP 402 Payment Required
  ↓
x402 Payment ($0.001 USDC)
  ↓
  ↓ Payment Verified
  ↓
Claude AI (parses description)
  ↓
  ↓ Item details extracted
  ↓
Shippo API (gets real rates)
  ↓
  ↓ Returns quotes
  ↓
Claude AI (recommends best option)
  ↓
User gets results
```

---

## Technical Highlights

### x402 Payment Protocol
- HTTP 402 (Payment Required) status
- USDC on Base Sepolia
- Automatic payment handling
- On-chain verification

### AI Integration
- Natural language processing
- Automatic weight/dimension extraction
- Category classification
- Smart recommendations

### Shipping Integration
- Real-time rates via Shippo
- Multiple carriers (USDS, UPS, FedEx, DHL)
- Different service levels
- Actual shipping label generation

---

## Troubleshooting Demo Issues

### Web UI Issues
- **"Connect Wallet" doesn't work**: Refresh page
- **"No quotes found"**: Check server logs for Shippo errors
- **Blank page**: Check browser console, restart server

### CLI Issues
- **"Insufficient funds"**: Need Base Sepolia USDC
- **"Payment failed"**: Check wallet has ETH for gas
- **"API error"**: Check .env has valid API keys

### Quick Fixes
```bash
# Restart server
Ctrl+C
npm run dev:server

# Check logs
# Server terminal shows detailed logs

# Verify .env
cat .env | grep -E "SHIPPO|ANTHROPIC|PAYMENT"
```

---

## Best Demo Flow

1. **Start with Web UI** (easier, visual)
   - Show the beautiful interface
   - Demonstrate AI analysis
   - Show real shipping quotes

2. **Then show CLI** (technical depth)
   - Open terminal side-by-side
   - Run same query
   - Show payment transaction
   - Open block explorer to verify

3. **Show the code** (if technical audience)
   - `src/server.ts` - x402 middleware
   - `src/services/ai-agent.ts` - Claude integration
   - `src/services/shippo.ts` - Shipping API
   - `public/` - Web UI

---

## Demo Tips

- **Practice once** before presenting
- **Have .env configured** with valid keys
- **Pre-fund wallet** with testnet USDC
- **Keep block explorer open** (https://sepolia.basescan.org)
- **Use interesting items** ("fragile antique vase" vs "box")
- **Show different addresses** (CA→NY different than CA→CA)

---

## Questions to Anticipate

**Q: Why x402 instead of traditional payment?**
A: Instant settlement, no chargebacks, programmable, global

**Q: Why USDC?**
A: Stablecoin = predictable pricing, widely supported

**Q: Can this work on mainnet?**
A: Yes! Just change network to Base mainnet and use real USDC

**Q: How accurate is the AI?**
A: Very good for standard items, may need manual adjustment for unusual items

**Q: How does Shippo work?**
A: They aggregate carrier APIs - we get real rates from all major carriers

**Q: What's the cost?**
A: Shippo API is free tier, x402 payment is $0.001, shipping label costs actual rate

---

## Success Metrics

Track for your demo:
- Number of successful quotes retrieved
- AI accuracy on item parsing
- Payment success rate
- Average time to complete flow

---

## Post-Demo

Show the GitHub repo structure:
```
x402-hackathon/
├── public/          # Web UI
├── src/
│   ├── server.ts    # Express + x402
│   ├── cli.ts       # CLI client
│   └── services/    # AI + Shippo
├── .env            # Configuration
└── README.md       # Documentation
```

**Next steps for production:**
- Use mainnet instead of testnet
- Add label purchasing endpoint
- Implement webhook for shipping updates
- Add user accounts and history
- Scale AI prompts for accuracy
