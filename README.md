# ACO Service - Pokemon Auto Checkout System

A simple Auto-Checkout service with Discord OAuth authentication, web dashboard, and Stripe payments. Built for Pokemon TCG collectors to secure drops without dealing with scalpers.

---

## 🎯 What This Is

**Your customers:**
- Login with Discord (no signup required)
- Select which retailers they want (Target, Walmart, Pokemon Center, etc.)
- Fill out Google Form with their shipping/payment info
- You use **Refract/Valor bots** to checkout for them
- They pay you 7% only on successful checkouts via Stripe

**What you're building:**
- Simple web server with Discord OAuth
- Dashboard showing available services
- Google Forms integration (auto-filled with Discord info)
- Stripe payment processing

**What you're NOT building:**
- ❌ Custom checkout bots (you rent Refract/Valor)
- ❌ Discord bot with commands (just OAuth login)
- ❌ CAPTCHA solving (Refract/Valor handles it)

---

## 💰 Your Costs

**Fixed Monthly Costs: $785**
- Refract/Valor bot rental: $100/month
- Residential proxies: $680/month
- Web hosting (Railway/Vercel): $5/month

**Breakeven: 45 customers (2-3 weeks with Discord partnership)**

**Revenue at scale:**
- 100 customers: $1,000/month profit ($12k/year)
- 200 customers: $2,785/month profit ($33k/year)
- 500 customers: $8,139/month profit ($97k/year)

---

## 📋 Prerequisites

Before starting:
- **Node.js** (v16+) and npm
- **Discord account** (for OAuth setup)
- **Google account** (for forms)
- **Stripe account** (for payments - can set up later)
- **Refract/Valor bot access** (you already have this)

---

## 🚀 Quick Start (30 Minutes)

### Step 1: Install Dependencies (2 minutes)

```bash
cd "D:\AI Projects\Claude Projects\ACO Service"
npm install
```

### Step 2: Set Up Discord OAuth (10 minutes)

I'll walk you through this step-by-step. You'll need to:
1. Create a Discord Application
2. Get your Client ID and Client Secret
3. Add OAuth redirect URL

**Let's do this now!** 👇

---

## 🔧 Discord OAuth Setup (Interactive)

I'll guide you through each step. Open this in a browser: https://discord.com/developers/applications

**Step 1: Create Application**
1. Click "New Application"
2. Name it: "ACO Service" (or whatever you want)
3. Click "Create"

**✅ Done? Reply with: "Created app"**

---

**Step 2: Get Client ID**
1. You should see "APPLICATION ID" at the top
2. Copy that number

**✅ Paste your Client ID here →**

---

