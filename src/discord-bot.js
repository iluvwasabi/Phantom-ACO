/**
 * Discord Bot Module - Merged into main service
 * 
 * Exports startBot(port) to run alongside the Express server.
 * All HTTP calls go to http://localhost:{port} internally.
 */

const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, SlashCommandBuilder, REST, Routes } = require('discord.js');
const axios = require('axios');

function startBot(port) {
  const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

  if (!DISCORD_BOT_TOKEN) {
    console.warn('⚠️  DISCORD_BOT_TOKEN not set — Discord bot will not start.');
    return null;
  }

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

  // Store selected profiles temporarily (userId+dropId -> [profileIds])
  const selectedProfilesCache = new Map();

  // Store navigation history for dashboard (userId -> [views])
  const dashboardHistory = new Map();

  // Configuration
  const CHECKOUT_CHANNEL_ID = process.env.DISCORD_CHECKOUT_CHANNEL_ID;
  const PUBLIC_CHECKOUT_CHANNEL_ID = process.env.PUBLIC_CHECKOUT_CHANNEL_ID;
  const DROP_ANNOUNCEMENT_CHANNEL_ID = process.env.DROP_ANNOUNCEMENT_CHANNEL_ID;
  const TEMPLATE_CHANNEL_ID = '1450237892222910575';
  const SUBMISSION_UPDATES_CHANNEL_ID = process.env.SUBMISSION_UPDATES_CHANNEL_ID || '1446376744411074757';
  const ACO_ROLE_ID = process.env.ACO_ROLE_ID;
  // Default to localhost when merged; still allow external override
  const WEBSITE_API_URL = process.env.WEBSITE_API_URL || `http://localhost:${port}`;
  const API_SECRET = process.env.DISCORD_BOT_API_SECRET;

  // Store DM conversation states for drop creation
  const dmConversations = new Map();

  // ==================== CHECKOUT PARSING ====================

  function parseRefractCheckout(embed) {
    try {
      const authorName = embed.author?.name || '';
      const retailerMatch = authorName.match(/Successful Checkout \| (.+)/);
      const retailer = retailerMatch ? retailerMatch[1] : 'Unknown';

      const fields = {};
      embed.fields?.forEach(field => {
        let cleanValue = field.value;
        cleanValue = cleanValue.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
        cleanValue = cleanValue.replace(/\|\| ([^|]+) \|\|/g, '$1');
        fields[field.name] = cleanValue.trim();
      });

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

  function parseStellarCheckout(embed) {
    try {
      const fields = {};
      embed.fields?.forEach(field => {
        fields[field.name] = field.value;
      });

      console.log('📝 Stellar checkout fields:', Object.keys(fields));

      const retailer = fields['Site'] || fields['Store'] || fields['Retailer'] || 'Unknown';
      const priceField = fields['Price (1)'] || fields['Price'] || fields['Total'] || fields['Amount'] || '0';
      const priceStr = priceField.replace(/[$,]/g, '').trim();
      const price = parseFloat(priceStr) || 0;
      const product = fields['Product (1)'] || fields['Product'] || fields['Item'] || fields['Product Name'] || 'N/A';
      const quantityStr = fields['Quantity'] || fields['Qty'] || fields['Quantity (1)'] || '1';
      const quantity = parseInt(quantityStr) || 1;

      let email = null;
      if (embed.footer?.text) {
        const emailMatch = embed.footer.text.match(/[\w\.-]+@[\w\.-]+\.\w+/);
        email = emailMatch ? emailMatch[0] : null;
      }
      if (!email) {
        email = fields['Email'] || fields['Account'] || null;
      }

      console.log(`✅ Stellar checkout parsed: ${retailer} - ${product} ($${price})`);

      return {
        bot: 'Stellar',
        retailer: retailer,
        product: product,
        price: price,
        orderNumber: null,
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

  function parseValorCheckout(embed) {
    return null;
  }

  function isSuccessfulCheckout(embed) {
    const title = (embed.title || '').toLowerCase();
    const author = (embed.author?.name || '').toLowerCase();
    const description = (embed.description || '').toLowerCase();
    const footer = (embed.footer?.text || '').toLowerCase();

    const failureKeywords = [
      'out of stock', 'oos', 'declined', 'decline', 'shapeblock',
      'shape block', 'blocked', 'failed', 'failure', 'error',
      'unavailable', 'sold out', 'payment failed', 'card declined'
    ];

    const fullText = `${title} ${author} ${description} ${footer}`.toLowerCase();
    for (const keyword of failureKeywords) {
      if (fullText.includes(keyword)) {
        console.log(`❌ Filtering out non-success notification: "${keyword}" detected`);
        return false;
      }
    }

    const successKeywords = ['successful checkout', 'success'];
    const hasSuccessKeyword = successKeywords.some(keyword => fullText.includes(keyword));

    if (!hasSuccessKeyword) {
      console.log(`⚠️  Message does not contain success indicators, skipping`);
      return false;
    }

    return true;
  }

  function parseCheckoutMessage(message) {
    if (!message.embeds || message.embeds.length === 0) {
      return null;
    }

    const embed = message.embeds[0];
    const title = embed.title || '';
    const author = embed.author?.name || '';
    const footer = embed.footer?.text || '';

    if (!isSuccessfulCheckout(embed)) {
      return null;
    }

    if (author.includes('Successful Checkout |') || footer.includes('Prism Technologies')) {
      return parseRefractCheckout(embed);
    }

    if (title.toLowerCase().includes('successful checkout') || footer.toLowerCase().includes('stellara') || footer.toLowerCase().includes('stellar')) {
      return parseStellarCheckout(embed);
    }

    console.log('⚠️  Unrecognized embed format:');
    console.log('  Title:', title);
    console.log('  Author:', author);
    console.log('  Footer:', footer);
    console.log('  Fields:', embed.fields?.map(f => f.name).join(', '));

    return null;
  }

  // ==================== DROP TEMPLATE PARSING ====================

  function parseDropAnnouncement(message) {
    const content = message.content || '';
    const embeds = message.embeds || [];
    const embed = embeds[0];

    return {
      drop_name: extractDropName(content, embed),
      description: extractDescription(content, embed),
      extracted_skus: extractPotentialSKUs(content, embed),
      images: extractImages(message),
      urls: extractURLs(content),
      embed_data: embed ? {
        title: embed.title,
        description: embed.description,
        fields: embed.fields?.map(f => ({ name: f.name, value: f.value })),
        footer: embed.footer?.text,
        author: embed.author?.name,
        image: embed.image?.url,
        thumbnail: embed.thumbnail?.url,
        color: embed.color
      } : null
    };
  }

  function extractDropName(content, embed) {
    if (embed?.title) return embed.title;
    const boldMatch = content.match(/\*\*([^*]+)\*\*/);
    if (boldMatch) {
      const name = boldMatch[1].trim();
      if (name.length < 150) return name;
    }
    const firstLine = content.split('\n')[0].trim();
    if (firstLine.length > 3 && firstLine.length < 100 && /^[A-Z]/.test(firstLine)) return firstLine;
    if (embed?.author?.name && embed.author.name.length < 100) return embed.author.name;
    return null;
  }

  function extractPotentialSKUs(content, embed) {
    const skus = [];
    const lines = content.split('\n');

    lines.forEach(line => {
      const bulletMatch = line.match(/^[•\-*]\s*(.+?)(?:\s*[:\-]\s*(.+))?$/);
      if (bulletMatch) {
        const sku = bulletMatch[1].trim();
        const name = bulletMatch[2]?.trim() || bulletMatch[1].trim();
        if (sku.length > 2 && sku.length < 100) {
          skus.push({ sku, name, confidence: 0.75, source: 'bullet_list' });
        }
      }
    });

    lines.forEach(line => {
      const skuMatch = line.match(/SKU:\s*([A-Z0-9-]+)\s*(?:-|:)?\s*(.+)/i);
      if (skuMatch) {
        skus.push({ sku: skuMatch[1].trim(), name: skuMatch[2].trim(), confidence: 0.95, source: 'sku_code' });
      }
    });

    lines.forEach(line => {
      const numberedMatch = line.match(/^\d+[\.)]\s*(.+?)(?:\s*[:\-]\s*(.+))?$/);
      if (numberedMatch) {
        const sku = numberedMatch[1].trim();
        const name = numberedMatch[2]?.trim() || numberedMatch[1].trim();
        if (sku.length > 2 && sku.length < 100) {
          skus.push({ sku, name, confidence: 0.7, source: 'numbered_list' });
        }
      }
    });

    lines.forEach(line => {
      const priceMatch = line.match(/\$\s*(\d+(?:\.\d{2})?)\s*[:\-]\s*(.+)/);
      if (priceMatch) {
        const product = priceMatch[2].trim();
        if (product.length > 2 && product.length < 100) {
          skus.push({ sku: product, name: product, confidence: 0.65, source: 'price_match' });
        }
      }
    });

    if (embed?.fields) {
      embed.fields.forEach(field => {
        const fieldNameLower = field.name.toLowerCase();
        const isProductField = fieldNameLower.includes('sku') || fieldNameLower.includes('product') || fieldNameLower.includes('item');
        if (isProductField && field.value.length < 100) {
          skus.push({ sku: field.name, name: field.value, confidence: 0.8, source: 'embed_field' });
        }
      });
    }

    const seen = new Map();
    skus.forEach(item => {
      const key = item.sku.toLowerCase();
      if (!seen.has(key) || seen.get(key).confidence < item.confidence) {
        seen.set(key, item);
      }
    });

    const deduplicated = [];
    seen.forEach(item => deduplicated.push(item));
    return deduplicated;
  }

  function extractDescription(content, embed) {
    const urls = extractURLs(content);
    if (embed?.description) {
      const embedUrls = extractURLs(embed.description);
      urls.push(...embedUrls);
    }

    const uniqueUrls = [...new Set(urls)];
    if (uniqueUrls.length === 0) return null;

    const commonStores = {
      'target.com': 'Target', 'walmart.com': 'Walmart', 'bestbuy.com': 'Best Buy',
      'pokemoncenter.com': 'Pokemon Center', 'gamestop.com': 'GameStop',
      'amazon.com': 'Amazon', 'tcgplayer.com': 'TCGPlayer', 'ebay.com': 'eBay'
    };

    const storeNames = [];
    uniqueUrls.forEach(url => {
      for (const [domain, storeName] of Object.entries(commonStores)) {
        if (url.toLowerCase().includes(domain) && !storeNames.includes(storeName)) {
          storeNames.push(storeName);
        }
      }
    });

    return storeNames.length > 0
      ? `${storeNames.join(', ')} - ${uniqueUrls[0]}`
      : uniqueUrls.join('\n');
  }

  function extractImages(message) {
    const images = [];
    message.attachments.forEach(att => {
      if (att.contentType?.startsWith('image/')) images.push(att.url);
    });
    message.embeds.forEach(embed => {
      if (embed.image?.url) images.push(embed.image.url);
      if (embed.thumbnail?.url) images.push(embed.thumbnail.url);
    });
    return [...new Set(images)];
  }

  function extractURLs(content) {
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = content.match(urlRegex) || [];
    return urls.map(url => url.replace(/[,.)]+$/, ''));
  }

  // ==================== API HELPERS ====================

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

  function createPublicCheckoutEmbed(checkoutData) {
    const color = checkoutData.bot === 'Refract' ? 0x5865F2 : 0x57F287;
    return new EmbedBuilder()
      .setTitle('✅ Successful Checkout')
      .setColor(color)
      .addFields(
        { name: '🏪 Retailer', value: checkoutData.retailer || 'N/A', inline: true },
        { name: '📦 Product', value: checkoutData.product || 'N/A', inline: false },
        { name: '💰 Price', value: `$${checkoutData.price.toFixed(2)}`, inline: true },
        { name: '🔢 Quantity', value: checkoutData.quantity.toString(), inline: true }
      )
      .setTimestamp()
      .setFooter({ text: 'ACO Service' });
  }

  async function sendToPublicChannel(checkoutData) {
    if (!PUBLIC_CHECKOUT_CHANNEL_ID) {
      console.log('⚠️  No public checkout channel configured, skipping public announcement');
      return;
    }
    try {
      console.log(`📢 Attempting to send to public channel: ${PUBLIC_CHECKOUT_CHANNEL_ID}`);
      const publicChannel = await client.channels.fetch(PUBLIC_CHECKOUT_CHANNEL_ID);
      if (!publicChannel) {
        console.error('❌ Could not find public checkout channel');
        return;
      }
      console.log(`✅ Found public channel: ${publicChannel.name}`);
      const publicEmbed = createPublicCheckoutEmbed(checkoutData);
      await publicChannel.send({ embeds: [publicEmbed] });
      console.log('✅ Sent sanitized checkout to public channel');
    } catch (error) {
      console.error('❌ Error sending to public channel:', error.message);
    }
  }

  // ==================== DROP PREFERENCE FUNCTIONS ====================

  async function pollDropAnnouncements() {
    try {
      const response = await axios.get(`${WEBSITE_API_URL}/api/discord-bot/get-drop-queue`, {
        headers: { 'x-bot-secret': API_SECRET }
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

  async function postDropAnnouncement(announcement) {
    try {
      const { drop_id, drop_name, description, drop_date, sku_list, sku_count, channel_id } = announcement;
      const channel = await client.channels.fetch(channel_id);
      if (!channel) {
        console.error(`❌ Channel ${channel_id} not found`);
        return;
      }

      let dropDateStr = 'TBA';
      if (drop_date) {
        const date = new Date(drop_date);
        dropDateStr = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      }

      const embed = new EmbedBuilder()
        .setTitle(`🔥 ${drop_name}`)
        .setColor(0x5865F2)
        .addFields(
          { name: '📅 Drop Date', value: dropDateStr, inline: false },
          { name: '🛍️ SKUs Available', value: `${sku_count} SKUs`, inline: true }
        )
        .setTimestamp();

      if (description) embed.setDescription(description);
      if (sku_list) embed.addFields({ name: '📦 Products', value: sku_list, inline: false });

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`drop_manage_${drop_id}`)
            .setLabel('⚙️ Manage Preferences')
            .setStyle(ButtonStyle.Primary)
        );

      let content = '';
      if (ACO_ROLE_ID) content = `<@&${ACO_ROLE_ID}>`;

      const message = await channel.send({ content, embeds: [embed], components: [row] });
      console.log(`✅ Posted drop announcement: ${drop_name} (Message ID: ${message.id})`);

      try {
        await axios.post(
          `${WEBSITE_API_URL}/api/discord-bot/update-drop-message-id`,
          { drop_id, message_id: message.id, channel_id },
          { headers: { 'x-bot-secret': API_SECRET, 'Content-Type': 'application/json' } }
        );
        console.log(`💾 Saved message ID ${message.id} to database for drop ${drop_id}`);
      } catch (saveError) {
        console.error('Error saving message ID to database:', saveError.message);
      }
    } catch (error) {
      console.error('Error posting drop announcement:', error);
    }
  }

  async function pollDropEdits() {
    try {
      const response = await axios.get(`${WEBSITE_API_URL}/api/discord-bot/get-drop-edit-queue`, {
        headers: { 'x-bot-secret': API_SECRET }
      });
      const { edits } = response.data;
      if (edits && edits.length > 0) {
        console.log(`📝 Processing ${edits.length} drop edit(s)`);
        for (const edit of edits) {
          await editDropAnnouncement(edit);
        }
      }
    } catch (error) {
      console.error('Error polling drop edits:', error.message);
    }
  }

  async function editDropAnnouncement(edit) {
    try {
      const { drop_id, message_id, channel_id, drop_name, description, drop_date, skus } = edit;
      console.log(`🔄 Attempting to edit drop ${drop_id} - Message: ${message_id}, Channel: ${channel_id}`);

      const channel = await client.channels.fetch(channel_id);
      if (!channel) { console.error(`❌ Channel ${channel_id} not found`); return; }

      const message = await channel.messages.fetch(message_id);
      if (!message) { console.error(`❌ Message ${message_id} not found`); return; }

      let dropDateStr = 'TBA';
      if (drop_date) {
        const date = new Date(drop_date);
        dropDateStr = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      }

      const sku_list = skus.map(s => `• **${s.sku}**: ${s.name}`).join('\n');
      const sku_count = skus.length;

      const embed = new EmbedBuilder()
        .setTitle(`🔥 ${drop_name}`)
        .setColor(0x5865F2)
        .addFields(
          { name: '📅 Drop Date', value: dropDateStr, inline: false },
          { name: '🛍️ SKUs Available', value: `${sku_count} SKUs`, inline: true }
        )
        .setTimestamp();

      if (description) embed.setDescription(description);
      if (sku_list) embed.addFields({ name: '📦 Products', value: sku_list, inline: false });

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`drop_manage_${drop_id}`)
            .setLabel('⚙️ Manage Preferences')
            .setStyle(ButtonStyle.Primary)
        );

      await message.edit({ embeds: [embed], components: [row] });
      console.log(`✅ Edited drop announcement: ${drop_name} (Message ID: ${message_id})`);
    } catch (error) {
      console.error('Error editing drop announcement:', error);
    }
  }

  async function handleManagePreferences(interaction) {
    try {
      const dropId = interaction.customId.replace('drop_manage_', '');
      const discordId = interaction.user.id;
      const discordUsername = `${interaction.user.username}#${interaction.user.discriminator}`;

      console.log(`👤 ${discordUsername} is managing preferences for drop ${dropId}`);

      const response = await axios.get(
        `${WEBSITE_API_URL}/api/discord-bot/drop-preferences/${dropId}/${discordId}`,
        { headers: { 'x-bot-secret': API_SECRET } }
      );

      const { drop_name, service_name, skus, preferences, user_submissions } = response.data;

      if (!user_submissions || user_submissions.length === 0) {
        await interaction.reply({
          content: `❌ You don't have any **${service_name}** profiles registered.\n\nPlease register a ${service_name} profile on the website first to participate in this drop.`,
          ephemeral: true
        });
        return;
      }

      let profileInfo = `**${drop_name}** (${service_name})\n\n`;
      profileInfo += `**Step 1:** Select which profile(s) you want to use for this drop.\n`;
      profileInfo += `**Step 2:** After selecting profiles, you'll choose which SKUs to run.\n\n`;
      profileInfo += `Available profiles:\n`;
      user_submissions.forEach(sub => {
        const displayName = sub.profile_name || `Profile #${sub.id}`;
        profileInfo += `• ${displayName}\n`;
      });

      const profileOptions = user_submissions.map(sub => {
        const label = sub.profile_name || `Profile #${sub.id}`;
        let description = '';
        if (sub.first_name && sub.last_name) description += `${sub.first_name} ${sub.last_name}`;
        if (sub.email) description += description ? ` • ${sub.email}` : sub.email;
        if (sub.card_last_4) description += description ? ` • Card: ****${sub.card_last_4}` : `Card: ****${sub.card_last_4}`;
        if (!description) description = `Created: ${new Date(sub.created_at).toLocaleDateString()}`;
        if (description.length > 100) description = description.substring(0, 97) + '...';

        return new StringSelectMenuOptionBuilder()
          .setLabel(label.length > 100 ? label.substring(0, 97) + '...' : label)
          .setDescription(description)
          .setValue(sub.id.toString());
      });

      const profileSelectMenu = new StringSelectMenuBuilder()
        .setCustomId(`select_profiles_${dropId}`)
        .setPlaceholder('Select profile(s) to use')
        .setMinValues(1)
        .setMaxValues(user_submissions.length)
        .addOptions(profileOptions);

      const row = new ActionRowBuilder().addComponents(profileSelectMenu);

      await interaction.reply({ content: profileInfo, components: [row], ephemeral: true });
    } catch (error) {
      console.error('Error showing preferences:', error);
      await interaction.reply({ content: '❌ Error loading preferences. Please try again.', ephemeral: true });
    }
  }

  async function handleInitialProfileSelection(interaction) {
    try {
      const dropId = interaction.customId.replace('select_profiles_', '');
      const discordId = interaction.user.id;
      const selectedProfiles = interaction.values.map(v => parseInt(v));
      const cacheKey = `${discordId}_${dropId}`;
      selectedProfilesCache.set(cacheKey, selectedProfiles);

      console.log(`✅ ${interaction.user.username} selected ${selectedProfiles.length} profiles for drop ${dropId}`);

      const response = await axios.get(
        `${WEBSITE_API_URL}/api/discord-bot/drop-preferences/${dropId}/${discordId}`,
        { headers: { 'x-bot-secret': API_SECRET } }
      );

      const { drop_name, skus, user_submissions, preferences } = response.data;

      if (!skus || !Array.isArray(skus) || skus.length === 0) {
        throw new Error('No SKUs found for this drop. Please contact an admin.');
      }
      if (!user_submissions || user_submissions.length === 0) {
        throw new Error('No profiles found. Please contact an admin.');
      }

      const selectedProfileNames = selectedProfiles.map(id => {
        const sub = user_submissions.find(s => s.id === id);
        return sub?.profile_name || `Profile #${id}`;
      });

      let message = `**${drop_name}**\n\n`;
      message += `**Selected Profiles:**\n${selectedProfileNames.map(name => `• ${name}`).join('\n')}\n\n`;
      message += `**Now select SKUs** to run on these profiles:\n`;
      message += `(Click a SKU to toggle it on/off)`;

      const buttons = [];
      const rows = [];
      const seenCustomIds = new Set();

      for (let i = 0; i < skus.length; i++) {
        const sku = skus[i];
        const customId = `sku_toggle_${dropId}_${sku.sku}_${i}`;
        if (seenCustomIds.has(customId)) continue;
        seenCustomIds.add(customId);

        const skuPrefs = preferences[sku.sku];
        let isOptedIn = false;
        if (skuPrefs && skuPrefs.opted_in && skuPrefs.submissions.length > 0) {
          isOptedIn = selectedProfiles.some(profileId => skuPrefs.submissions.includes(profileId));
        }

        const button = new ButtonBuilder()
          .setCustomId(customId)
          .setLabel(sku.name)
          .setStyle(isOptedIn ? ButtonStyle.Success : ButtonStyle.Secondary)
          .setEmoji(isOptedIn ? '✅' : '⬜');

        buttons.push(button);
      }

      for (let i = 0; i < buttons.length; i += 5) {
        const row = new ActionRowBuilder().addComponents(buttons.slice(i, i + 5));
        rows.push(row);
      }
      if (rows.length > 5) rows.splice(5);

      await interaction.update({ content: message, components: rows });
    } catch (error) {
      console.error('Error handling profile selection:', error);
      try {
        await interaction.update({ content: `❌ Error processing selection: ${error.message}`, components: [] });
      } catch (updateError) {
        await interaction.reply({ content: `❌ Error processing selection: ${error.message}`, ephemeral: true });
      }
    }
  }

  async function handleSKUToggle(interaction) {
    try {
      const parts = interaction.customId.split('_');
      const dropId = parts[2];
      const skuParts = parts.slice(3, -1);
      const sku = skuParts.length > 0 ? skuParts.join('_') : parts[3];
      const discordId = interaction.user.id;
      const discordUsername = interaction.user.username;
      const cacheKey = `${discordId}_${dropId}`;
      const selectedProfiles = selectedProfilesCache.get(cacheKey);

      if (!selectedProfiles || selectedProfiles.length === 0) {
        await interaction.reply({ content: '❌ Session expired. Please click "Manage Preferences" again to start over.', ephemeral: true });
        return;
      }

      const wasOptedIn = interaction.component.style === ButtonStyle.Success;
      const newOptedIn = !wasOptedIn;

      console.log(`🔄 ${discordUsername} toggling ${sku} for ${selectedProfiles.length} profiles: ${wasOptedIn ? 'opting out' : 'opting in'}`);

      await axios.post(
        `${WEBSITE_API_URL}/api/discord-bot/drop-interaction`,
        {
          drop_id: dropId,
          discord_id: discordId,
          discord_username: discordUsername,
          sku: sku,
          action: 'set_profiles',
          submission_ids: newOptedIn ? selectedProfiles : []
        },
        { headers: { 'x-bot-secret': API_SECRET, 'Content-Type': 'application/json' } }
      );

      const components = interaction.message.components.map(row => {
        const actionRow = new ActionRowBuilder();
        row.components.forEach(button => {
          const btn = new ButtonBuilder()
            .setCustomId(button.customId)
            .setLabel(button.label);

          if (button.customId === interaction.customId) {
            btn.setStyle(newOptedIn ? ButtonStyle.Success : ButtonStyle.Secondary);
            btn.setEmoji(newOptedIn ? '✅' : '⬜');
          } else {
            btn.setStyle(button.style);
            btn.setEmoji(button.emoji?.name || '⬜');
          }
          actionRow.addComponents(btn);
        });
        return actionRow;
      });

      await interaction.update({ components });
      console.log(`✅ Toggled ${sku}: ${newOptedIn ? 'opted in' : 'opted out'} for ${selectedProfiles.length} profiles`);

      if (newOptedIn && SUBMISSION_UPDATES_CHANNEL_ID) {
        try {
          const dropResponse = await axios.get(
            `${WEBSITE_API_URL}/api/discord-bot/drop-preferences/${dropId}/${discordId}`,
            { headers: { 'x-bot-secret': API_SECRET } }
          );
          const { drop_name, service_name, user_submissions } = dropResponse.data;
          const profileNames = selectedProfiles.map(id => {
            const sub = user_submissions.find(s => s.id === id);
            return sub?.profile_name || `Profile #${id}`;
          });

          const updatesChannel = await client.channels.fetch(SUBMISSION_UPDATES_CHANNEL_ID);
          if (updatesChannel) {
            const embed = new EmbedBuilder()
              .setTitle('✅ User Opted Into Drop')
              .setColor(0x10b981)
              .addFields(
                { name: 'User', value: `${discordUsername} (<@${discordId}>)`, inline: true },
                { name: 'Drop', value: drop_name, inline: true },
                { name: 'Service', value: service_name || 'N/A', inline: true },
                { name: 'SKU', value: sku, inline: false },
                { name: 'Profiles', value: profileNames.join('\n'), inline: false }
              )
              .setTimestamp();
            await updatesChannel.send({ embeds: [embed] });
            console.log(`📢 Sent opt-in notification to submission-updates channel`);
          }
        } catch (notifError) {
          console.error('Error sending opt-in notification:', notifError);
        }
      }
    } catch (error) {
      console.error('Error toggling SKU:', error);
      await interaction.reply({ content: '❌ Error updating preference. Please try again.', ephemeral: true });
    }
  }

  // ==================== CHECKOUT PROCESSING ====================

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

    const checkoutData = parseCheckoutMessage(message);
    if (!checkoutData) {
      console.log('⚠️  Could not parse checkout message (might not be a checkout)');
      console.log('Full embed data:', JSON.stringify(message.embeds[0], null, 2));
      return;
    }

    console.log('✅ Parsed checkout:', checkoutData);

    try {
      const result = await sendToWebsite(checkoutData);
      console.log('🎉 Checkout successfully sent to website!');
      console.log('Result:', result);
      await sendToPublicChannel(checkoutData);
      await message.react('✅');
    } catch (error) {
      console.error('❌ Failed to send checkout to website');
      await message.react('❌');
    }
  }

  // ==================== DM DROP CREATION ====================

  async function handleDropCreationDM(message, conversation) {
    const userId = message.author.id;

    try {
      if (conversation.step === 'name') {
        conversation.dropName = message.content.trim();
        conversation.step = 'service';

        try {
          const response = await axios.get(`${WEBSITE_API_URL}/admin/api/panels`, {
            headers: { 'x-bot-secret': API_SECRET }
          });
          const services = response.data.filter(s => s.is_active);
          if (services.length === 0) {
            await message.reply('❌ No services available. Please add services in the admin panel first.');
            dmConversations.delete(userId);
            return;
          }

          let serviceList = '**Which service is this drop for?**\n\nReply with the service name or number:\n\n';
          services.forEach((service, idx) => { serviceList += `${idx + 1}. ${service.service_name}\n`; });
          await message.reply(serviceList);
          conversation.availableServices = services;
          dmConversations.set(userId, conversation);
        } catch (error) {
          console.error('Error fetching services:', error);
          await message.reply('❌ Error fetching services. Please try again.');
          dmConversations.delete(userId);
        }

      } else if (conversation.step === 'service') {
        const input = message.content.trim();
        const services = conversation.availableServices;
        let selectedService = null;
        const serviceIndex = parseInt(input);
        if (!isNaN(serviceIndex) && serviceIndex >= 1 && serviceIndex <= services.length) {
          selectedService = services[serviceIndex - 1];
        } else {
          selectedService = services.find(s => s.service_name.toLowerCase() === input.toLowerCase());
        }

        if (!selectedService) {
          await message.reply('❌ Invalid service. Please reply with a valid service name or number from the list above.');
          return;
        }

        conversation.serviceName = selectedService.service_name;
        conversation.step = 'skus';

        await message.reply(`✅ Service set to: **${selectedService.service_name}**\n\n**Now send the SKU list** (one per line or comma-separated)\n\n_Example:_\n\`\`\`\nETB-001: Elite Trainer Box\nBB-001: Booster Box\nCB-001: Collector Box\n\`\`\`\n_Or:_\n\`\`\`\nETB-001: Elite Trainer Box, BB-001: Booster Box, CB-001: Collector Box\n\`\`\``);
        dmConversations.set(userId, conversation);

      } else if (conversation.step === 'skus') {
        const skuText = message.content.trim();
        const skus = [];
        const lines = skuText.split('\n').filter(line => line.trim());

        for (const line of lines) {
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

        const skuList = skus.map((s, i) => `${i + 1}. **${s.sku}**: ${s.name}`).join('\n');
        await message.reply({
          embeds: [{
            title: '✅ Drop Ready to Create',
            color: 0x57F287,
            fields: [
              { name: 'Drop Name', value: conversation.dropName },
              { name: 'Service', value: conversation.serviceName },
              { name: `SKUs (${skus.length})`, value: skuList }
            ]
          }]
        });

        await message.reply('Creating drop and adding button to your message...');

        try {
          const response = await axios.post(
            `${WEBSITE_API_URL}/api/discord-bot/create-drop`,
            {
              drop_name: conversation.dropName,
              service_name: conversation.serviceName,
              description: null,
              drop_date: null,
              skus: skus
            },
            { headers: { 'x-bot-secret': API_SECRET, 'Content-Type': 'application/json' } }
          );

          const dropId = response.data.drop_id;
          const channel = await client.channels.fetch(conversation.channelId);
          const originalMessage = await channel.messages.fetch(conversation.messageId);

          const row = new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId(`drop_manage_${dropId}`)
                .setLabel('⚙️ Manage Preferences')
                .setStyle(ButtonStyle.Primary)
            );

          await originalMessage.reply({
            content: `**${conversation.dropName}**\n\nClick below to manage your SKU preferences for this drop:`,
            components: [row]
          });

          await message.reply('✅ Drop created successfully! Button posted as a reply to your message. Users can now manage their preferences!');
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

  function parseSKULine(line) {
    const colonMatch = line.match(/^([A-Za-z0-9-_]+)\s*:\s*(.+)$/);
    if (colonMatch) return { sku: colonMatch[1], name: colonMatch[2].trim() };
    const dashMatch = line.match(/^([A-Za-z0-9-_]+)\s*-\s*(.+)$/);
    if (dashMatch) return { sku: dashMatch[1], name: dashMatch[2].trim() };
    return null;
  }

  // ==================== COMMANDS ====================

  async function handleDropsCommand(message) {
    try {
      const response = await axios.get(`${WEBSITE_API_URL}/api/discord-bot/list-drops`, {
        headers: { 'x-bot-secret': API_SECRET }
      });
      const drops = response.data.drops;
      if (drops.length === 0) { await message.reply('No active drops found.'); return; }

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

  async function handleDropInfoCommand(message, dropId) {
    try {
      const response = await axios.get(`${WEBSITE_API_URL}/api/discord-bot/drop-info/${dropId}`, {
        headers: { 'x-bot-secret': API_SECRET }
      });

      const drop = response.data.drop;
      const skus = JSON.parse(drop.skus || '[]');
      const preferences = response.data.preferences;
      const dropDate = drop.drop_date ? new Date(drop.drop_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'TBA';

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

      let skuBreakdown = '';
      skus.forEach(sku => {
        const count = preferences.by_sku[sku.sku] || 0;
        skuBreakdown += `• **${sku.sku}**: ${sku.name} (${count} users)\n`;
      });
      if (skuBreakdown) embed.addFields({ name: '📦 SKU Breakdown', value: skuBreakdown });

      embed.addFields({ name: '🔗 Admin Panel', value: `[View Preferences](${WEBSITE_API_URL}/admin/drops/${dropId}/preferences)` });
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

  // ==================== DASHBOARD FUNCTIONS ====================

  async function handleSetupDashboard(interaction) {
    try {
      const response = await axios.get(`${WEBSITE_API_URL}/api/discord-bot/latest-drops`, {
        headers: { 'x-bot-secret': API_SECRET }
      });
      const drops = response.data.drops || [];
      const embed = new EmbedBuilder()
        .setTitle('🎮 ACO Service Dashboard')
        .setColor(0x5865F2)
        .setDescription('Welcome to the ACO Service! Use the buttons below to navigate.')
        .setTimestamp();

      if (drops.length > 0) {
        drops.forEach((drop, index) => {
          const skuCount = drop.skus ? JSON.parse(drop.skus).length : 0;
          embed.addFields({
            name: `🔥 ${index === 0 ? 'Latest Drop' : `Drop ${index + 1}`}`,
            value: `**${drop.drop_name}**\n${drop.service_name || 'No service'} • ${skuCount} SKUs available`,
            inline: false
          });
        });
      } else {
        embed.addFields({ name: '🔥 Latest Drops', value: 'No drops available yet', inline: false });
      }

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('dashboard_view_services')
            .setLabel('📋 View All Services')
            .setStyle(ButtonStyle.Primary)
        );

      await interaction.reply({ embeds: [embed], components: [row] });
      console.log(`📊 Dashboard set up in channel ${interaction.channel.name} by ${interaction.user.username}`);
    } catch (error) {
      console.error('Error setting up dashboard:', error);
      await interaction.reply({ content: '❌ Error setting up dashboard. Please try again.', ephemeral: true });
    }
  }

  async function handleDashboardViewServices(interaction, isUpdate = false) {
    try {
      const response = await axios.get(`${WEBSITE_API_URL}/api/discord-bot/services`, {
        headers: { 'x-bot-secret': API_SECRET }
      });
      const services = response.data.services || [];

      if (!isUpdate) {
        const userId = interaction.user.id;
        if (!dashboardHistory.has(userId)) dashboardHistory.set(userId, []);
        dashboardHistory.get(userId).push('main');
      }

      const embed = new EmbedBuilder()
        .setTitle('📋 All Services')
        .setColor(0x5865F2)
        .setDescription('Select a service to view available drops')
        .setTimestamp();

      const rows = [];
      const serviceButtons = services.slice(0, 25).map(service =>
        new ButtonBuilder()
          .setCustomId(`dashboard_service_${service}`)
          .setLabel(service.charAt(0).toUpperCase() + service.slice(1))
          .setStyle(ButtonStyle.Secondary)
      );

      for (let i = 0; i < serviceButtons.length; i += 5) {
        rows.push(new ActionRowBuilder().addComponents(serviceButtons.slice(i, i + 5)));
      }

      rows.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('dashboard_return').setLabel('⬅️ Return').setStyle(ButtonStyle.Danger)
      ));

      const payload = { embeds: [embed], components: rows, ephemeral: true };
      if (isUpdate) { await interaction.update(payload); } else { await interaction.reply(payload); }
    } catch (error) {
      console.error('Error showing services:', error);
      const errorPayload = { content: '❌ Error loading services. Please try again.', embeds: [], components: [], ephemeral: true };
      if (isUpdate) { await interaction.update(errorPayload); } else { await interaction.reply(errorPayload); }
    }
  }

  async function handleDashboardService(interaction) {
    try {
      const serviceName = interaction.customId.replace('dashboard_service_', '');
      const response = await axios.get(`${WEBSITE_API_URL}/api/discord-bot/service-drops/${serviceName}`, {
        headers: { 'x-bot-secret': API_SECRET }
      });
      const drops = response.data.drops || [];

      const userId = interaction.user.id;
      if (!dashboardHistory.has(userId)) dashboardHistory.set(userId, []);
      dashboardHistory.get(userId).push('services');

      const embed = new EmbedBuilder()
        .setTitle(`${serviceName.charAt(0).toUpperCase() + serviceName.slice(1)} Drops`)
        .setColor(0x5865F2)
        .setDescription(drops.length > 0 ? 'Select a drop to view details and opt in to SKUs' : 'No drops available for this service')
        .setTimestamp();

      if (drops.length === 0) {
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('dashboard_return').setLabel('⬅️ Return').setStyle(ButtonStyle.Danger)
        );
        await interaction.update({ embeds: [embed], components: [row], ephemeral: true });
        return;
      }

      const dropOptions = drops.slice(0, 25).map(drop => ({
        label: drop.drop_name.substring(0, 100),
        description: `${JSON.parse(drop.skus || '[]').length} SKUs`,
        value: drop.id.toString()
      }));

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('dashboard_drop_select')
        .setPlaceholder('Select a drop')
        .addOptions(dropOptions);

      const row1 = new ActionRowBuilder().addComponents(selectMenu);
      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('dashboard_return').setLabel('⬅️ Return').setStyle(ButtonStyle.Danger)
      );

      await interaction.update({ embeds: [embed], components: [row1, row2], ephemeral: true });
    } catch (error) {
      console.error('Error showing service drops:', error);
      await interaction.reply({ content: '❌ Error loading drops. Please try again.', ephemeral: true });
    }
  }

  async function handleDashboardDropSelect(interaction) {
    const dropId = interaction.values[0];
    const userId = interaction.user.id;
    if (!dashboardHistory.has(userId)) dashboardHistory.set(userId, []);
    dashboardHistory.get(userId).push('service');

    try {
      const response = await axios.get(`${WEBSITE_API_URL}/api/discord-bot/drop-info/${dropId}`, {
        headers: { 'x-bot-secret': API_SECRET }
      });

      const { drop } = response.data;
      const skus = JSON.parse(drop.skus || '[]');

      let dropDateStr = 'TBA';
      if (drop.drop_date) {
        const date = new Date(drop.drop_date);
        dropDateStr = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      }

      const skuList = skus.map(s => `• **${s.sku}**: ${s.name}`).join('\n');

      const embed = new EmbedBuilder()
        .setTitle(`🔥 ${drop.drop_name}`)
        .setColor(0x5865F2)
        .addFields(
          { name: '📅 Drop Date', value: dropDateStr, inline: false },
          { name: '🛍️ Service', value: drop.service_name || 'No service', inline: true },
          { name: '📦 SKUs Available', value: `${skus.length} SKUs`, inline: true }
        )
        .setTimestamp();

      if (drop.description) embed.setDescription(drop.description);
      if (skuList) embed.addFields({ name: '📦 Products', value: skuList.length > 1024 ? skuList.substring(0, 1021) + '...' : skuList, inline: false });

      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`dashboard_drop_${dropId}`).setLabel('✅ Opt In to SKUs').setStyle(ButtonStyle.Success)
      );
      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('dashboard_return').setLabel('⬅️ Return').setStyle(ButtonStyle.Danger)
      );

      await interaction.update({ content: '', embeds: [embed], components: [row1, row2], ephemeral: true });
    } catch (error) {
      console.error('Error loading drop details:', error);
      await interaction.update({
        content: '❌ Error loading drop details. Please try again.',
        embeds: [],
        components: [new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('dashboard_return').setLabel('⬅️ Return').setStyle(ButtonStyle.Danger)
        )],
        ephemeral: true
      });
    }
  }

  async function handleDashboardDrop(interaction) {
    const dropId = interaction.customId.replace('dashboard_drop_', '');
    const discordId = interaction.user.id;

    const userId = interaction.user.id;
    if (!dashboardHistory.has(userId)) dashboardHistory.set(userId, []);
    dashboardHistory.get(userId).push('drop');

    try {
      const response = await axios.get(
        `${WEBSITE_API_URL}/api/discord-bot/drop-preferences/${dropId}/${discordId}`,
        { headers: { 'x-bot-secret': API_SECRET } }
      );

      const { drop_name, service_name, skus, preferences, user_submissions } = response.data;

      if (!user_submissions || user_submissions.length === 0) {
        await interaction.update({
          content: `❌ You don't have any **${service_name}** profiles registered.\n\nPlease register a ${service_name} profile on the website first to participate in this drop.`,
          embeds: [],
          components: [new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('dashboard_return').setLabel('⬅️ Return').setStyle(ButtonStyle.Danger)
          )],
          ephemeral: true
        });
        return;
      }

      let profileInfo = `**${drop_name}** (${service_name})\n\n`;
      profileInfo += `**Step 1:** Select which profile(s) you want to use for this drop.\n`;
      profileInfo += `**Step 2:** After selecting profiles, you'll choose which SKUs to run.\n\n`;
      profileInfo += `Available profiles:\n`;
      user_submissions.forEach(sub => {
        profileInfo += `• ${sub.profile_name || `Profile #${sub.id}`}\n`;
      });

      const profileOptions = user_submissions.map(sub => {
        const label = sub.profile_name || `Profile #${sub.id}`;
        let description = '';
        if (sub.first_name && sub.last_name) description += `${sub.first_name} ${sub.last_name}`;
        if (sub.email) description += description ? ` • ${sub.email}` : sub.email;
        if (sub.card_last_4) description += description ? ` • Card: ****${sub.card_last_4}` : `Card: ****${sub.card_last_4}`;
        if (!description) description = `Created: ${new Date(sub.created_at).toLocaleDateString()}`;
        if (description.length > 100) description = description.substring(0, 97) + '...';

        return new StringSelectMenuOptionBuilder()
          .setLabel(label.length > 100 ? label.substring(0, 97) + '...' : label)
          .setDescription(description)
          .setValue(sub.id.toString());
      });

      const profileSelectMenu = new StringSelectMenuBuilder()
        .setCustomId(`select_profiles_${dropId}`)
        .setPlaceholder('Select profile(s) to use')
        .setMinValues(1)
        .setMaxValues(user_submissions.length)
        .addOptions(profileOptions);

      const row1 = new ActionRowBuilder().addComponents(profileSelectMenu);
      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`dashboard_return_drop_${dropId}`).setLabel('⬅️ Return to Drop Details').setStyle(ButtonStyle.Danger)
      );

      await interaction.update({ content: profileInfo, embeds: [], components: [row1, row2], ephemeral: true });
    } catch (error) {
      console.error('Error loading drop preferences:', error);
      await interaction.update({
        content: '❌ Error loading drop. Please try again.',
        embeds: [],
        components: [new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('dashboard_return').setLabel('⬅️ Return').setStyle(ButtonStyle.Danger)
        )],
        ephemeral: true
      });
    }
  }

  async function handleDashboardReturnToDrop(interaction) {
    const dropId = interaction.customId.replace('dashboard_return_drop_', '');

    try {
      const response = await axios.get(`${WEBSITE_API_URL}/api/discord-bot/drop-info/${dropId}`, {
        headers: { 'x-bot-secret': API_SECRET }
      });

      const { drop } = response.data;
      const skus = JSON.parse(drop.skus || '[]');

      let dropDateStr = 'TBA';
      if (drop.drop_date) {
        const date = new Date(drop.drop_date);
        dropDateStr = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      }

      const skuList = skus.map(s => `• **${s.sku}**: ${s.name}`).join('\n');

      const embed = new EmbedBuilder()
        .setTitle(`🔥 ${drop.drop_name}`)
        .setColor(0x5865F2)
        .addFields(
          { name: '📅 Drop Date', value: dropDateStr, inline: false },
          { name: '🛍️ Service', value: drop.service_name || 'No service', inline: true },
          { name: '📦 SKUs Available', value: `${skus.length} SKUs`, inline: true }
        )
        .setTimestamp();

      if (drop.description) embed.setDescription(drop.description);
      if (skuList) embed.addFields({ name: '📦 Products', value: skuList.length > 1024 ? skuList.substring(0, 1021) + '...' : skuList, inline: false });

      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`dashboard_drop_${dropId}`).setLabel('✅ Opt In to SKUs').setStyle(ButtonStyle.Success)
      );
      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('dashboard_return').setLabel('⬅️ Return').setStyle(ButtonStyle.Danger)
      );

      await interaction.update({ content: '', embeds: [embed], components: [row1, row2], ephemeral: true });
    } catch (error) {
      console.error('Error loading drop details:', error);
      await interaction.update({
        content: '❌ Error loading drop details. Please try again.',
        embeds: [],
        components: [new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('dashboard_return').setLabel('⬅️ Return').setStyle(ButtonStyle.Danger)
        )],
        ephemeral: true
      });
    }
  }

  async function handleDashboardReturn(interaction) {
    const userId = interaction.user.id;
    const history = dashboardHistory.get(userId) || [];

    if (history.length === 0) {
      await interaction.update({ content: '❌ No previous view to return to.', embeds: [], components: [], ephemeral: true });
      return;
    }

    history.pop();
    dashboardHistory.set(userId, history);
    await handleDashboardViewServices(interaction, true);
  }

  // ==================== EVENT HANDLERS ====================

  client.on('ready', async () => {
    console.log(`✅ Discord bot logged in as ${client.user.tag}`);
    console.log(`📡 Monitoring channel: ${CHECKOUT_CHANNEL_ID}`);
    console.log(`📢 Public announcements channel: ${PUBLIC_CHECKOUT_CHANNEL_ID || 'Not configured'}`);
    console.log(`🔥 Drop announcements channel: ${DROP_ANNOUNCEMENT_CHANNEL_ID || 'Not configured'}`);
    console.log(`📝 Submission updates channel: ${SUBMISSION_UPDATES_CHANNEL_ID || 'Not configured'}`);
    console.log(`🌐 Website API: ${WEBSITE_API_URL}`);

    const commands = [
      new SlashCommandBuilder()
        .setName('setup-dashboard')
        .setDescription('Set up the ACO Service dashboard in this channel')
    ].map(command => command.toJSON());

    const rest = new REST({ version: '10' }).setToken(DISCORD_BOT_TOKEN);

    try {
      console.log('🔄 Registering slash commands...');
      await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
      console.log('✅ Slash commands registered globally');

      if (process.env.DISCORD_SERVER_ID) {
        await rest.put(Routes.applicationGuildCommands(client.user.id, process.env.DISCORD_SERVER_ID), { body: commands });
        console.log(`✅ Slash commands registered for guild ${process.env.DISCORD_SERVER_ID}`);
      }
    } catch (error) {
      console.error('❌ Error registering slash commands:', error);
    }

    setInterval(pollDropAnnouncements, 5000);
    console.log('✅ Started polling for drop announcements (every 5s)');

    setInterval(pollDropEdits, 5000);
    console.log('✅ Started polling for drop edits (every 5s)');
  });

  client.on('messageCreate', async (message) => {
    // Handle drop creation DMs
    if (message.channel.type === 1 && !message.author.bot) {
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
      if (content === '!drops') { await handleDropsCommand(message); return; }
      if (content.startsWith('!drop ')) {
        const dropId = content.split(' ')[1];
        await handleDropInfoCommand(message, dropId);
        return;
      }
    }

    // Checkout monitoring
    if (message.channel.id !== CHECKOUT_CHANNEL_ID) return;

    if (message.content.toLowerCase() === '!process' && message.reference) {
      try {
        const referencedMessage = await message.channel.messages.fetch(message.reference.messageId);
        if (referencedMessage && referencedMessage.embeds && referencedMessage.embeds.length > 0) {
          console.log('\n🔄 Manual processing requested for message:', referencedMessage.id);
          await processCheckoutMessage(referencedMessage);
          await message.delete().catch(() => {});
          return;
        }
      } catch (error) {
        console.error('Error processing referenced message:', error);
        await message.react('❌');
        return;
      }
    }

    if (!message.embeds || message.embeds.length === 0) return;
    await processCheckoutMessage(message);
  });

  client.on('messageReactionAdd', async (reaction, user) => {
    if (user.bot) return;

    if (reaction.partial) {
      try { await reaction.fetch(); } catch (error) { console.error('Error fetching reaction:', error); return; }
    }

    // Template channel reactions
    if (reaction.emoji.name === '🔥' && reaction.message.channelId === TEMPLATE_CHANNEL_ID) {
      console.log(`🔥 Template capture initiated by ${user.tag} on message ${reaction.message.id}`);
      try {
        await reaction.users.remove(user.id);
        const parsed = parseDropAnnouncement(reaction.message);

        await axios.post(
          `${WEBSITE_API_URL}/api/discord-bot/create-pending-template`,
          {
            message_id: reaction.message.id,
            channel_id: reaction.message.channelId,
            guild_id: reaction.message.guildId,
            message_url: `https://discord.com/channels/${reaction.message.guildId}/${reaction.message.channelId}/${reaction.message.id}`,
            message_content: reaction.message.content,
            embeds: reaction.message.embeds.map(e => ({
              title: e.title, description: e.description,
              fields: e.fields?.map(f => ({ name: f.name, value: f.value })),
              footer: e.footer?.text, author: e.author?.name,
              image: e.image?.url, thumbnail: e.thumbnail?.url, color: e.color
            })),
            attachments: reaction.message.attachments.map(a => ({
              url: a.url, name: a.name, contentType: a.contentType
            })),
            reacted_by: { discord_id: user.id, username: user.username },
            ...parsed
          },
          { headers: { 'x-bot-secret': API_SECRET, 'Content-Type': 'application/json' } }
        );

        await reaction.message.react('✅');
        console.log(`✅ Template created`);
      } catch (error) {
        console.error('Error creating template:', error.response?.data || error.message);
        await reaction.message.react('❌');
      }
      return;
    }

    // Drop announcement channel reactions
    if (reaction.emoji.name === '🔥' && reaction.message.channelId === DROP_ANNOUNCEMENT_CHANNEL_ID) {
      console.log(`🔥 Drop creation initiated by ${user.tag} on message ${reaction.message.id}`);
      try {
        await reaction.users.remove(user.id);
        const dmChannel = await user.createDM();
        const messageContent = reaction.message.content || 'No text content';
        const messageUrl = `https://discord.com/channels/${reaction.message.guildId}/${reaction.message.channelId}/${reaction.message.id}`;

        await dmChannel.send({
          embeds: [{
            title: '🔥 Create Drop from Message',
            description: `You reacted to a message to create a drop. Let's set it up!\n\n[Jump to message](${messageUrl})`,
            color: 0x5865F2,
            fields: [{ name: 'Message Preview', value: messageContent.substring(0, 1024) }]
          }]
        });

        await dmChannel.send('**What should we name this drop?**\n_Example: Pokemon 151 Elite Trainer Box Drop_');

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

  client.on('interactionCreate', async (interaction) => {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === 'setup-dashboard') {
        await handleSetupDashboard(interaction);
      }
    } else if (interaction.isButton()) {
      if (interaction.customId === 'dashboard_view_services') {
        await handleDashboardViewServices(interaction);
      } else if (interaction.customId.startsWith('dashboard_return_drop_')) {
        await handleDashboardReturnToDrop(interaction);
      } else if (interaction.customId === 'dashboard_return') {
        await handleDashboardReturn(interaction);
      } else if (interaction.customId.startsWith('dashboard_service_')) {
        await handleDashboardService(interaction);
      } else if (interaction.customId.startsWith('dashboard_drop_')) {
        await handleDashboardDrop(interaction);
      } else if (interaction.customId.startsWith('drop_manage_')) {
        await handleManagePreferences(interaction);
      } else if (interaction.customId.startsWith('sku_toggle_')) {
        await handleSKUToggle(interaction);
      }
    } else if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'dashboard_drop_select') {
        await handleDashboardDropSelect(interaction);
      } else if (interaction.customId.startsWith('select_profiles_')) {
        await handleInitialProfileSelection(interaction);
      }
    }
  });

  client.on('error', (error) => {
    console.error('Discord client error:', error);
  });

  // Login
  console.log('🤖 Starting Discord bot (merged mode)...');
  client.login(DISCORD_BOT_TOKEN).catch(err => {
    console.error('❌ Discord bot login failed:', err.message);
  });

  return client;
}

module.exports = { startBot };
