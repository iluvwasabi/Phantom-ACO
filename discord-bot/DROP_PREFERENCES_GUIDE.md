# Discord Bot Drop Preferences Implementation Guide

This guide explains how to add drop preference management to the existing Discord bot.

## Overview

The drop preference system allows users to opt in/out of specific SKUs for drop announcements via Discord button interactions.

## Prerequisites

- Existing Discord bot with `discord.js` v14+
- Bot has necessary permissions in your server
- Web API endpoints are already implemented (in `src/routes/discord-bot.js`)

## Required Changes to `index.js`

### 1. Add Required Imports

At the top of `discord-bot/index.js`, add:

```javascript
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
```

### 2. Update Client Intents

Ensure your client has the necessary intents (already exists, but verify):

```javascript
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    // Add if not present:
    GatewayIntentBits.GuildMessageReactions
  ]
});
```

### 3. Add Drop Announcement Queue Polling

Add this function to poll for drop announcements from the web API:

```javascript
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

// Start polling when bot is ready
client.once('ready', () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);

  // Poll for drop announcements every 5 seconds
  setInterval(pollDropAnnouncements, 5000);
});
```

### 4. Add Drop Announcement Posting Function

```javascript
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

    // TODO: Send message ID back to web API to store
    // You can make a PATCH request to update the drop with the discord_message_id
    // await axios.patch(`${WEBSITE_API_URL}/admin/drops/${drop_id}`, {
    //   discord_message_id: message.id
    // }, {
    //   headers: { 'x-bot-secret': API_SECRET }
    // });

  } catch (error) {
    console.error('Error posting drop announcement:', error);
  }
}
```

### 5. Add Interaction Handler

```javascript
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

    // If more than 5 rows (>25 buttons), you'll need pagination
    // For now, we'll limit to 25 SKUs max
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
```

## Environment Variables

Add to `discord-bot/.env`:

```env
WEBSITE_API_URL=http://localhost:3000
DISCORD_BOT_API_SECRET=your-shared-secret-here
```

## Testing

1. **Start the web server**: `npm start` (in main directory)
2. **Start the Discord bot**: `cd discord-bot && node index.js`
3. **Create a drop** via `/admin/drops` in the web interface
4. **Post to Discord** - click "Post to Discord" button in admin panel
5. **Wait 5 seconds** - bot polls every 5 seconds and will post the announcement
6. **Click "Manage Preferences"** button in Discord
7. **Toggle SKUs** - click SKU buttons to opt in/out
8. **View preferences** - go to `/admin/drops/{id}/preferences` in web interface

## Flow Diagram

```
1. Admin creates drop in web UI
   └─> Stores drop in database

2. Admin clicks "Post to Discord"
   └─> Web API queues announcement
   └─> Returns placeholder message_id

3. Discord bot polls queue every 5s
   └─> Fetches queued announcements
   └─> Posts embed with "Manage Preferences" button
   └─> Stores real message_id

4. User clicks "Manage Preferences"
   └─> Bot fetches drop SKUs and user preferences
   └─> Replies with SKU buttons (ephemeral)

5. User clicks SKU button
   └─> Bot sends toggle request to web API
   └─> API updates preference in database
   └─> Bot updates button appearance

6. Admin views preferences
   └─> Web UI shows all users and their opted SKUs
   └─> Admin can export to CSV
```

## Troubleshooting

### Button interactions not working
- Ensure bot has `GatewayIntentBits.GuildMessageReactions` intent
- Verify `DISCORD_BOT_API_SECRET` matches between web and bot
- Check bot has permission to send messages in the channel

### Drop announcements not posting
- Verify `DROP_ANNOUNCEMENT_CHANNEL_ID` is correct in web `.env`
- Check bot has access to the channel
- Verify polling is running (check bot console logs)

### Preferences not saving
- Check `WEBSITE_API_URL` points to correct web server
- Verify API secret matches
- Check database migration ran successfully

## Next Steps

1. Implement pagination for >25 SKUs
2. Add DM confirmations when users opt in
3. Add reminder DMs before drop date
4. Implement SKU capacity limits
5. Add drop status updates (sold out, delayed, etc.)
