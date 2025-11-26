# Quick Start Guide

Get your ACO Service up and running in 15 minutes!

## Prerequisites Checklist

Before starting, make sure you have:
- [ ] Node.js installed (v16+)
- [ ] A Discord account
- [ ] A Discord server (or admin access to one)
- [ ] A Google account

## Step-by-Step Setup

### 1. Discord Application Setup (5 minutes)

1. **Create Discord Application**:
   - Go to https://discord.com/developers/applications
   - Click "New Application"
   - Name: "ACO Service"
   - Copy the **Application ID**

2. **Set up OAuth2**:
   - Go to "OAuth2" section
   - Add Redirect: `http://localhost:3000/auth/discord/callback`
   - Scopes: `identify`, `email`, `guilds`
   - Copy the **Client Secret**

3. **Create Bot**:
   - Go to "Bot" section
   - Click "Add Bot"
   - Enable intents: Server Members, Message Content
   - Copy the **Bot Token**

4. **Invite Bot**:
   - OAuth2 > URL Generator
   - Scopes: `bot`, `applications.commands`
   - Permissions: `277025392640`
   - Open the URL and add to your server

5. **Get Server ID**:
   - Enable Developer Mode in Discord
   - Right-click server > Copy ID

### 2. Install ACO Service (2 minutes)

```bash
# Navigate to project directory
cd "D:\AI Projects\Claude Projects\ACO Service"

# Install dependencies
npm install

# Copy environment file
copy .env.example .env
```

### 3. Configure Environment (3 minutes)

Edit `.env` file with your values:

```env
# Discord OAuth (from step 1)
DISCORD_CLIENT_ID=YOUR_APPLICATION_ID
DISCORD_CLIENT_SECRET=YOUR_CLIENT_SECRET
DISCORD_SERVER_ID=YOUR_SERVER_ID

# Discord Bot (from step 1)
DISCORD_BOT_TOKEN=YOUR_BOT_TOKEN

# Generate a random 32-character string for encryption
ENCRYPTION_KEY=abcdefghijklmnopqrstuvwxyz123456

# Session secret (random string)
SESSION_SECRET=your-random-secret-key-here

# Keep these as is for now
DISCORD_CALLBACK_URL=http://localhost:3000/auth/discord/callback
APP_URL=http://localhost:3000
DATABASE_PATH=./data/aco.db
```

### 4. Set Up Google Forms (5 minutes)

**Quick version** - Detailed guide in `GOOGLE_FORMS_SETUP.md`

1. **Create Form 1 - Login Required**:
   - Go to https://forms.google.com
   - Create new form
   - Add questions: Discord ID, Discord Username, Service Name, Account Username, Password, iMap, Shipping Info, Payment Info
   - Get form URL

2. **Create Form 2 - No Login**:
   - Create another form
   - Add questions: Discord ID, Discord Username, Service Name, Shipping Info, Payment Info
   - Get form URL

3. **Get Entry IDs**:
   - For each form, click "Get pre-filled link"
   - Fill in Discord ID and Username fields
   - Copy the URL
   - Extract entry IDs from URL:
     ```
     entry.123456789=TestID  <- This is your Discord ID entry
     entry.987654321=TestUser <- This is your Discord Username entry
     ```

4. **Update .env**:
   ```env
   FORM_LOGIN_SERVICES=https://docs.google.com/forms/d/e/YOUR_FORM_1_ID/viewform
   FORM_NO_LOGIN_SERVICES=https://docs.google.com/forms/d/e/YOUR_FORM_2_ID/viewform
   FORM_LOGIN_DISCORD_ID_ENTRY=entry.123456789
   FORM_LOGIN_DISCORD_USERNAME_ENTRY=entry.987654321
   FORM_NO_LOGIN_DISCORD_ID_ENTRY=entry.111111111
   FORM_NO_LOGIN_DISCORD_USERNAME_ENTRY=entry.222222222
   ```

### 5. Initialize Database (1 minute)

```bash
npm run init-db
```

Expected output:
```
✅ Database initialized successfully!
```

### 6. Start the Application (1 minute)

**Terminal 1 - Web Server**:
```bash
npm run dev
```

**Terminal 2 - Discord Bot**:
```bash
npm run bot
```

You should see:
```
ACO Service running on http://localhost:3000
Discord bot logged in as ACO Service#1234
```

## Testing Your Setup

### Test 1: Website Access
1. Open browser: http://localhost:3000
2. You should see the landing page

### Test 2: Discord Login
1. Click "Login with Discord"
2. Authorize the application
3. You should be redirected to the dashboard

### Test 3: Server Verification
1. After login, check if you see the dashboard
2. If you see "Not in server" - make sure you're in the Discord server
3. If successful, you'll see available services

### Test 4: Form Integration
1. Click on any service (e.g., Target)
2. Click "Fill Out Form"
3. Google Form should open with your Discord ID and Username pre-filled
4. If pre-fill works, setup is complete!

### Test 5: Discord Bot
1. Go to your Discord server
2. Type `/help`
3. You should see the bot respond with help information
4. Type `/status` to check your subscriptions

## Common Issues & Quick Fixes

### Issue: "Redirect URI mismatch"
**Fix**: In Discord Developer Portal, make sure redirect URI is exactly:
```
http://localhost:3000/auth/discord/callback
```

### Issue: Bot is offline
**Fix**:
1. Check bot token in `.env`
2. Make sure you ran `npm run bot`
3. Check bot has Server Members Intent enabled

### Issue: "Not in server" error
**Fix**:
1. Verify you're in the Discord server
2. Check DISCORD_SERVER_ID is correct
3. Make sure OAuth includes `guilds` scope

### Issue: Forms not pre-filling
**Fix**:
1. Double-check entry IDs in `.env`
2. Test the prefill URL manually
3. Make sure form questions weren't modified

### Issue: Database errors
**Fix**:
```bash
# Delete and recreate database
del data\aco.db
npm run init-db
```

## Next Steps

Once everything is working:

1. **Customize Services**:
   - Edit `src/models/Service.js` to add/remove retailers

2. **Customize Appearance**:
   - Edit `public/css/style.css` for styling
   - Modify views in `views/` folder

3. **Set Up Form Processing**:
   - Link Google Forms to Sheets
   - Set up form submission notifications
   - Create automated processing scripts

4. **Production Deployment**:
   - Get a domain name
   - Set up VPS/hosting
   - Configure SSL certificate
   - Update environment variables for production

5. **Add Features**:
   - Implement actual checkout automation
   - Add drop monitoring
   - Set up Discord webhooks
   - Create admin panel

## Getting Help

If you're stuck:

1. **Check logs**:
   ```bash
   # Web server logs show in Terminal 1
   # Discord bot logs show in Terminal 2
   ```

2. **Review documentation**:
   - `README.md` - Full documentation
   - `GOOGLE_FORMS_SETUP.md` - Detailed form setup

3. **Common commands**:
   ```bash
   npm run dev        # Start web server (development)
   npm run bot        # Start Discord bot
   npm run init-db    # Initialize database
   npm start          # Start web server (production)
   ```

## Success! 🎉

If all tests pass, your ACO Service is ready to use!

Users can now:
- Login with Discord
- Choose services
- Fill out forms
- Track subscriptions
- Use Discord bot commands

Happy collecting! 🎯⚡
