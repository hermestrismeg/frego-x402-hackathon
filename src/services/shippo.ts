import axios from 'axios';
import { Address, ParsedItemInfo, ShippingQuote } from '../types';

export class ShippoService {
  private apiToken: string;
  private baseUrl = 'https://api.goshippo.com';

  constructor(apiToken: string) {
    this.apiToken = apiToken;
  }

  private get headers() {
    return {
      Authorization: `ShippoToken ${this.apiToken}`,
      'Content-Type': 'application/json',
    };
  }

  async createShipment(
    fromAddress: Address,
    toAddress: Address,
    parcel: ParsedItemInfo
  ) {
    try {
      const shipmentData = {
        address_from: {
          name: fromAddress.name,
          street1: fromAddress.street1,
          street2: fromAddress.street2 || '',
          city: fromAddress.city,
          state: fromAddress.state,
          zip: fromAddress.zip,
          country: fromAddress.country,
          email: fromAddress.email || 'sender@example.com',
          phone: fromAddress.phone || '+1 555-123-4567',
        },
        address_to: {
          name: toAddress.name,
          street1: toAddress.street1,
          street2: toAddress.street2 || '',
          city: toAddress.city,
          state: toAddress.state,
          zip: toAddress.zip,
          country: toAddress.country,
          email: toAddress.email || 'recipient@example.com',
          phone: toAddress.phone || '+1 555-987-6543',
        },
        parcels: [
          {
            length: parcel.dimensions?.length?.toString() || '10',
            width: parcel.dimensions?.width?.toString() || '8',
            height: parcel.dimensions?.height?.toString() || '4',
            distance_unit: parcel.dimensions?.unit || 'in',
            weight: parcel.weight.toString(),
            mass_unit: parcel.weightUnit,
          },
        ],
        async: false,
      };

      console.log('Creating Shippo shipment with data:', JSON.stringify(shipmentData, null, 2));

      const response = await axios.post(
        `${this.baseUrl}/shipments/`,
        shipmentData,
        { headers: this.headers }
      );

      console.log('Shippo shipment created. Object ID:', response.data.object_id);
      console.log('Number of rates returned:', response.data.rates?.length || 0);

      if (response.data.rates && response.data.rates.length > 0) {
        console.log('Rate details:', response.data.rates.map((r: any) => ({
          provider: r.provider,
          service: r.servicelevel?.name,
          amount: r.amount,
          available: r.available,
          messages: r.messages
        })));
      }

      if (response.data.messages && response.data.messages.length > 0) {
        console.log('Shippo messages:', response.data.messages);
      }

      return response.data;
    } catch (error: any) {
      console.error('Shippo API error:', error.response?.data || error.message);
      throw new Error('Failed to create shipment');
    }
  }

  async getShippingRates(shipmentId: string): Promise<ShippingQuote[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/shipments/${shipmentId}`, {
        headers: this.headers,
      });

      const rates = response.data.rates || [];
      console.log(`Total rates from API: ${rates.length}`);

      // Filter for USPS only (test accounts only support USPS)
      const uspsRates = rates.filter((rate: any) => rate.provider === 'USPS');
      console.log(`USPS rates: ${uspsRates.length}`);

      // Filter out only rates that are explicitly unavailable (available === false)
      // If available is undefined or true, consider the rate as available
      const availableRates = uspsRates.filter((rate: any) => rate.available !== false);
      console.log(`Available USPS rates: ${availableRates.length}`);

      if (rates.length > 0 && availableRates.length === 0) {
        console.log('Rates exist but none are available. Checking reasons:');
        rates.forEach((rate: any, idx: number) => {
          console.log(`Rate ${idx + 1}:`, {
            provider: rate.provider,
            service: rate.servicelevel?.name,
            available: rate.available,
            messages: rate.messages,
          });
        });
      }

      return availableRates
        .map((rate: any) => ({
          carrier: rate.provider,
          serviceName: rate.servicelevel.name,
          price: rate.amount,
          currency: rate.currency,
          estimatedDays: rate.estimated_days || 0,
          rateId: rate.object_id,
        }))
        .sort((a: ShippingQuote, b: ShippingQuote) =>
          parseFloat(a.price) - parseFloat(b.price)
        );
    } catch (error: any) {
      console.error('Error fetching rates:', error.response?.data || error.message);
      throw new Error('Failed to get shipping rates');
    }
  }

  async purchaseLabel(rateId: string) {
    try {
      console.log('Purchasing label for rate ID:', rateId);

      const response = await axios.post(
        `${this.baseUrl}/transactions/`,
        {
          rate: rateId,
          label_file_type: 'PDF',
          async: false,
        },
        { headers: this.headers }
      );

      const transaction = response.data;
      console.log('Transaction response:', JSON.stringify(transaction, null, 2));

      // Check transaction status
      if (transaction.status !== 'SUCCESS') {
        console.error('Transaction failed:', transaction.messages);
        throw new Error(`Transaction status: ${transaction.status}`);
      }

      return {
        labelUrl: transaction.label_url,
        trackingNumber: transaction.tracking_number,
        carrier: transaction.rate?.provider || 'Unknown',
        service: transaction.rate?.servicelevel?.name || transaction.servicelevel?.name || 'Unknown Service',
        cost: transaction.rate?.amount || transaction.amount || '0',
      };
    } catch (error: any) {
      console.error('Label purchase error:', error.response?.data || error.message);
      if (error.response?.data) {
        console.error('Shippo error details:', JSON.stringify(error.response.data, null, 2));
      }
      throw new Error('Failed to purchase shipping label: ' + (error.response?.data?.messages?.[0]?.text || error.message));
    }
  }

  async getQuotesAndPurchase(
    fromAddress: Address,
    toAddress: Address,
    parcel: ParsedItemInfo,
    rateId?: string
  ) {
    // Create shipment
    const shipment = await this.createShipment(fromAddress, toAddress, parcel);

    // Get rates
    const quotes = await this.getShippingRates(shipment.object_id);

    if (quotes.length === 0) {
      throw new Error('No shipping rates available');
    }

    // Use provided rate or default to cheapest
    const selectedRateId = rateId || quotes[0].rateId;

    // Purchase label
    const label = await this.purchaseLabel(selectedRateId);

    return {
      quotes,
      label,
    };
  }
}
