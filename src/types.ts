export interface ItemDescription {
  description: string;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: 'in' | 'cm';
  };
  value?: number;
  fromAddress?: Address;
  toAddress?: Address;
}

export interface Address {
  name: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  email?: string;
  phone?: string;
}

export interface ParsedItemInfo {
  weight: number;
  weightUnit: 'lb' | 'kg';
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: 'in' | 'cm';
  };
  value?: number;
  category?: string;
  fragile?: boolean;
}

export interface ShippingQuote {
  carrier: string;
  serviceName: string;
  price: string;
  currency: string;
  estimatedDays: number;
  rateId: string;
}

export interface ShippingLabelRequest {
  itemDescription: ItemDescription;
  parsedInfo: ParsedItemInfo;
  fromAddress: Address;
  toAddress: Address;
  selectedRate?: string;
}

export interface ShippingLabelResponse {
  labelUrl: string;
  trackingNumber: string;
  carrier: string;
  service: string;
  cost: string;
  quotes: ShippingQuote[];
}
