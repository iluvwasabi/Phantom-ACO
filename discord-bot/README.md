# Discord Checkout Monitor Bot

This bot monitors your Discord checkout channel and automatically creates orders in your Phantom ACO admin panel when Stellar, Refract, or Valor bots post successful checkouts.

## How It Works

1. **Bot monitors Discord channel** → Watches for checkout messages from your bots
2. **Parses checkout data** → Extracts retailer, product, price, email, order number
3. **Matches to customer** → Finds the customer by matching email to their submission
4. **Creates pending order** → Adds order to admin panel for review/approval
5. **You approve & invoice** → Review pricing, approve, send Stripe invoice

## Setup Instructions

### 1. Create Discord Bot Application

1. Go to https://discord.com/developers/applications
2. Click **"New Application"**
3. Name it "Phantom ACO Monitor" (or whatever you want)
4. Go to **"Bot"** tab in left sidebar
5. Click **"Add Bot"**
6. Under **"Privileged Gateway Intents"**, enable:
   - ✅ **Message Content Intent** (required to read messages)
   - ✅ **Server Members Intent** (optional but recommended)
7. Click **"Reset Token"** and copy the bot token
8. Save this token securely - you'll need it for `.env`

### 2. Invite Bot to Your Server

1. Go to **"OAuth2"** → **"URL Generator"**
2. Select scopes:
   - ✅ `bot`
3. Select bot permissions:
   - ✅ Read Messages/View Channels
   - ✅ Read Message History
   - ✅ Add Reactions (optional, for visual feedback)
4. Copy the generated URL at the bottom
5. Paste in browser and invite bot to your server
6. Select your server and authorize

### 3. Get Channel ID

1. In Discord, enable Developer Mode:
   - Settings → Advanced → Developer Mode (toggle ON)
2. Right-click your checkout channel
3. Click **"Copy Channel ID"**
4. Save this ID - you'll need it for `.env`

### 4. Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and fill in:
   ```env
   # Your Discord bot token from step 1
   DISCORD_BOT_TOKEN=MTIzNDU2Nzg5MDEyMzQ1Njc4OQ.GhIjKl.MnOpQrStUvWxYz...

   # Your checkout channel ID from step 3
   DISCORD_CHECKOUT_CHANNEL_ID=1234567890123456789

   # Your website URL (use production URL when deploying)
   WEBSITE_API_URL=https://phantomaco.com

   # Create a secure random string (can be anything secure)
   DISCORD_BOT_API_SECRET=super_secret_random_string_12345
   ```

3. **IMPORTANT**: Add the same `DISCORD_BOT_API_SECRET` to your Render environment variables:
   - Go to https://dashboard.render.com
   - Click your Phantom ACO service
   - Go to "Environment"
   - Add: `DISCORD_BOT_API_SECRET` = (same value as in bot `.env`)

### 5. Install Dependencies

```bash
cd discord-bot
npm install
```

### 6. Test Locally

```bash
npm run dev
```

You should see:
```
🤖 Starting Discord checkout monitor bot...
✅ Discord bot logged in as Phantom ACO Monitor#1234
📡 Monitoring channel: 1234567890123456789
🌐 Website API: https://phantomaco.com
```

Test by posting a message in your checkout channel. The bot should:
- ✅ React to the message with a checkmark
- ✅ Create an order in `/admin/orders`

### 7. Deploy Bot (24/7 Hosting)

The bot needs to run 24/7 to monitor Discord. Here are your options:

#### Option A: Run on Your Computer

**Pros:** Free, easy
**Cons:** Bot stops when computer turns off

```bash
npm start
```

Keep this terminal window open.

#### Option B: Deploy to Render (Recommended)

**Pros:** Runs 24/7, free tier available
**Cons:** Requires separate service

1. Create new `discord-bot` folder in GitHub repo
2. Add `discord-bot/` files to git:
   ```bash
   git add discord-bot/
   git commit -m "Add Discord checkout monitor bot"
   git push
   ```
3. In Render dashboard, create new **"Background Worker"**
4. Connect to your GitHub repo
5. Set:
   - **Build Command:** `cd discord-bot && npm install`
   - **Start Command:** `cd discord-bot && npm start`
6. Add environment variables (same as `.env`)
7. Deploy!

#### Option C: Raspberry Pi / VPS

Run on any always-on machine:

```bash
npm install pm2 -g
pm2 start index.js --name phantom-aco-bot
pm2 save
pm2 startup
```

## Supported Bots

✅ **Refract** - Fully supported (parses all fields)
✅ **Stellar** - Fully supported (parses all fields)
⏳ **Valor** - Need to see checkout message format to add support

To add Valor support, send me a screenshot of a Valor checkout message!

## Troubleshooting

### Bot doesn't respond to messages

1. Check bot has **Message Content Intent** enabled in Discord Developer Portal
2. Verify `DISCORD_CHECKOUT_CHANNEL_ID` matches your checkout channel
3. Check bot has permission to read messages in that channel

### Bot responds but order doesn't appear in admin panel

1. Check `DISCORD_BOT_API_SECRET` matches in both bot `.env` and Render environment
2. Check `WEBSITE_API_URL` is correct (https://phantomaco.com)
3. Look at bot console logs for error messages

### Email not matching to customer

The bot tries to match the email from the checkout message to customer submissions. If it can't find a match:
- Order is still created, but without a linked customer
- You can manually link it in `/admin/orders`
- Make sure customers use the same email in their submission and for checkouts

## How Orders Are Created

1. Bot receives checkout message
2. Parses: retailer, product, price, quantity, email, order number
3. Calculates order total: `price × quantity`
4. Calculates 7% fee: `total × 0.07`
5. Tries to match email to customer submission
6. Creates order with status: `pending_review`
7. Sends Discord notification to admin (if `ADMIN_DISCORD_WEBHOOK` is set)
8. You review in `/admin/orders`
9. You can edit price if bot reported wrong amount
10. You approve → Stripe invoice sent automatically

## Files

- `index.js` - Main bot code
- `package.json` - Dependencies
- `.env` - Configuration (don't commit this!)
- `.env.example` - Example configuration
- `README.md` - This file
