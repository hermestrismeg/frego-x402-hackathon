#!/usr/bin/env node

import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import dotenv from 'dotenv';
import { Address } from './types';

dotenv.config();

const program = new Command();

// For now, we'll use regular fetch since x402-fetch requires payment setup
async function makeRequest(endpoint: string, data: any): Promise<any> {
  const serverUrl = process.env.SERVER_URL || 'http://localhost:3000';
  const url = `${serverUrl}${endpoint}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (response.status === 402) {
      // Payment required
      const paymentInfo: any = await response.json();
      console.log(chalk.yellow('\n💰 Payment Required'));
      console.log(chalk.yellow('━'.repeat(50)));
      console.log(chalk.yellow('This service requires x402 payment to continue.'));
      console.log(chalk.cyan(`Amount: ${paymentInfo.paymentRequirements?.price || 'N/A'}`));
      console.log(chalk.cyan(`Network: ${paymentInfo.paymentRequirements?.network || 'N/A'}`));
      console.log(chalk.cyan(`Recipient: ${paymentInfo.paymentRequirements?.recipient || 'N/A'}`));
      console.log(chalk.yellow('\nTo enable automatic payments, configure x402-fetch client.'));
      console.log(chalk.yellow('For this demo, payment is simulated.\n'));
      return null;
    }

    if (!response.ok) {
      const error: any = await response.json();
      throw new Error(error.message || 'Request failed');
    }

    return await response.json();
  } catch (error: any) {
    console.error(chalk.red(`Error: ${error.message}`));
    return null;
  }
}

async function promptForAddress(type: 'from' | 'to'): Promise<Address> {
  const title = type === 'from' ? 'Sender' : 'Recipient';
  console.log(chalk.blue(`\n${title} Address:`));

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: `${title} name:`,
      default: type === 'from' ? 'John Seller' : 'Jane Buyer',
    },
    {
      type: 'input',
      name: 'street1',
      message: 'Street address:',
      default: type === 'from' ? '123 Seller St' : '456 Buyer Ave',
    },
    {
      type: 'input',
      name: 'city',
      message: 'City:',
      default: type === 'from' ? 'San Francisco' : 'New York',
    },
    {
      type: 'input',
      name: 'state',
      message: 'State (2 letter code):',
      default: type === 'from' ? 'CA' : 'NY',
    },
    {
      type: 'input',
      name: 'zip',
      message: 'ZIP code:',
      default: type === 'from' ? '94103' : '10001',
    },
    {
      type: 'input',
      name: 'country',
      message: 'Country (2 letter code):',
      default: 'US',
    },
  ]);

  return answers;
}

async function getQuote() {
  console.log(chalk.green.bold('\n📦 Get Shipping Quote'));
  console.log(chalk.green('━'.repeat(50)));

  // Get item description
  const { itemDescription } = await inquirer.prompt([
    {
      type: 'input',
      name: 'itemDescription',
      message: 'Describe the item you want to ship:',
      default: 'A small laptop, about 3 pounds, fairly valuable',
    },
  ]);

  // Get addresses
  const fromAddress = await promptForAddress('from');
  const toAddress = await promptForAddress('to');

  console.log(chalk.yellow('\n⏳ Processing request...'));

  const result = await makeRequest('/api/shipping/quote', {
    itemDescription,
    fromAddress,
    toAddress,
  });

  if (result) {
    console.log(chalk.green('\n✅ Shipping Quotes Retrieved!'));
    console.log(chalk.green('━'.repeat(50)));

    console.log(chalk.cyan('\n🤖 AI Parsed Item Info:'));
    console.log(`  Weight: ${result.parsedInfo.weight} ${result.parsedInfo.weightUnit}`);
    if (result.parsedInfo.dimensions) {
      console.log(`  Dimensions: ${result.parsedInfo.dimensions.length}x${result.parsedInfo.dimensions.width}x${result.parsedInfo.dimensions.height} ${result.parsedInfo.dimensions.unit}`);
    }
    console.log(`  Category: ${result.parsedInfo.category}`);
    console.log(`  Fragile: ${result.parsedInfo.fragile ? 'Yes' : 'No'}`);
    console.log(`  Estimated Value: $${result.parsedInfo.value}`);

    console.log(chalk.cyan('\n📋 Available Shipping Options:'));
    result.quotes.forEach((quote: any, index: number) => {
      const isRecommended = result.recommended?.rateId === quote.rateId;
      const marker = isRecommended ? chalk.yellow('⭐ RECOMMENDED') : '';
      console.log(`\n  ${index + 1}. ${quote.carrier} - ${quote.serviceName} ${marker}`);
      console.log(`     💵 Price: $${quote.price} ${quote.currency}`);
      console.log(`     📅 Estimated: ${quote.estimatedDays} days`);
      console.log(`     🔑 Rate ID: ${quote.rateId}`);
    });

    console.log(chalk.green('\n━'.repeat(50)));
  }
}

async function purchaseLabel() {
  console.log(chalk.green.bold('\n🏷️  Purchase Shipping Label'));
  console.log(chalk.green('━'.repeat(50)));

  const { itemDescription } = await inquirer.prompt([
    {
      type: 'input',
      name: 'itemDescription',
      message: 'Describe the item you want to ship:',
      default: 'A small laptop, about 3 pounds, fairly valuable',
    },
  ]);

  const fromAddress = await promptForAddress('from');
  const toAddress = await promptForAddress('to');

  console.log(chalk.yellow('\n⏳ Processing request and purchasing label...'));

  const result = await makeRequest('/api/shipping/label', {
    itemDescription: { description: itemDescription },
    fromAddress,
    toAddress,
  });

  if (result && result.success) {
    console.log(chalk.green('\n✅ Shipping Label Purchased!'));
    console.log(chalk.green('━'.repeat(50)));

    console.log(chalk.cyan('\n📊 Label Details:'));
    console.log(`  🚚 Carrier: ${result.label.carrier}`);
    console.log(`  📦 Service: ${result.label.service}`);
    console.log(`  💵 Cost: $${result.label.cost}`);
    console.log(`  🔢 Tracking: ${result.label.trackingNumber}`);
    console.log(`  🔗 Label URL: ${result.label.labelUrl}`);

    console.log(chalk.cyan('\n🤖 AI Parsed Item:'));
    console.log(`  Weight: ${result.parsedInfo.weight} ${result.parsedInfo.weightUnit}`);
    console.log(`  Category: ${result.parsedInfo.category}`);

    if (result.recommended) {
      console.log(chalk.yellow('\n⭐ AI Recommendation:'));
      console.log(`  This was the AI-recommended option based on your item details.`);
    }

    console.log(chalk.green('\n━'.repeat(50)));
  }
}

program
  .name('shippo-x402')
  .description('AI-powered shipping label service with x402 payments')
  .version('1.0.0');

program
  .command('quote')
  .description('Get shipping quotes for an item')
  .action(getQuote);

program
  .command('label')
  .description('Purchase a shipping label')
  .action(purchaseLabel);

program
  .command('interactive')
  .description('Interactive mode - choose action')
  .action(async () => {
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: '📋 Get Shipping Quotes', value: 'quote' },
          { name: '🏷️  Purchase Shipping Label', value: 'label' },
        ],
      },
    ]);

    if (action === 'quote') {
      await getQuote();
    } else {
      await purchaseLabel();
    }
  });

// Default to interactive mode
if (process.argv.length === 2) {
  program.parse(['node', 'cli', 'interactive']);
} else {
  program.parse();
}
