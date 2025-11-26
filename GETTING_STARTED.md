# Getting Started with ACO Service

Welcome! This guide will get you up and running with ACO Service in under 30 minutes.

## What You're Building

A simple Auto-Checkout service dashboard that allows Pokemon collectors to:
- Login via Discord OAuth (no bot needed)
- Choose from 5 different retailer services
- Submit their information via Google Forms (pre-filled with Discord data)
- Track their subscriptions

**What you're NOT building:**
- ❌ Discord bot with commands
- ❌ CAPTCHA solving infrastructure
- ❌ Custom checkout bots (you're renting Refract/Valor)

## Prerequisites

Before you start, make sure you have:

1. **Node.js installed** (v16 or higher)
   - Download from: https://nodejs.org
   - Verify: `node --version`

2. **A Discord account**
   - Sign up at: https://discord.com

3. **A Discord server** (where your customers will come from)
   - You need admin access to get the Server ID

4. **A Google account**
   - For creating Google Forms

5. **Refract/Valor bot access** (you already have this)
   - $100/month rental
   - Handles checkout automation + CAPTCHA

---

## Quick Start (30 Minutes)

### Step 1: Install Dependencies (2 minutes)

```bash
# Navigate to project directory
cd "D:\AI Projects\Claude Projects\ACO Service"

# Install dependencies
npm install

# Verify installation
npm list --depth=0
```

### Step 2: Discord OAuth Setup (10 minutes)

**See README.md for interactive step-by-step walkthrough**

The README will guide you through:
1. Creating Discord Application
2. Getting Client ID and Client Secret
3. Adding OAuth redirect URL
4. Getting your Server ID

### Step 3: Generate Security Keys (1 minute)

```bash
npm run generate-keys
```

Save the output - you'll need these keys for your .env file.

### Step 4: Create .env File (5 minutes)

```bash
# Copy template
copy .env.example .env

# Edit with your values
notepad .env
```

Fill in:
- `DISCORD_CLIENT_ID` - From Discord Developer Portal
- `DISCORD_CLIENT_SECRET` - From Discord Developer Portal
- `DISCORD_SERVER_ID` - Your Discord server ID
- `ENCRYPTION_KEY` - From generate-keys output
- `SESSION_SECRET` - From generate-keys output

**Note:** Leave Google Forms fields empty for now - we'll set those up next.

### Step 5: Database Initialization (1 minute)

```bash
npm run init-db
```

Expected output:
```
✅ Database initialized successfully!

Created tables:
  - users
  - service_subscriptions
  - encrypted_credentials
  - form_submissions
  - user_sessions
```

### Step 6: Start the Server (1 minute)

```bash
npm run dev
```

Expected output:
```
ACO Service running on http://localhost:3000
Environment: development
```

**Open browser:** http://localhost:3000

You should see your landing page!

### Step 7: Test Discord Login (2 minutes)

1. Click "Login with Discord"
2. Authorize the application
3. You should redirect to dashboard
4. ✅ Pass if you see "Welcome, [YourUsername]!"

### Step 8: Google Forms Setup (10 minutes)

**See GOOGLE_FORMS_SETUP.md for detailed instructions**

Quick overview:
1. Create 2 Google Forms (Login Required & No Login services)
2. Extract entry IDs for Discord ID and Username fields
3. Add form URLs and entry IDs to .env
4. Restart server

---

## Verify Everything Works

### Test 1: Website Access
1. Open browser: http://localhost:3000
2. ✅ You should see the landing page with Pokemon theme

### Test 2: Discord Login
1. Click "Login with Discord"
2. Authorize the application
3. ✅ You should redirect to dashboard

### Test 3: Service Display
1. On dashboard, check you see:
   - Login Required Services (Target, Walmart, Best Buy)
   - No Login Services (Pokemon Center, Shopify)
2. ✅ All 5 services should be visible

### Test 4: Form Integration (after Step 8)
1. Click on "Target" service
2. Click "Subscribe" button
3. Google Form should open
4. ✅ Check if "Discord ID" and "Discord Username" are pre-filled

---

## Troubleshooting

### Issue: "Cannot find module"
**Solution:**
```bash
rm -rf node_modules
npm install
```

### Issue: "Port 3000 already in use"
**Solution:**
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID [PID_NUMBER] /F

# Linux/Mac
lsof -ti:3000 | xargs kill -9
```

### Issue: Discord OAuth error
**Solution:**
- Verify DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET in .env
- Check redirect URI matches exactly: `http://localhost:3000/auth/discord/callback`
- Ensure you saved the Client Secret (you only see it once!)

### Issue: Forms not prefilling
**Solution:**
- Double-check entry IDs in .env
- Test manual prefill in browser:
  ```
  YOUR_FORM_URL?entry.123456789=TestID&entry.987654321=TestUser
  ```
- Entry IDs change if you edit form questions

### Issue: "Not in server" error
**Solution:**
- Verify DISCORD_SERVER_ID is correct
- User must be a member of that Discord server
- OAuth scope must include `guilds`

---

## Your Monthly Costs

**Fixed Costs: $785/month**
- Refract/Valor bot rental: $100/month
- Residential proxies: $680/month
- Web hosting (Railway/Vercel): $5/month

**Breakeven: 45 customers** (achievable in 2-3 weeks with Discord partnership)

---

## Next Steps

### 1. Complete Setup
- [ ] Discord OAuth configured
- [ ] Google Forms created
- [ ] Forms prefilling correctly
- [ ] Test login flow

### 2. Prepare for Launch
- [ ] Reach out to 20 Pokemon Discord servers
- [ ] Get 1-2 partnership agreements
- [ ] Prepare announcement copy
- [ ] Create demo video/screenshots

### 3. Launch (Week 1-2)
- [ ] Announce in Discord
- [ ] Get first 30-40 customers
- [ ] Test Refract/Valor checkout flow
- [ ] Collect testimonials

### 4. Scale (Week 3+)
- [ ] Hit 45+ customers (breakeven!)
- [ ] Set up Stripe payments
- [ ] Automate Refract/Valor integration
- [ ] Expand to more Discord communities

---

## Common Commands

```bash
# Development
npm run dev                 # Start web server with auto-reload
npm run generate-keys       # Generate encryption keys

# Database
npm run init-db            # Initialize database

# Production (when ready)
npm start                  # Start web server
```

---

## What You DON'T Need

- ❌ Discord bot with slash commands (just OAuth login)
- ❌ `discord.js` library (can remove if installed)
- ❌ PM2 bot process management (only need web server)
- ❌ Bot token (only need OAuth Client ID/Secret)
- ❌ Complex server infrastructure
- ❌ CAPTCHA solving services (Refract/Valor handles it)

**Keep it simple!**

---

## Success Checklist

- [ ] Node.js installed
- [ ] Dependencies installed (`npm install`)
- [ ] Discord OAuth application created
- [ ] .env file configured
- [ ] Google Forms created
- [ ] Entry IDs extracted
- [ ] Database initialized
- [ ] Web server running
- [ ] Website accessible
- [ ] Login works
- [ ] Forms prefill correctly

---

## You're Ready!

Once all tests pass, your ACO Service is operational!

Users can now:
1. Visit your website
2. Login with Discord OAuth
3. Choose services
4. Fill out forms (pre-filled with their Discord data)
5. Submit information for checkout

**You'll use Refract/Valor to execute checkouts with their credentials.**

**Happy collecting! 🎯⚡**

---

**Need detailed help?** Check README.md for interactive Discord OAuth walkthrough.

**Ready to deploy?** See DEPLOYMENT_CHECKLIST.md for production setup.

**Business strategy?** See FINAL-NUMBERS-SUMMARY.md and ACO-Service-Gameplan.md.
