require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');

// Discord bot client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Configuration
const CHECKOUT_CHANNEL_ID = process.env.DISCORD_CHECKOUT_CHANNEL_ID;
const WEBSITE_API_URL = process.env.WEBSITE_API_URL || 'http://localhost:3000';
const API_SECRET = process.env.DISCORD_BOT_API_SECRET;

// Parse Refract checkout message
function parseRefractCheckout(embed) {
  try {
    const title = embed.title || '';
    const description = embed.description || '';

    // Extract retailer from title (e.g., "Successful Checkout | Target")
    const retailerMatch = title.match(/Successful Checkout \| (.+)/);
    const retailer = retailerMatch ? retailerMatch[1] : 'Unknown';

    // Parse fields
    const fields = {};
    embed.fields?.forEach(field => {
      fields[field.name] = field.value;
    });

    return {
      bot: 'Refract',
      retailer: retailer,
      product: fields['Product'] || 'N/A',
      price: parseFloat((fields['Price'] || '0').replace(/[$,]/g, '')),
      orderNumber: (fields['Order Number'] || '').replace('#', ''),
      email: fields['Email'] || null,
      profile: fields['Profile'] || null,
      proxyDetails: fields['Proxy Details'] || null,
      quantity: parseInt(fields['Quantity'] || '1'),
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error parsing Refract checkout:', error);
    return null;
  }
}

// Parse Stellar checkout message
function parseStellarCheckout(embed) {
  try {
    const title = embed.title || '';
    const description = embed.description || '';

    // Parse fields
    const fields = {};
    embed.fields?.forEach(field => {
      fields[field.name] = field.value;
    });

    // Extract site/retailer
    const retailer = fields['Site'] || 'Unknown';

    // Extract price - could be "Price (1)" or just "Price"
    const priceField = fields['Price (1)'] || fields['Price'] || '0';
    const price = parseFloat(priceField.replace(/[$,]/g, ''));

    // Extract product - could be "Product (1)" or just "Product"
    const product = fields['Product (1)'] || fields['Product'] || 'N/A';

    // Extract quantity
    const quantity = parseInt(fields['Quantity'] || '1');

    // Extract email from footer if present
    let email = null;
    if (embed.footer?.text) {
      const emailMatch = embed.footer.text.match(/[\w\.-]+@[\w\.-]+\.\w+/);
      email = emailMatch ? emailMatch[0] : null;
    }

    return {
      bot: 'Stellar',
      retailer: retailer,
      product: product,
      price: price,
      orderNumber: null, // Stellar doesn't provide order number in screenshot
      email: email,
      profile: null,
      proxyDetails: null,
      quantity: quantity,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error parsing Stellar checkout:', error);
    return null;
  }
}

// Parse Valor checkout message (you can add this later if needed)
function parseValorCheckout(embed) {
  // TODO: Add Valor parsing when you have a screenshot
  return null;
}

// Determine which bot sent the message and parse accordingly
function parseCheckoutMessage(message) {
  if (!message.embeds || message.embeds.length === 0) {
    return null;
  }

  const embed = message.embeds[0];
  const title = embed.title || '';
  const author = embed.author?.name || '';
  const footer = embed.footer?.text || '';

  // Detect Refract
  if (title.includes('Successful Checkout |') || author.includes('Prism Technologies')) {
    return parseRefractCheckout(embed);
  }

  // Detect Stellar
  if (title === 'Successful Checkout!' || footer.includes('@stellara_io')) {
    return parseStellarCheckout(embed);
  }

  // Detect Valor (add when you have format)
  // if (/* valor detection logic */) {
  //   return parseValorCheckout(embed);
  // }

  return null;
}

// Send checkout data to website API
async function sendToWebsite(checkoutData) {
  try {
    console.log('Sending checkout to website:', checkoutData);

    const response = await axios.post(
      `${WEBSITE_API_URL}/api/discord-bot/checkout`,
      checkoutData,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Bot-Secret': API_SECRET
        }
      }
    );

    console.log('✅ Successfully sent to website:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error sending to website:', error.response?.data || error.message);
    throw error;
  }
}

// Bot ready event
client.on('ready', () => {
  console.log(`✅ Discord bot logged in as ${client.user.tag}`);
  console.log(`📡 Monitoring channel: ${CHECKOUT_CHANNEL_ID}`);
  console.log(`🌐 Website API: ${WEBSITE_API_URL}`);
});

// Message create event
client.on('messageCreate', async (message) => {
  // Ignore messages from other channels
  if (message.channel.id !== CHECKOUT_CHANNEL_ID) {
    return;
  }

  // Ignore messages without embeds
  if (!message.embeds || message.embeds.length === 0) {
    return;
  }

  console.log('\n📨 New message in checkout channel');

  // Parse the checkout message
  const checkoutData = parseCheckoutMessage(message);

  if (!checkoutData) {
    console.log('⚠️  Could not parse checkout message (might not be a checkout)');
    return;
  }

  console.log('✅ Parsed checkout:', checkoutData);

  // Send to website
  try {
    await sendToWebsite(checkoutData);
    console.log('🎉 Checkout successfully sent to website!');

    // Optional: React to the message to show it was processed
    await message.react('✅');
  } catch (error) {
    console.error('❌ Failed to send checkout to website');
    // Optional: React with error emoji
    await message.react('❌');
  }
});

// Error handling
client.on('error', (error) => {
  console.error('Discord client error:', error);
});

// Login to Discord
client.login(process.env.DISCORD_BOT_TOKEN);

console.log('🤖 Starting Discord checkout monitor bot...');
