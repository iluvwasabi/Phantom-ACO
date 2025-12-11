require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');

// Discord bot client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessages
  ]
});

// Configuration
const CHECKOUT_CHANNEL_ID = process.env.DISCORD_CHECKOUT_CHANNEL_ID;
const PUBLIC_CHECKOUT_CHANNEL_ID = process.env.PUBLIC_CHECKOUT_CHANNEL_ID;
const DROP_ANNOUNCEMENT_CHANNEL_ID = process.env.DROP_ANNOUNCEMENT_CHANNEL_ID;
const WEBSITE_API_URL = process.env.WEBSITE_API_URL || 'http://localhost:3000';
const API_SECRET = process.env.DISCORD_BOT_API_SECRET;

// Store DM conversation states for drop creation
const dmConversations = new Map(); // userId -> { step, messageId, channelId, dropName, skus }

// Parse Refract checkout message
function parseRefractCheckout(embed) {
  try {
    // Title is in author.name field (e.g., "Successful Checkout | Target")
    const authorName = embed.author?.name || '';

    // Extract retailer from author name (e.g., "Successful Checkout | Target")
    const retailerMatch = authorName.match(/Successful Checkout \| (.+)/);
    const retailer = retailerMatch ? retailerMatch[1] : 'Unknown';

    // Parse fields
    const fields = {};
    embed.fields?.forEach(field => {
      // Clean up field values (remove markdown links and spoiler tags)
      let cleanValue = field.value;

      // Remove markdown links [text](url) -> text
      cleanValue = cleanValue.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

      // Remove spoiler tags || text || -> text
      cleanValue = cleanValue.replace(/\|\| ([^|]+) \|\|/g, '$1');

      fields[field.name] = cleanValue.trim();
    });

    // Extract product name from markdown link if present
    const productRaw = fields['Product'] || 'N/A';
    const productMatch = productRaw.match(/\[([^\]]+)\]/);
    const product = productMatch ? productMatch[1] : productRaw;

    return {
      bot: 'Refract',
      retailer: retailer,
      product: product,
      price: parseFloat((fields['Price'] || '0').replace(/[$,]/g, '')),
      orderNumber: (fields['Order Number'] || fields['Order #'] || '').replace(/[#\s]/g, ''),
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

    console.log('📝 Stellar checkout fields:', Object.keys(fields));

    // Extract site/retailer - try multiple field names
    const retailer = fields['Site'] || fields['Store'] || fields['Retailer'] || 'Unknown';

    // Extract price - try multiple variations
    const priceField = fields['Price (1)'] || fields['Price'] || fields['Total'] || fields['Amount'] || '0';
    const priceStr = priceField.replace(/[$,]/g, '').trim();
    const price = parseFloat(priceStr) || 0;

    // Extract product - try multiple variations
    const product = fields['Product (1)'] || fields['Product'] || fields['Item'] || fields['Product Name'] || 'N/A';

    // Extract quantity - try multiple variations
    const quantityStr = fields['Quantity'] || fields['Qty'] || fields['Quantity (1)'] || '1';
    const quantity = parseInt(quantityStr) || 1;

    // Extract email from footer if present
    let email = null;
    if (embed.footer?.text) {
      const emailMatch = embed.footer.text.match(/[\w\.-]+@[\w\.-]+\.\w+/);
      email = emailMatch ? emailMatch[0] : null;
    }

    // Also try to extract email from fields
    if (!email) {
      email = fields['Email'] || fields['Account'] || null;
    }

    console.log(`✅ Stellar checkout parsed: ${retailer} - ${product} ($${price})`);

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

// Check if message is a successful checkout (not decline, out of stock, or shapeblock)
function isSuccessfulCheckout(embed) {
  const title = (embed.title || '').toLowerCase();
  const author = (embed.author?.name || '').toLowerCase();
  const description = (embed.description || '').toLowerCase();
  const footer = (embed.footer?.text || '').toLowerCase();

  // Filter out failure notifications
  const failureKeywords = [
    'out of stock',
    'oos',
    'declined',
    'decline',
    'shapeblock',
    'shape block',
    'blocked',
    'failed',
    'failure',
    'error',
    'unavailable',
    'sold out',
    'payment failed',
    'card declined'
  ];

  // Check if any failure keywords are present
  const fullText = `${title} ${author} ${description} ${footer}`.toLowerCase();
  for (const keyword of failureKeywords) {
    if (fullText.includes(keyword)) {
      console.log(`❌ Filtering out non-success notification: "${keyword}" detected`);
      return false;
    }
  }

  // Only allow messages that explicitly indicate success
  const successKeywords = ['successful checkout', 'success'];
  const hasSuccessKeyword = successKeywords.some(keyword => fullText.includes(keyword));

  if (!hasSuccessKeyword) {
    console.log(`⚠️  Message does not contain success indicators, skipping`);
    return false;
  }

  return true;
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

  // First check if this is a successful checkout (filter out declines, OOS, etc.)
  if (!isSuccessfulCheckout(embed)) {
    return null;
  }

  // Detect Refract - check author.name and footer
  if (author.includes('Successful Checkout |') || footer.includes('Prism Technologies')) {
    return parseRefractCheckout(embed);
  }

  // Detect Stellar - be more flexible with title matching
  if (title.toLowerCase().includes('successful checkout') || footer.toLowerCase().includes('stellara') || footer.toLowerCase().includes('stellar')) {
    return parseStellarCheckout(embed);
  }

  // Detect Valor (add when you have format)
  // if (/* valor detection logic */) {
  //   return parseValorCheckout(embed);
  // }

  // Log unrecognized embeds for debugging
  console.log('⚠️  Unrecognized embed format:');
  console.log('  Title:', title);
  console.log('  Author:', author);
  console.log('  Footer:', footer);
  console.log('  Fields:', embed.fields?.map(f => f.name).join(', '));

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

// Create a public-safe embed by filtering out sensitive information
function createPublicCheckoutEmbed(checkoutData) {
  // Determine embed color based on bot
  const color = checkoutData.bot === 'Refract' ? 0x5865F2 : 0x57F287; // Blue for Refract, Green for Stellar

  // Create embed with only public information
  const embed = new EmbedBuilder()
    .setTitle('✅ Successful Checkout')
    .setColor(color)
    .addFields(
      { name: '🏪 Retailer', value: checkoutData.retailer || 'N/A', inline: true },
      { name: '📦 Product', value: checkoutData.product || 'N/A', inline: false },
      { name: '💰 Price', value: `$${checkoutData.price.toFixed(2)}`, inline: true },
      { name: '🔢 Quantity', value: checkoutData.quantity.toString(), inline: true },

    )
    .setTimestamp()
    .setFooter({ text: 'ACO Service' });

  return embed;
}

// Send sanitized checkout to public channel
async function sendToPublicChannel(checkoutData) {
  if (!PUBLIC_CHECKOUT_CHANNEL_ID) {
    console.log('⚠️  No public checkout channel configured, skipping public announcement');
    return;
  }

  try {
    console.log(`📢 Attempting to send to public channel: ${PUBLIC_CHECKOUT_CHANNEL_ID}`);

    // Get the public channel
    const publicChannel = await client.channels.fetch(PUBLIC_CHECKOUT_CHANNEL_ID);

    if (!publicChannel) {
      console.error('❌ Could not find public checkout channel');
      return;
    }

    console.log(`✅ Found public channel: ${publicChannel.name}`);

    // Create sanitized embed (filters out email, order number, profile, proxy)
    const publicEmbed = createPublicCheckoutEmbed(checkoutData);

    // Send to public channel
    await publicChannel.send({ embeds: [publicEmbed] });
    console.log('✅ Sent sanitized checkout to public channel');
  } catch (error) {
    console.error('❌ Error sending to public channel:', error.message);
    console.error('Full error:', error);
  }
}

// ==================== DROP PREFERENCE FUNCTIONS ====================

// Poll for drop announcements every 5 seconds
async function pollDropAnnouncements() {
  try {
    const response = await axios.get(`${WEBSITE_API_URL}/api/discord-bot/get-drop-queue`, {
      headers: {
        'x-bot-secret': API_SECRET
      }
    });

    const { announcements } = response.data;

    if (announcements && announcements.length > 0) {
      console.log(`📢 Processing ${announcements.length} drop announcement(s)`);

      for (const announcement of announcements) {
        await postDropAnnouncement(announcement);
      }
    }
  } catch (error) {
    console.error('Error polling drop announcements:', error.message);
  }
}

// Post drop announcement to Discord
async function postDropAnnouncement(announcement) {
  try {
    const {
      drop_id,
      drop_name,
      description,
      drop_date,
      sku_list,
      sku_count,
      channel_id
    } = announcement;

    const channel = await client.channels.fetch(channel_id);

    if (!channel) {
      console.error(`❌ Channel ${channel_id} not found`);
      return;
    }

    // Format drop date
    let dropDateStr = 'TBA';
    if (drop_date) {
      const date = new Date(drop_date);
      dropDateStr = date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }

    // Create embed
    const embed = new EmbedBuilder()
      .setTitle(`🔥 ${drop_name}`)
      .setColor(0x5865F2)
      .addFields(
        { name: '📅 Drop Date', value: dropDateStr, inline: false },
        { name: '🛍️ SKUs Available', value: `${sku_count} SKUs`, inline: true }
      )
      .setTimestamp();

    if (description) {
      embed.setDescription(description);
    }

    if (sku_list) {
      embed.addFields({ name: '📦 Products', value: sku_list, inline: false });
    }

    // Create "Manage Preferences" button
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`drop_manage_${drop_id}`)
          .setLabel('⚙️ Manage Preferences')
          .setStyle(ButtonStyle.Primary)
      );

    // Send message
    const message = await channel.send({
      embeds: [embed],
      components: [row]
    });

    console.log(`✅ Posted drop announcement: ${drop_name} (Message ID: ${message.id})`);

  } catch (error) {
    console.error('Error posting drop announcement:', error);
  }
}

// Handle "Manage Preferences" button
async function handleManagePreferences(interaction) {
  try {
    // Extract drop ID from custom ID: drop_manage_{dropId}
    const dropId = interaction.customId.replace('drop_manage_', '');
    const discordId = interaction.user.id;
    const discordUsername = `${interaction.user.username}#${interaction.user.discriminator}`;

    console.log(`👤 ${discordUsername} is managing preferences for drop ${dropId}`);

    // Fetch drop data and user's current preferences
    const response = await axios.get(
      `${WEBSITE_API_URL}/api/discord-bot/drop-preferences/${dropId}/${discordId}`,
      {
        headers: { 'x-bot-secret': API_SECRET }
      }
    );

    const { drop_name, skus, preferences } = response.data;

    // Build SKU buttons (max 25 buttons, 5 per row)
    const buttons = [];
    const rows = [];

    for (const sku of skus) {
      const isOptedIn = preferences[sku.sku] === true;

      const button = new ButtonBuilder()
        .setCustomId(`drop_${dropId}_${sku.sku}`)
        .setLabel(sku.name)
        .setStyle(isOptedIn ? ButtonStyle.Success : ButtonStyle.Secondary)
        .setEmoji(isOptedIn ? '✅' : '⬜');

      buttons.push(button);
    }

    // Group buttons into rows of 5
    for (let i = 0; i < buttons.length; i += 5) {
      const row = new ActionRowBuilder()
        .addComponents(buttons.slice(i, i + 5));
      rows.push(row);
    }

    // If more than 5 rows (>25 buttons), limit to 25
    if (rows.length > 5) {
      await interaction.reply({
        content: `⚠️ This drop has ${skus.length} SKUs, but Discord limits buttons to 25 per message. Showing first 25 only.`,
        ephemeral: true
      });
      rows.splice(5);
    }

    // Reply with SKU buttons (ephemeral - only user sees it)
    await interaction.reply({
      content: `**${drop_name}**\n\nSelect which SKUs you want to opt into (green ✅ = opted in):`,
      components: rows,
      ephemeral: true
    });

  } catch (error) {
    console.error('Error showing preferences:', error);
    await interaction.reply({
      content: '❌ Error loading preferences. Please try again.',
      ephemeral: true
    });
  }
}

// Handle SKU toggle button
async function handleSKUToggle(interaction) {
  try {
    // Parse custom ID: drop_{dropId}_{sku}
    const parts = interaction.customId.split('_');
    const dropId = parts[1];
    const sku = parts.slice(2).join('_'); // In case SKU contains underscores

    const discordId = interaction.user.id;
    const discordUsername = `${interaction.user.username}#${interaction.user.discriminator}`;

    console.log(`🔄 ${discordUsername} toggling ${sku} for drop ${dropId}`);

    // Toggle preference via API
    const response = await axios.post(
      `${WEBSITE_API_URL}/api/discord-bot/drop-interaction`,
      {
        drop_id: dropId,
        discord_id: discordId,
        discord_username: discordUsername,
        sku: sku,
        action: 'toggle'
      },
      {
        headers: {
          'x-bot-secret': API_SECRET,
          'Content-Type': 'application/json'
        }
      }
    );

    const { opted_in } = response.data;

    // Update button appearance
    const components = interaction.message.components.map(row => {
      const actionRow = new ActionRowBuilder();

      row.components.forEach(button => {
        const btn = new ButtonBuilder()
          .setCustomId(button.customId)
          .setLabel(button.label);

        if (button.customId === interaction.customId) {
          // This is the button that was clicked - update its style
          btn.setStyle(opted_in ? ButtonStyle.Success : ButtonStyle.Secondary);
          btn.setEmoji(opted_in ? '✅' : '⬜');
        } else {
          // Keep other buttons the same
          btn.setStyle(button.style);
          btn.setEmoji(button.emoji?.name || null);
        }

        actionRow.addComponents(btn);
      });

      return actionRow;
    });

    // Update the message with new button states
    await interaction.update({
      components: components
    });

    console.log(`✅ Updated ${sku}: ${opted_in ? 'opted in' : 'opted out'}`);

  } catch (error) {
    console.error('Error toggling SKU:', error);
    await interaction.reply({
      content: '❌ Error updating preference. Please try again.',
      ephemeral: true
    });
  }
}

// ==================== END DROP PREFERENCE FUNCTIONS ====================

// Bot ready event
client.on('ready', () => {
  console.log(`✅ Discord bot logged in as ${client.user.tag}`);
  console.log(`📡 Monitoring channel: ${CHECKOUT_CHANNEL_ID}`);
  console.log(`📢 Public announcements channel: ${PUBLIC_CHECKOUT_CHANNEL_ID || 'Not configured'}`);
  console.log(`🔥 Drop announcements channel: ${DROP_ANNOUNCEMENT_CHANNEL_ID || 'Not configured'}`);
  console.log(`🌐 Website API: ${WEBSITE_API_URL}`);

  // Poll for drop announcements every 5 seconds
  setInterval(pollDropAnnouncements, 5000);
  console.log('✅ Started polling for drop announcements (every 5s)');
});

// Message create event
client.on('messageCreate', async (message) => {
  // Ignore messages from other channels
  if (message.channel.id !== CHECKOUT_CHANNEL_ID) {
    return;
  }

  // Check if this is a command to process a previous message
  if (message.content.toLowerCase() === '!process' && message.reference) {
    try {
      // Fetch the referenced message
      const referencedMessage = await message.channel.messages.fetch(message.reference.messageId);

      if (referencedMessage && referencedMessage.embeds && referencedMessage.embeds.length > 0) {
        console.log('\n🔄 Manual processing requested for message:', referencedMessage.id);

        // Process the referenced message
        await processCheckoutMessage(referencedMessage);

        // Delete the command message to keep channel clean
        await message.delete().catch(() => {});
        return;
      }
    } catch (error) {
      console.error('Error processing referenced message:', error);
      await message.react('❌');
      return;
    }
  }

  // Ignore messages without embeds
  if (!message.embeds || message.embeds.length === 0) {
    return;
  }

  // Process new checkout message
  await processCheckoutMessage(message);
});

// Function to process checkout messages
async function processCheckoutMessage(message) {

  console.log('\n📨 Processing checkout message');
  console.log('Message author:', message.author?.tag);
  console.log('Number of embeds:', message.embeds.length);

  if (message.embeds.length > 0) {
    const embed = message.embeds[0];
    console.log('Embed title:', embed.title);
    console.log('Embed description:', embed.description);
    console.log('Embed author:', embed.author?.name);
    console.log('Embed footer:', embed.footer?.text);
    console.log('Embed fields:', JSON.stringify(embed.fields, null, 2));
  }

  // Parse the checkout message
  const checkoutData = parseCheckoutMessage(message);

  if (!checkoutData) {
    console.log('⚠️  Could not parse checkout message (might not be a checkout)');
    console.log('Full embed data:', JSON.stringify(message.embeds[0], null, 2));
    return;
  }

  console.log('✅ Parsed checkout:', checkoutData);

  // Send to website
  try {
    const result = await sendToWebsite(checkoutData);
    console.log('🎉 Checkout successfully sent to website!');
    console.log('Result:', result);

    // Send sanitized version to public channel
    await sendToPublicChannel(checkoutData);

    // Optional: React to the message to show it was processed
    await message.react('✅');
  } catch (error) {
    console.error('❌ Failed to send checkout to website');
    // Optional: React with error emoji
    await message.react('❌');
  }
}

// Handle message reactions for drop creation
client.on('messageReactionAdd', async (reaction, user) => {
  // Ignore bot's own reactions
  if (user.bot) return;

  // Fetch partial reactions
  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch (error) {
      console.error('Error fetching reaction:', error);
      return;
    }
  }

  // Check if reaction is 🔥 and in the drop announcement channel
  if (reaction.emoji.name === '🔥' && reaction.message.channelId === DROP_ANNOUNCEMENT_CHANNEL_ID) {
    console.log(`🔥 Drop creation initiated by ${user.tag} on message ${reaction.message.id}`);

    try {
      // Remove the reaction to keep channel clean
      await reaction.users.remove(user.id);

      // Start DM conversation
      const dmChannel = await user.createDM();

      // Get the original message content for reference
      const messageContent = reaction.message.content || 'No text content';
      const messageUrl = `https://discord.com/channels/${reaction.message.guildId}/${reaction.message.channelId}/${reaction.message.id}`;

      await dmChannel.send({
        embeds: [{
          title: '🔥 Create Drop from Message',
          description: `You reacted to a message to create a drop. Let's set it up!\n\n[Jump to message](${messageUrl})`,
          color: 0x5865F2,
          fields: [
            { name: 'Message Preview', value: messageContent.substring(0, 1024) }
          ]
        }]
      });

      await dmChannel.send('**What should we name this drop?**\n_Example: Pokemon 151 Elite Trainer Box Drop_');

      // Store conversation state
      dmConversations.set(user.id, {
        step: 'name',
        messageId: reaction.message.id,
        channelId: reaction.message.channelId,
        guildId: reaction.message.guildId,
        messageContent: messageContent
      });

    } catch (error) {
      console.error('Error starting drop creation:', error);
      try {
        const dmChannel = await user.createDM();
        await dmChannel.send('❌ Error starting drop creation. Make sure your DMs are open!');
      } catch (dmError) {
        console.error('Could not DM user:', dmError);
      }
    }
  }
});

// Handle DM messages for drop creation
client.on('messageCreate', async (message) => {
  // Handle drop creation DMs
  if (message.channel.type === 1 && !message.author.bot) { // DM channel
    const userId = message.author.id;
    const conversation = dmConversations.get(userId);

    if (conversation) {
      await handleDropCreationDM(message, conversation);
      return;
    }
  }

  // Handle admin commands in drop announcement channel
  if (message.channel.id === DROP_ANNOUNCEMENT_CHANNEL_ID && !message.author.bot) {
    const content = message.content.toLowerCase().trim();

    // !drops - List all active drops
    if (content === '!drops') {
      await handleDropsCommand(message);
      return;
    }

    // !drop <id> - View specific drop details
    if (content.startsWith('!drop ')) {
      const dropId = content.split(' ')[1];
      await handleDropInfoCommand(message, dropId);
      return;
    }
  }

  // Existing checkout monitoring code
  // Ignore messages from other channels
  if (message.channel.id !== CHECKOUT_CHANNEL_ID) {
    return;
  }

  // ... rest of checkout handling code continues below
});

// Handle drop creation conversation in DMs
async function handleDropCreationDM(message, conversation) {
  const userId = message.author.id;

  try {
    if (conversation.step === 'name') {
      // Store drop name
      conversation.dropName = message.content.trim();
      conversation.step = 'skus';

      await message.reply('**Now send the SKU list** (one per line or comma-separated)\n\n_Example:_\n```\nETB-001: Elite Trainer Box\nBB-001: Booster Box\nCB-001: Collector Box\n```\n_Or:_\n```\nETB-001: Elite Trainer Box, BB-001: Booster Box, CB-001: Collector Box\n```');

      dmConversations.set(userId, conversation);

    } else if (conversation.step === 'skus') {
      // Parse SKUs
      const skuText = message.content.trim();
      const skus = [];

      // Try to parse different formats
      const lines = skuText.split('\n').filter(line => line.trim());

      for (const line of lines) {
        // Handle comma-separated in a single line
        if (line.includes(',')) {
          const parts = line.split(',');
          for (const part of parts) {
            const sku = parseSKULine(part.trim());
            if (sku) skus.push(sku);
          }
        } else {
          const sku = parseSKULine(line.trim());
          if (sku) skus.push(sku);
        }
      }

      if (skus.length === 0) {
        await message.reply('❌ Could not parse any SKUs. Please try again with format:\n```\nSKU-CODE: Product Name\n```');
        return;
      }

      // Show confirmation
      const skuList = skus.map((s, i) => `${i + 1}. **${s.sku}**: ${s.name}`).join('\n');
      await message.reply({
        embeds: [{
          title: '✅ Drop Ready to Create',
          color: 0x57F287,
          fields: [
            { name: 'Drop Name', value: conversation.dropName },
            { name: `SKUs (${skus.length})`, value: skuList }
          ]
        }]
      });

      await message.reply('Creating drop and adding button to your message...');

      // Create drop in database
      try {
        const response = await axios.post(
          `${WEBSITE_API_URL}/api/discord-bot/create-drop`,
          {
            drop_name: conversation.dropName,
            description: null,
            drop_date: null,
            skus: skus
          },
          {
            headers: {
              'x-bot-secret': API_SECRET,
              'Content-Type': 'application/json'
            }
          }
        );

        const dropId = response.data.drop_id;

        // Fetch the original message and reply with button
        const channel = await client.channels.fetch(conversation.channelId);
        const originalMessage = await channel.messages.fetch(conversation.messageId);

        const row = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId(`drop_manage_${dropId}`)
              .setLabel('⚙️ Manage Preferences')
              .setStyle(ButtonStyle.Primary)
          );

        // Reply to the original message with the button
        await originalMessage.reply({
          content: `**${conversation.dropName}**\n\nClick below to manage your SKU preferences for this drop:`,
          components: [row]
        });

        await message.reply('✅ Drop created successfully! Button posted as a reply to your message. Users can now manage their preferences!');

        // Clean up conversation state
        dmConversations.delete(userId);

      } catch (error) {
        console.error('Error creating drop:', error);
        await message.reply(`❌ Error creating drop: ${error.response?.data?.error || error.message}\n\nPlease try again by reacting to your message with 🔥`);
        dmConversations.delete(userId);
      }
    }

  } catch (error) {
    console.error('Error handling drop creation DM:', error);
    await message.reply('❌ An error occurred. Please start over by reacting to your message with 🔥');
    dmConversations.delete(userId);
  }
}

// Parse a single SKU line in various formats
function parseSKULine(line) {
  // Format: "SKU-CODE: Product Name" or "SKU-CODE - Product Name"
  const colonMatch = line.match(/^([A-Za-z0-9-_]+)\s*:\s*(.+)$/);
  if (colonMatch) {
    return { sku: colonMatch[1], name: colonMatch[2].trim() };
  }

  const dashMatch = line.match(/^([A-Za-z0-9-_]+)\s*-\s*(.+)$/);
  if (dashMatch) {
    return { sku: dashMatch[1], name: dashMatch[2].trim() };
  }

  return null;
}

// Handle !drops command - list all active drops
async function handleDropsCommand(message) {
  try {
    const response = await axios.get(`${WEBSITE_API_URL}/api/discord-bot/list-drops`, {
      headers: { 'x-bot-secret': API_SECRET }
    });

    const drops = response.data.drops;

    if (drops.length === 0) {
      await message.reply('No active drops found.');
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('🔥 Active Drops')
      .setColor(0x5865F2)
      .setDescription('Use `!drop <id>` to see details and preferences')
      .setTimestamp();

    drops.forEach(drop => {
      const skus = JSON.parse(drop.skus || '[]');
      const dropDate = drop.drop_date ? new Date(drop.drop_date).toLocaleDateString() : 'TBA';

      embed.addFields({
        name: `${drop.id}. ${drop.drop_name}`,
        value: `📅 Date: ${dropDate}\n🛍️ SKUs: ${skus.length}\n👥 Users: ${drop.user_count || 0} opted in`,
        inline: false
      });
    });

    await message.reply({ embeds: [embed] });

  } catch (error) {
    console.error('Error fetching drops:', error);
    await message.reply('❌ Error fetching drops. Please try again.');
  }
}

// Handle !drop <id> command - view specific drop details
async function handleDropInfoCommand(message, dropId) {
  try {
    const response = await axios.get(`${WEBSITE_API_URL}/api/discord-bot/drop-info/${dropId}`, {
      headers: { 'x-bot-secret': API_SECRET }
    });

    const drop = response.data.drop;
    const skus = JSON.parse(drop.skus || '[]');
    const preferences = response.data.preferences;

    const dropDate = drop.drop_date ? new Date(drop.drop_date).toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }) : 'TBA';

    const embed = new EmbedBuilder()
      .setTitle(`🔥 ${drop.drop_name}`)
      .setColor(0x5865F2)
      .setDescription(drop.description || 'No description')
      .addFields(
        { name: '📅 Drop Date', value: dropDate, inline: true },
        { name: '🛍️ Total SKUs', value: skus.length.toString(), inline: true },
        { name: '👥 Total Users', value: preferences.total_users.toString(), inline: true }
      )
      .setTimestamp();

    // Add SKU breakdown
    let skuBreakdown = '';
    skus.forEach(sku => {
      const count = preferences.by_sku[sku.sku] || 0;
      skuBreakdown += `• **${sku.sku}**: ${sku.name} (${count} users)\n`;
    });

    if (skuBreakdown) {
      embed.addFields({ name: '📦 SKU Breakdown', value: skuBreakdown });
    }

    embed.addFields({
      name: '🔗 Admin Panel',
      value: `[View Preferences](${WEBSITE_API_URL}/admin/drops/${dropId}/preferences)`
    });

    await message.reply({ embeds: [embed] });

  } catch (error) {
    console.error('Error fetching drop info:', error);
    if (error.response?.status === 404) {
      await message.reply(`❌ Drop with ID ${dropId} not found.`);
    } else {
      await message.reply('❌ Error fetching drop info. Please try again.');
    }
  }
}

// Handle button interactions
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  // Handle "Manage Preferences" button
  if (interaction.customId.startsWith('drop_manage_')) {
    await handleManagePreferences(interaction);
  }
  // Handle SKU toggle buttons
  else if (interaction.customId.startsWith('drop_')) {
    await handleSKUToggle(interaction);
  }
});

// Error handling
client.on('error', (error) => {
  console.error('Discord client error:', error);
});

// Login to Discord
console.log('🤖 Starting Discord checkout monitor bot...');
client.login(process.env.DISCORD_BOT_TOKEN);
