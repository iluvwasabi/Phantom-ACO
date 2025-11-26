# ACO Service - Tech Stack & Infrastructure

**Last Updated:** November 25, 2025

---

## 🛠️ What You're Actually Building

**Simple OAuth Dashboard - NOT a Discord Bot**

Your system is:
- Discord OAuth login (user authentication)
- Web dashboard (shows available services)
- Google Forms integration (data collection)
- Stripe payments

**What you're NOT building:**
- ❌ Discord bot with commands
- ❌ CAPTCHA solving infrastructure
- ❌ Custom checkout bot

---

## 💰 Your Infrastructure Costs

### Monthly Fixed Costs: $785/month

**1. Refract/Valor Bot Rental: $100/month**
- Pre-built checkout bots (you rent them)
- Handles all checkout logic
- Includes CAPTCHA solving
- Supports: Pokemon Center, GameStop, Best Buy, Target, Walmart

**2. Proxies: $680/month**
- Residential IP proxies
- Required for Refract/Valor to work
- Avoids bot detection

**3. Web Hosting: $5/month**
- Railway, Vercel, or similar
- Hosts your OAuth server + dashboard
- Handles Discord login flow

**Total: $785/month**

---

## 🏗️ What You're Building (Tech Stack)

### Frontend:
- **Simple web dashboard** (HTML/CSS/JavaScript or EJS templates)
- **Discord OAuth button** (login with Discord)
- **Service selection page** (Target, Walmart, etc.)
- **Google Forms links** (prefilled with user's Discord data)

### Backend:
- **Node.js + Express** (web server)
- **Passport.js** (Discord OAuth handling)
- **SQLite database** (store user data, subscriptions)
- **Stripe API** (payment processing)

### Authentication:
- **Discord OAuth 2.0** (login only, no bot)
- User clicks "Login with Discord"
- Discord authorizes app
- Your server gets user info (Discord ID, username)
- Creates session, redirects to dashboard

### Data Flow:
```
User → Discord OAuth → Dashboard → Select Service → Google Form (prefilled) → Stripe Payment → Refract/Valor Executes Checkout
```

---

## 📦 Dependencies (package.json)

**Core:**
- `express` - Web server
- `passport` - OAuth handling
- `passport-discord` - Discord OAuth strategy
- `express-session` - Session management
- `better-sqlite3` - Database

**Utilities:**
- `dotenv` - Environment variables
- `ejs` - Template engine
- `helmet` - Security headers
- `express-rate-limit` - Rate limiting
- `crypto-js` - Encryption for sensitive data
- `axios` - HTTP requests
- `connect-sqlite3` - Session store

**Payments:**
- Stripe SDK (add when ready)

**What You DON'T Need:**
- ❌ `discord.js` - Not building a bot (can remove this)
- ❌ CAPTCHA solving libraries - Refract/Valor handles it
- ❌ Complex bot frameworks - You're renting bots

---

## 🔧 File Structure (Simplified)

```
ACO Service/
├── src/
│   ├── server.js           # Main web server (Discord OAuth + dashboard)
│   ├── config/
│   │   ├── database.js     # SQLite setup
│   │   └── passport.js     # Discord OAuth config
│   ├── models/
│   │   ├── User.js         # User model
│   │   └── Service.js      # Service subscriptions
│   ├── routes/
│   │   ├── auth.js         # Discord OAuth routes
│   │   ├── dashboard.js    # Dashboard routes
│   │   └── forms.js        # Google Forms prefill routes
│   ├── middleware/
│   │   └── auth.js         # Check if user is logged in
│   └── utils/
│       ├── initDatabase.js # Initialize DB
│       └── encryption.js   # Encrypt sensitive data
├── views/
│   ├── index.ejs           # Landing page
│   ├── dashboard.ejs       # User dashboard
│   └── login.ejs           # Login page
├── public/
│   ├── css/
│   │   └── style.css       # Styling
│   └── js/
│       └── dashboard.js    # Client-side JS
├── data/
│   └── aco.db              # SQLite database
├── .env                    # Environment variables
└── package.json            # Dependencies
```

---

## 🚀 How It Actually Works

### 1. User Signs Up:
```
1. User visits your website
2. Clicks "Login with Discord"
3. Discord authorizes your app
4. Your server receives Discord ID, username, avatar
5. Creates user account in database
6. Redirects to dashboard
```

### 2. User Subscribes to Service:
```
1. User sees dashboard with services (Target, Walmart, etc.)
2. Clicks "Subscribe to Target"
3. Button opens Google Form prefilled with:
   - Discord ID: 123456789
   - Discord Username: CoolCollector#1234
4. User fills in:
   - Target login credentials
   - Shipping address
   - Payment method
5. Submits form
6. Your system stores: "User 123456789 subscribed to Target"
```

### 3. When Drop Happens:
```
1. You manually trigger Refract/Valor checkout for Target drop
2. Refract/Valor uses user's credentials (from Google Form)
3. Refract/Valor executes checkout
4. If successful:
   - User gets product
   - Stripe charges user 7% of product price
   - You keep payment (minus Stripe fees and your costs)
```

---

## 🔐 What Refract/Valor Does (You Don't Build This)

**Refract/Valor handles:**
- ✅ Checkout automation
- ✅ CAPTCHA solving
- ✅ Proxy rotation
- ✅ Anti-bot evasion
- ✅ Speed optimization (<12 seconds)
- ✅ Queue management
- ✅ Retailer-specific logic

**You just:**
- Send them: Product URL, User credentials, Shipping info
- They execute the checkout
- They return: Success/Fail status

---

## 📝 What You Need to Build

### Phase 1 (Week 1-2): MVP
- [ ] Discord OAuth login
- [ ] Simple dashboard (show available services)
- [ ] Google Forms integration (prefill Discord data)
- [ ] Database to track users + subscriptions
- [ ] Basic landing page

### Phase 2 (Week 3-4): Payments
- [ ] Stripe integration
- [ ] Charge users after successful checkout
- [ ] Payment history page
- [ ] Webhook for Stripe events

### Phase 3 (Month 2): Refract/Valor Integration
- [ ] API calls to Refract/Valor
- [ ] Send user data for checkout execution
- [ ] Handle success/fail responses
- [ ] Notify users of results

### Phase 4 (Month 3+): Polish
- [ ] Success rate tracking
- [ ] User notifications (Discord DMs or email)
- [ ] Admin panel (view all users, subscriptions)
- [ ] Analytics dashboard

---

## 🎯 Key Differences from Original Plan

**Original (Wrong):**
- Building Discord bot with commands (/status, /help)
- Building custom CAPTCHA solving ($200/month)
- Building custom checkout bots ($300+/month infrastructure)
- Complex server setup ($300/month)

**Actual (Correct):**
- Simple OAuth login (no bot commands needed)
- Renting Refract/Valor (they handle CAPTCHA + checkout)
- Simple hosting ($5/month)
- **$785/month total** vs $1,280/month

**You save $495/month and avoid building complex infrastructure!**

---

## 💡 Why This is Better

1. **Faster to Build**
   - OAuth dashboard: 1-2 weeks
   - vs Custom bot infrastructure: 2-3 months

2. **Lower Costs**
   - $785/month vs $1,280/month
   - No CAPTCHA costs
   - Cheaper hosting

3. **Easier to Maintain**
   - Simple web app
   - No complex bot logic
   - Refract/Valor handles updates

4. **Faster Breakeven**
   - 45 customers (not 75)
   - 2-3 weeks (not 4+ weeks)

---

## 🔄 Next Steps

1. **Keep it simple** - Just build OAuth + dashboard
2. **Use Refract/Valor** - Don't build checkout bots
3. **Focus on Discord partnerships** - Marketing > Tech
4. **Launch fast** - MVP in 2 weeks, iterate later

---

**Remember: You're not building a bot service. You're building a customer dashboard that connects users to Refract/Valor bots.** 🚀
