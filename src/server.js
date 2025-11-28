require('dotenv').config();
const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const passport = require('./config/passport');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 3000;

// Clear sessions on startup
const sessionsDbPath = path.join(__dirname, '../data', 'sessions.db');
if (fs.existsSync(sessionsDbPath)) {
  try {
    fs.unlinkSync(sessionsDbPath);
    console.log('✅ Session cache cleared');
  } catch (error) {
    console.log('⚠️  Warning: Could not delete sessions.db:', error.message);
  }
}

// Ensure admin user exists on startup
(async () => {
  try {
    const db = require('./config/database');
    const DEFAULT_USERNAME = 'admin';
    const DEFAULT_PASSWORD = 'Pokemon123!desi';

    const existingAdmin = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(DEFAULT_USERNAME);

    if (existingAdmin) {
      console.log('✅ Admin user exists');
      const password_hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
      db.prepare(`
        UPDATE admin_users
        SET password_hash = ?, is_active = 1
        WHERE username = ?
      `).run(password_hash, DEFAULT_USERNAME);
      console.log('🔄 Admin password reset to default');
    } else {
      console.log('➕ Creating admin user...');
      const password_hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
      db.prepare(`
        INSERT INTO admin_users (username, password_hash, is_active)
        VALUES (?, ?, 1)
      `).run(DEFAULT_USERNAME, password_hash);
      console.log('✅ Admin user created');
    }

    console.log(`📋 Admin login: ${DEFAULT_USERNAME} / ${DEFAULT_PASSWORD}`);
  } catch (error) {
    console.error('❌ Error setting up admin user:', error.message);
  }
})();

// Configure uploads directory path
const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, '../public/uploads');

// Ensure uploads directory exists
try {
  const logosDir = path.join(uploadsDir, 'logos');
  if (!fs.existsSync(logosDir)) {
    fs.mkdirSync(logosDir, { recursive: true });
    console.log(`✅ Created uploads directory: ${logosDir}`);
  } else {
    console.log(`✅ Uploads directory exists: ${logosDir}`);
  }
} catch (error) {
  console.warn('⚠️  Warning: Could not create uploads directory:', error.message);
  console.warn('   Uploads will be created on-demand by multer');
}

// Trust proxy - required for Render/Railway deployment
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://cdn.discordapp.com", "https://i.imgur.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      scriptSrcAttr: ["'unsafe-inline'"],
      connectSrc: ["'self'"],
      frameSrc: ["https://docs.google.com"]
    }
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

app.use('/auth', limiter);

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, '../public')));

// Serve uploads from persistent disk if UPLOADS_DIR is set to a different location
if (!uploadsDir.includes('public/uploads') && !uploadsDir.includes('public\\uploads')) {
  // Only add this route if uploads are stored outside of public folder
  app.use('/uploads', express.static(uploadsDir));
  console.log(`📁 Serving uploads from: ${uploadsDir}`);
}

// Session configuration
app.use(session({
  store: new SQLiteStore({
    db: 'sessions.db',
    dir: './data'
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax'
  }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Make user available to all templates
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  res.locals.appUrl = process.env.APP_URL;
  next();
});

// Routes
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const submissionsRoutes = require('./routes/submissions');
const adminAuthRoutes = require('./routes/adminAuth');
const adminRoutes = require('./routes/admin');
const { router: tosRoutes, ensureTOSAccepted } = require('./routes/tos');
const changelogRoutes = require('./routes/changelog');
const botWebhooksRoutes = require('./routes/bot-webhooks');
const stripeWebhooksRoutes = require('./routes/stripe-webhooks');
const discordBotRoutes = require('./routes/discord-bot');

// Webhooks must come BEFORE body parsing middleware
app.use(botWebhooksRoutes);
app.use(stripeWebhooksRoutes);
app.use(discordBotRoutes);

app.use('/auth', authRoutes);
app.use('/', tosRoutes); // TOS routes

// TOS acceptance middleware - must come after auth routes but before protected routes
app.use(ensureTOSAccepted);

app.use('/changelog', changelogRoutes); // Public changelog
app.use('/dashboard', dashboardRoutes);
app.use('/admin', adminAuthRoutes); // Admin auth routes (login/logout)
app.use('/admin', adminRoutes); // Admin panel routes (protected)
app.use('/', submissionsRoutes);

// Home page
app.get('/', (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect('/dashboard');
  }

  // Fetch login page settings from database
  const db = require('./config/database');
  const settings = db.prepare(`
    SELECT * FROM admin_settings
    WHERE setting_key IN ('brand_name', 'login_page_title', 'login_page_tagline', 'login_page_logo')
  `).all();

  // Convert to key-value map
  const settingsMap = {};
  settings.forEach(s => {
    settingsMap[s.setting_key] = s.setting_value;
  });

  res.render('index', { user: null, settings: settingsMap });
});

// Not in server page
app.get('/not-in-server', (req, res) => {
  res.render('not-in-server', {
    serverId: process.env.DISCORD_SERVER_ID,
    user: req.user
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('error', {
    message: 'Page not found',
    user: req.user
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).render('error', {
    message: process.env.NODE_ENV === 'production'
      ? 'An error occurred'
      : err.message,
    user: req.user
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`ACO Service running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Discord Server ID: ${process.env.DISCORD_SERVER_ID}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});
