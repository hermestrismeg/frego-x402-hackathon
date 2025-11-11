#!/usr/bin/env node

import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import dotenv from 'dotenv';
import { Address } from './types';
import { ShippoX402Client } from './client';

dotenv.config();

const program = new Command();

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

  // Check for private key
  const privateKey = process.env.WALLET_PRIVATE_KEY;
  if (!privateKey) {
    console.log(chalk.red('\n❌ Error: WALLET_PRIVATE_KEY not set in .env'));
    console.log(chalk.yellow('Please add your wallet private key to .env file'));
    console.log(chalk.yellow('See SETUP.md for instructions\n'));
    return;
  }

  const serverUrl = process.env.SERVER_URL || 'http://localhost:3000';
  const client = new ShippoX402Client(serverUrl, privateKey);

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
  console.log(chalk.cyan('💰 Making x402 payment...'));

  try {
    const result = await client.getQuotes({
      itemDescription,
      fromAddress,
      toAddress,
    });

    if (result) {
      console.log(chalk.green('\n✅ Payment successful! Shipping Quotes Retrieved!'));
      console.log(chalk.green('━'.repeat(50)));

      console.log(chalk.cyan('\n🤖 AI Parsed Item Info:'));
      console.log(`  Weight: ${result.parsedInfo.weight} ${result.parsedInfo.weightUnit}`);
      if (result.parsedInfo.dimensions) {
        console.log(
          `  Dimensions: ${result.parsedInfo.dimensions.length}x${result.parsedInfo.dimensions.width}x${result.parsedInfo.dimensions.height} ${result.parsedInfo.dimensions.unit}`
        );
      }
      console.log(`  Category: ${result.parsedInfo.category}`);
      console.log(`  Fragile: ${result.parsedInfo.fragile ? 'Yes' : 'No'}`);
      console.log(`  Estimated Value: $${result.parsedInfo.value}`);

      console.log(chalk.cyan('\n📋 Available Shipping Options:'));
      result.quotes.forEach((quote, index) => {
        const isRecommended = result.recommended?.rateId === quote.rateId;
        const marker = isRecommended ? chalk.yellow('⭐ RECOMMENDED') : '';
        console.log(`\n  ${index + 1}. ${quote.carrier} - ${quote.serviceName} ${marker}`);
        console.log(`     💵 Price: $${quote.price} ${quote.currency}`);
        console.log(`     📅 Estimated: ${quote.estimatedDays} days`);
        console.log(`     🔑 Rate ID: ${quote.rateId}`);
      });

      console.log(chalk.green('\n━'.repeat(50)));
    }
  } catch (error: any) {
    console.log(chalk.red('\n❌ Error:'), error.message);
    if (error.message.includes('insufficient funds')) {
      console.log(chalk.yellow('\nYou need USDC on Base Sepolia testnet.'));
      console.log(chalk.yellow('Get testnet ETH: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet'));
      console.log(chalk.yellow('Then swap for USDC on Base Sepolia'));
    }
  }
}

async function purchaseLabel() {
  console.log(chalk.green.bold('\n🏷️  Purchase Shipping Label'));
  console.log(chalk.green('━'.repeat(50)));

  const privateKey = process.env.WALLET_PRIVATE_KEY;
  if (!privateKey) {
    console.log(chalk.red('\n❌ Error: WALLET_PRIVATE_KEY not set in .env'));
    console.log(chalk.yellow('Please add your wallet private key to .env file'));
    console.log(chalk.yellow('See SETUP.md for instructions\n'));
    return;
  }

  const serverUrl = process.env.SERVER_URL || 'http://localhost:3000';
  const client = new ShippoX402Client(serverUrl, privateKey);

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
  console.log(chalk.cyan('💰 Making x402 payment...'));

  try {
    const result = await client.purchaseLabel({
      itemDescription: { description: itemDescription },
      fromAddress,
      toAddress,
    });

    if (result && result.success) {
      console.log(chalk.green('\n✅ Payment successful! Shipping Label Purchased!'));
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
  } catch (error: any) {
    console.log(chalk.red('\n❌ Error:'), error.message);
    if (error.message.includes('insufficient funds')) {
      console.log(chalk.yellow('\nYou need USDC on Base Sepolia testnet.'));
      console.log(chalk.yellow('Get testnet ETH: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet'));
      console.log(chalk.yellow('Then swap for USDC on Base Sepolia'));
    }
  }
}

program
  .name('shippo-x402')
  .description('AI-powered shipping label service with x402 payments')
  .version('1.0.0');

program
  .command('quote')
  .description('Get shipping quotes for an item (with x402 payment)')
  .action(getQuote);

program
  .command('label')
  .description('Purchase a shipping label (with x402 payment)')
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
          { name: '📋 Get Shipping Quotes (with x402 payment)', value: 'quote' },
          { name: '🏷️  Purchase Shipping Label (with x402 payment)', value: 'label' },
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
