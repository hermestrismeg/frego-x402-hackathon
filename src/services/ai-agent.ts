import Anthropic from '@anthropic-ai/sdk';
import { ParsedItemInfo } from '../types';

export class AIAgent {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async parseItemDescription(description: string): Promise<ParsedItemInfo> {
    const prompt = `You are a shipping expert AI. Parse the following item description and extract shipping-relevant information.

Item description: "${description}"

Extract and provide the following information in JSON format:
- weight (estimate in pounds if not specified)
- weightUnit (lb or kg)
- dimensions (length, width, height in inches if mentioned)
- value (estimated dollar value if not specified, make a reasonable guess)
- category (e.g., electronics, clothing, books, fragile items, etc.)
- fragile (true/false)

Respond ONLY with valid JSON, no other text.

Example format:
{
  "weight": 2.5,
  "weightUnit": "lb",
  "dimensions": {
    "length": 10,
    "width": 8,
    "height": 3,
    "unit": "in"
  },
  "value": 50,
  "category": "electronics",
  "fragile": true
}`;

    try {
      const message = await this.client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const content = message.content[0];
      if (content.type === 'text') {
        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return parsed;
        }
      }

      throw new Error('Failed to parse AI response');
    } catch (error) {
      console.error('AI parsing error:', error);
      // Fallback to basic defaults
      return {
        weight: 1,
        weightUnit: 'lb',
        value: 20,
        category: 'general',
        fragile: false,
      };
    }
  }

  async recommendShippingService(
    parsedInfo: ParsedItemInfo,
    quotes: any[]
  ): Promise<string> {
    const quotesInfo = quotes
      .map(
        (q, i) =>
          `${i + 1}. ${q.provider} - ${q.servicelevel.name}: $${q.amount} (${q.estimated_days} days)`
      )
      .join('\n');

    const prompt = `You are a shipping advisor. Based on the item details and available shipping quotes, recommend the best option.

Item details:
- Weight: ${parsedInfo.weight} ${parsedInfo.weightUnit}
- Category: ${parsedInfo.category}
- Fragile: ${parsedInfo.fragile ? 'Yes' : 'No'}
- Value: $${parsedInfo.value}

Available shipping options:
${quotesInfo}

Consider:
1. Cost-effectiveness
2. Speed vs. price balance
3. Reliability for the item type
4. Item fragility and value

Respond with ONLY the number (1, 2, 3, etc.) of your recommended option. No explanation needed.`;

    try {
      const message = await this.client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 10,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const content = message.content[0];
      if (content.type === 'text') {
        const match = content.text.match(/\d+/);
        if (match) {
          const index = parseInt(match[0], 10) - 1;
          if (index >= 0 && index < quotes.length) {
            return quotes[index].object_id;
          }
        }
      }
    } catch (error) {
      console.error('AI recommendation error:', error);
    }

    // Fallback: return the cheapest option
    const cheapest = quotes.reduce((min, q) =>
      parseFloat(q.amount) < parseFloat(min.amount) ? q : min
    );
    return cheapest.object_id;
  }
}
