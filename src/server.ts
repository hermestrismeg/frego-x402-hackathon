import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { paymentMiddleware } from 'x402-express';
import { ShippoService } from './services/shippo';
import { AIAgent } from './services/ai-agent';
import { ShippingLabelRequest } from './types';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Initialize services
const shippoService = new ShippoService(process.env.SHIPPO_API_TOKEN || '');
const aiAgent = new AIAgent(process.env.ANTHROPIC_API_KEY || '');

app.use(express.json());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Health check endpoint (no payment required)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Shippo x402 AI Agent' });
});

// Apply x402 payment middleware to protected routes
const paymentAddress = (process.env.PAYMENT_ADDRESS || '') as `0x${string}`;
const paymentNetwork = process.env.PAYMENT_NETWORK || 'base-sepolia';
const paymentPrice = process.env.PAYMENT_PRICE || '$0.001';

app.use(
  paymentMiddleware(paymentAddress, {
    'POST /api/shipping/quote': {
      price: paymentPrice,
      network: paymentNetwork as any,
    },
    'POST /api/shipping/label': {
      price: paymentPrice,
      network: paymentNetwork as any,
    },
  })
);

// Get shipping quotes endpoint
app.post('/api/shipping/quote', async (req, res) => {
  try {
    const { itemDescription, fromAddress, toAddress } = req.body;

    if (!itemDescription || !fromAddress || !toAddress) {
      return res.status(400).json({
        error: 'Missing required fields: itemDescription, fromAddress, toAddress',
      });
    }

    // Use AI to parse item description
    console.log('Parsing item description with AI...');
    const parsedInfo = await aiAgent.parseItemDescription(itemDescription);
    console.log('Parsed info:', parsedInfo);

    // Create shipment and get rates
    console.log('Creating shipment and fetching rates...');
    const shipment = await shippoService.createShipment(
      fromAddress,
      toAddress,
      parsedInfo
    );

    const quotes = await shippoService.getShippingRates(shipment.object_id);
    console.log(`Found ${quotes.length} shipping quotes`);

    // Get AI recommendation
    const rawRates = shipment.rates || [];
    const recommendedRateId = await aiAgent.recommendShippingService(
      parsedInfo,
      rawRates
    );

    const recommendedQuote = quotes.find(q => q.rateId === recommendedRateId);

    res.json({
      parsedInfo,
      quotes,
      recommended: recommendedQuote,
      shipmentId: shipment.object_id,
    });
  } catch (error: any) {
    console.error('Error getting quotes:', error);
    res.status(500).json({
      error: 'Failed to get shipping quotes',
      message: error.message,
    });
  }
});

// Purchase shipping label endpoint
app.post('/api/shipping/label', async (req, res) => {
  try {
    const request: ShippingLabelRequest = req.body;

    if (!request.itemDescription || !request.fromAddress || !request.toAddress) {
      return res.status(400).json({
        error: 'Missing required fields',
      });
    }

    // Parse item if not already parsed
    let parsedInfo = request.parsedInfo;
    if (!parsedInfo) {
      console.log('Parsing item description with AI...');
      parsedInfo = await aiAgent.parseItemDescription(
        request.itemDescription.description
      );
    }

    console.log('Getting quotes and purchasing label...');
    const result = await shippoService.getQuotesAndPurchase(
      request.fromAddress,
      request.toAddress,
      parsedInfo,
      request.selectedRate
    );

    // Get AI recommendation if no rate selected
    let recommended;
    if (!request.selectedRate) {
      const shipment = await shippoService.createShipment(
        request.fromAddress,
        request.toAddress,
        parsedInfo
      );
      const rawRates = shipment.rates || [];
      const recommendedRateId = await aiAgent.recommendShippingService(
        parsedInfo,
        rawRates
      );
      recommended = result.quotes.find(q => q.rateId === recommendedRateId);
    }

    res.json({
      success: true,
      label: result.label,
      quotes: result.quotes,
      recommended,
      parsedInfo,
    });
  } catch (error: any) {
    console.error('Error purchasing label:', error);
    res.status(500).json({
      error: 'Failed to purchase shipping label',
      message: error.message,
    });
  }
});

// Simple payment verification (works with web browsers)
async function verifyPayment(txHash: string, expectedRecipient: string, minAmount: string) {
  // In production, verify on-chain. For hackathon, we'll accept any valid txHash format
  if (txHash && txHash.startsWith('0x') && txHash.length === 66) {
    console.log(`Payment verified: ${txHash} to ${expectedRecipient}`);
    return true;
  }
  return false;
}

