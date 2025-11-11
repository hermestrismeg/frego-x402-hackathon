import { wrapFetchWithPayment } from 'x402-fetch';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import { Address, ShippingQuote } from './types';

export interface QuoteRequest {
  itemDescription: string;
  fromAddress: Address;
  toAddress: Address;
}

export interface QuoteResponse {
  parsedInfo: any;
  quotes: ShippingQuote[];
  recommended?: ShippingQuote;
  shipmentId: string;
}

export interface LabelRequest {
  itemDescription: { description: string };
  fromAddress: Address;
  toAddress: Address;
  parsedInfo?: any;
  selectedRate?: string;
}

export interface LabelResponse {
  success: boolean;
  label: {
    labelUrl: string;
    trackingNumber: string;
    carrier: string;
    service: string;
    cost: string;
  };
  quotes: ShippingQuote[];
  recommended?: ShippingQuote;
  parsedInfo: any;
}

export class ShippoX402Client {
  private serverUrl: string;
  private fetchWithPayment: typeof fetch;

  constructor(serverUrl: string, privateKey: string) {
    this.serverUrl = serverUrl;

    // Create wallet account from private key
    const account = privateKeyToAccount(privateKey as `0x${string}`);

    // Create wallet client for Base Sepolia
    const walletClient = createWalletClient({
      account,
      transport: http(),
      chain: baseSepolia,
    });

    // Wrap fetch with payment handling
    this.fetchWithPayment = wrapFetchWithPayment(fetch, walletClient as any);
  }

  async getQuotes(request: QuoteRequest): Promise<QuoteResponse | null> {
    try {
      console.log('Making request to:', `${this.serverUrl}/api/shipping/quote`);
      const response = await this.fetchWithPayment(`${this.serverUrl}/api/shipping/quote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response body:', errorText);
        let errorMsg = 'Failed to get quotes';
        try {
          const errorJson = JSON.parse(errorText);
          errorMsg = errorJson.message || errorJson.error || errorMsg;
        } catch (e) {
          errorMsg = errorText || errorMsg;
        }
        throw new Error(errorMsg);
      }

      return (await response.json()) as QuoteResponse;
    } catch (error: any) {
      console.error('Error details:', error);
      console.error('Error stack:', error.stack);
      throw error;
    }
  }

  async purchaseLabel(request: LabelRequest): Promise<LabelResponse | null> {
    try {
      console.log('Making request to:', `${this.serverUrl}/api/shipping/label`);
      const response = await this.fetchWithPayment(`${this.serverUrl}/api/shipping/label`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response body:', errorText);
        let errorMsg = 'Failed to purchase label';
        try {
          const errorJson = JSON.parse(errorText);
          errorMsg = errorJson.message || errorJson.error || errorMsg;
        } catch (e) {
          errorMsg = errorText || errorMsg;
        }
        throw new Error(errorMsg);
      }

      return (await response.json()) as LabelResponse;
    } catch (error: any) {
      console.error('Error details:', error);
      console.error('Error stack:', error.stack);
      throw error;
    }
  }
}