**Step 3: Get Client Secret**
1. Go to "OAuth2" section (left sidebar)
2. Under "Client Secret", click "Reset Secret"
3. Copy the secret (you'll only see this once!)

**✅ Paste your Client Secret here →**

---

**Step 4: Add Redirect URL**
1. Still in "OAuth2" section
2. Click "Add Redirect" under "Redirects"
3. Add: `http://localhost:3000/auth/discord/callback`
4. Click "Save Changes"

For production later, you'll add: `https://yourdomain.com/auth/discord/callback`

**✅ Done? Reply with: "Added redirect"**

---

**Step 5: Get Server ID** (Your Discord server where users will come from)
1. Open Discord
2. Enable Developer Mode: Settings → Advanced → Developer Mode (ON)
3. Right-click your server icon
4. Click "Copy Server ID"

**✅ Paste your Server ID here →**

---

### Step 3: Configure Environment Variables (5 minutes)

Once you give me the IDs above, I'll create your `.env` file automatically!

You'll also need to generate:
- **Session Secret** (random string for security)
- **Encryption Key** (32 characters for encrypting user data)

I can generate these for you. **Ready?**

---

### Step 4: Set Up Google Forms (10 minutes)

You'll create 2 Google Forms:

**Form 1: Login Required Services** (Target, Walmart, Best Buy)
- Discord ID (Short answer)
- Discord Username (Short answer)
- Service (Dropdown: Target, Walmart, Best Buy)
- Account Username (Short answer)
- Account Password (Short answer)
- iMap (Paragraph)
- Shipping Address (Paragraph)
- Payment Method (Paragraph)

**Form 2: No Login Services** (Pokemon Center, Shopify)
- Discord ID (Short answer)
- Discord Username (Short answer)
- Service (Dropdown: Pokemon Center, Shopify)
- Shipping Address (Paragraph)
- Payment Method (Paragraph)

After you create these, I'll show you how to get the "entry IDs" for prefilling.

**📝 Note:** Detailed form setup guide is in `GOOGLE_FORMS_SETUP.md`

---

### Step 5: Initialize Database (1 minute)

```bash
npm run init-db
```

This creates your SQLite database with all necessary tables.

---

### Step 6: Start the Server (1 minute)

```bash
npm run dev
```

Open browser: `http://localhost:3000`

You should see your landing page!

---

## 📁 Project Structure (Simplified)

```
ACO Service/
├── src/
│   ├── server.js              # Main web server (Express + Discord OAuth)
│   ├── config/
│   │   ├── database.js        # SQLite setup
│   │   └── passport.js        # Discord OAuth config
│   ├── models/
│   │   ├── User.js            # User model
│   │   └── Service.js         # Service subscriptions
│   ├── routes/
│   │   ├── auth.js            # Login/logout routes
│   │   └── dashboard.js       # Dashboard routes
│   ├── middleware/
│   │   └── auth.js            # Check if user is logged in
│   └── utils/
│       ├── initDatabase.js    # Database setup
│       └── encryption.js      # Encrypt user credentials
├── views/                     # EJS templates (dashboard, landing page)
├── public/                    # CSS, images
├── data/                      # SQLite database (auto-created)
├── .env                       # Your config (create from .env.example)
└── package.json               # Dependencies
```

**What's NOT here:**
- ❌ `src/bot.js` (removed - no Discord bot needed)
- ❌ CAPTCHA solving code (Refract/Valor handles this)
- ❌ Custom checkout automation (Refract/Valor does this)

---

## 🔄 How It Works

### User Flow:
```
1. User visits your website
2. Clicks "Login with Discord"
3. Discord authorizes → redirects to dashboard
4. User selects service (Target, Walmart, etc.)
5. Clicks "Subscribe" → Opens Google Form (pre-filled with Discord ID/username)
6. User fills in shipping/payment info
7. Submits form
8. Your system records: "User X subscribed to Target"
```

### When a Drop Happens:
```
1. You trigger Refract/Valor checkout for Target drop
2. Refract/Valor uses customer credentials (from Google Form responses)
3. Refract/Valor executes checkout
4. If successful:
   - Customer gets product confirmation
   - Stripe charges customer 7% of product value
   - You keep payment (minus Stripe 2.9% + $0.30)
```

---

## 💳 Stripe Integration (Set Up Later)

When you're ready to accept payments:

1. Create Stripe account: https://stripe.com
2. Get API keys (test mode first)
3. Add to `.env`:
   ```
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```
4. Install Stripe SDK: `npm install stripe`
5. Implement checkout flow (I'll help with this when ready)

---

## 🤖 Refract/Valor Integration

Your Refract/Valor setup (you already have this):
- **Cost:** $100/month rental
- **Proxies:** $680/month (required)
- **They handle:** Checkout execution, CAPTCHA solving, anti-bot evasion

**How to connect:**
1. When customer subscribes via Google Form
2. Export form responses to CSV/Sheets
3. Feed customer data to Refract/Valor (their dashboard/API)
4. They execute checkouts for you
5. Report back success/failure
6. You charge customer via Stripe if successful

**📝 Note:** Refract/Valor integration details will depend on their specific API/interface. This is manual initially, can automate later.

---

## 📊 Database Schema

### users
- Discord ID, username, avatar, email
- Created date, last login
- Server membership verified

### service_subscriptions
- User ID (which user)
- Service type (Target, Walmart, Pokemon Center, etc.)
- Form submission ID (link to Google Form response)
- Status (active/inactive)
- Created/updated timestamps

### encrypted_credentials
- Subscription ID
- Encrypted username (for retailer)
- Encrypted password
- Encrypted iMap data

### form_submissions
- User ID
- Form type (login required / no login)
- Service name
- Submission timestamp

---

## 🔒 Security

**What's protected:**
- AES-256 encryption for user credentials
- Secure sessions (SQLite storage, 7-day expiry)
- Rate limiting on auth endpoints
- CSRF protection
- Helmet security headers
- SQL injection prevention (parameterized queries)

**Environment variables (never commit to git):**
- Discord secrets
- Encryption keys
- Session secrets
- Stripe keys

---

## 🚀 Deployment (When Ready)

### Option 1: Railway (Recommended - $5/month)
```bash
1. Push to GitHub
2. Connect Railway to repo
3. Add environment variables in Railway dashboard
4. Deploy (automatic)
```

### Option 2: Vercel + Serverless
```bash
1. Deploy frontend to Vercel (free)
2. Use Vercel Serverless Functions for OAuth
3. Database on Railway ($5/month)
```

### Option 3: Traditional VPS (DigitalOcean, etc.)
```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone repo
git clone your-repo aco-service
cd aco-service
npm install --production

# Set up .env
nano .env

# Run with PM2
npm install -g pm2
pm2 start src/server.js --name "aco-web"
pm2 save
pm2 startup
```

**For production:**
- Update `DISCORD_CALLBACK_URL` to your domain
- Get SSL certificate (Let's Encrypt)
- Set `NODE_ENV=production`

---

## 🐛 Troubleshooting

### "Redirect URI mismatch"
- Check Discord Developer Portal → OAuth2 → Redirects
- Must exactly match your `.env` DISCORD_CALLBACK_URL
- Include http:// or https://

### "Not in server" error
- Verify DISCORD_SERVER_ID is correct
- User must be in that Discord server
- OAuth scope must include `guilds`

### Google Forms not prefilling
- Check entry IDs in `.env`
- Test prefill URL manually
- Form questions can't be modified after getting entry IDs

### Database errors
- Run `npm run init-db` again
- Check file permissions on `data/` folder
- Close any other programs accessing the DB

---

## 📚 Additional Documentation

- **TECH-STACK.md** - Detailed tech overview
- **FINAL-NUMBERS-SUMMARY.md** - Business model, costs, revenue projections
- **FINAL-PRICING-AND-LAUNCH-PLAN.md** - Complete launch strategy
- **ACO-Service-Gameplan.md** - Full business gameplan
- **GOOGLE_FORMS_SETUP.md** - Detailed form setup guide

---

## 🎯 Next Steps

**This Week:**
1. ✅ Set up Discord OAuth (I'll walk you through)
2. ✅ Create Google Forms
3. ✅ Test login flow locally
4. 📧 Reach out to 20 Pokemon Discord servers for partnerships
5. 🚀 Launch in first Discord (get 30-50 signups)

**Week 2-3:**
- Hit 45 customers (BREAKEVEN!)
- Set up Stripe for payments
- Integrate Refract/Valor checkout flow
- Execute first successful drops

**Month 2+:**
- Scale to 100-200 customers
- Automate Refract/Valor integration
- Expand to more Discord communities

---

## 💪 Your Advantages

**vs Building Everything from Scratch:**
- ✅ Rent Refract/Valor ($100/month vs $10k+ to build)
- ✅ Simple OAuth only (no complex bot)
- ✅ Low hosting costs ($5 vs $300)
- ✅ **Total: $785/month vs $1,280+**

**vs Competitors:**
- 7% fee vs 50-200% scalper markup
- 7% fee vs 15-30% personal shoppers
- Pay-per-success vs $80-350/month bot rentals

---

## 🤝 Ready to Start?

**I'm going to guide you through Discord OAuth setup right now!**

Go to: https://discord.com/developers/applications

**Tell me when you're ready, and I'll walk you through each step.** 👇

---

**Built for Pokemon collectors, by collectors. Never miss a drop again! 🎯⚡**