// Web UI endpoint with simple payment check
app.post('/api/web/shipping/quote', async (req, res) => {
  const paymentTx = req.headers['x-payment-tx'] as string;

  // Check if payment provided
  if (!paymentTx) {
    // Return 402 with payment requirements
    return res.status(402).json({
      error: 'Payment required',
      paymentRequired: {
        amount: '0.001',
        currency: 'USDC',
        network: 'base-sepolia',
        recipient: paymentAddress,
        usdcContract: '0x036CbD53842c5426634e7929541eC2318f3dCF7e'
      }
    });
  }

  // Verify payment
  if (!await verifyPayment(paymentTx, paymentAddress, '1000')) {
    return res.status(402).json({
      error: 'Invalid payment',
      message: 'Payment verification failed'
    });
  }

  // Payment verified, process request
  try {
    const { itemDescription, fromAddress, toAddress } = req.body;

    if (!itemDescription || !fromAddress || !toAddress) {
      return res.status(400).json({
        error: 'Missing required fields: itemDescription, fromAddress, toAddress',
      });
    }

    console.log('Web UI: Parsing item description with AI...');
    const parsedInfo = await aiAgent.parseItemDescription(itemDescription);
    console.log('Web UI: Parsed info:', parsedInfo);

    console.log('Web UI: Creating shipment and fetching rates...');
    const shipment = await shippoService.createShipment(
      fromAddress,
      toAddress,
      parsedInfo
    );

    const quotes = await shippoService.getShippingRates(shipment.object_id);
    console.log(`Web UI: Found ${quotes.length} shipping quotes`);

    const rawRates = shipment.rates || [];
    const recommendedRateId = await aiAgent.recommendShippingService(
      parsedInfo,
      rawRates
    );

    const recommendedQuote = quotes.find(q => q.rateId === recommendedRateId);

    res.json({
      parsedInfo,
      quotes,
      recommended: recommendedQuote,
      shipmentId: shipment.object_id,
    });
  } catch (error: any) {
    console.error('Web UI: Error getting quotes:', error);
    res.status(500).json({
      error: 'Failed to get shipping quotes',
      message: error.message,
    });
  }
});

// Web UI label purchase endpoint
app.post('/api/web/shipping/label', async (req, res) => {
  const paymentTx = req.headers['x-payment-tx'] as string;

  // Check if payment provided
  if (!paymentTx) {
    return res.status(402).json({
      error: 'Payment required',
      paymentRequired: {
        amount: '0.001',
        currency: 'USDC',
        network: 'base-sepolia',
        recipient: paymentAddress,
        usdcContract: '0x036CbD53842c5426634e7929541eC2318f3dCF7e'
      }
    });
  }

  // Verify payment
  if (!await verifyPayment(paymentTx, paymentAddress, '1000')) {
    return res.status(402).json({
      error: 'Invalid payment',
      message: 'Payment verification failed'
    });
  }

  // Payment verified, process label purchase
  try {
    const { rateId, carrier, service, price } = req.body;

    if (!rateId) {
      return res.status(400).json({
        error: 'Missing required field: rateId',
      });
    }

    console.log('Web UI: Purchasing label for rate:', rateId);

    // Purchase the label
    const label = await shippoService.purchaseLabel(rateId);

    res.json({
      success: true,
      label: {
        labelUrl: label.labelUrl,
        trackingNumber: label.trackingNumber,
        carrier: carrier || label.carrier,  // Use frontend data if available
        service: service || label.service,
        cost: price || label.cost,
        paymentTxHash: paymentTx,  // Include payment transaction hash
      }
    });
  } catch (error: any) {
    console.error('Web UI: Error purchasing label:', error);
    res.status(500).json({
      error: 'Failed to purchase shipping label',
      message: error.message,
    });
  }
});

// Only start server if not in Vercel (Vercel handles this automatically)
if (process.env.VERCEL !== '1') {
  app.listen(port, () => {
    console.log(`🚀 Shippo x402 AI Agent server running on port ${port}`);
    console.log(`💰 Payment address: ${paymentAddress}`);
    console.log(`🌐 Network: ${paymentNetwork}`);
    console.log(`💵 Price per request: ${paymentPrice}`);
    console.log(`\nEndpoints:`);
    console.log(`  GET  /health - Health check (no payment required)`);
    console.log(`  GET  / - Web UI`);
    console.log(`  POST /api/web/shipping/quote - Web UI quotes (requires $0.001 USDC)`);
    console.log(`  POST /api/web/shipping/label - Web UI label purchase (requires $0.001 USDC)`);
    console.log(`  POST /api/shipping/quote - CLI quotes (requires x402 payment)`);
    console.log(`  POST /api/shipping/label - CLI label purchase (requires x402 payment)`);
  });
}

// Export for Vercel
export default app;
