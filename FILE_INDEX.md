# ACO Service - Complete File Index

## Project Root Files

| File | Purpose | Size | Required |
|------|---------|------|----------|
| `.env` | Environment configuration (active) | 1.1 KB | Yes |
| `.env.example` | Environment template | 1.2 KB | Yes |
| `.gitignore` | Git ignore rules | 218 B | Yes |
| `package.json` | Node.js dependencies | 983 B | Yes |
| `setup.bat` | Windows setup script | ~1 KB | Optional |
| `setup.sh` | Linux/Mac setup script | ~1 KB | Optional |
| `README.md` | Complete documentation | 16.5 KB | Yes |
| `QUICK_START.md` | 15-minute setup guide | 6.6 KB | Yes |
| `GOOGLE_FORMS_SETUP.md` | Forms configuration | 8.1 KB | Yes |
| `DEPLOYMENT_CHECKLIST.md` | Production deployment | 10.2 KB | Yes |
| `PROJECT_SUMMARY.md` | Project overview | ~8 KB | Info |
| `FILE_INDEX.md` | This file | - | Info |

## Source Code - Configuration (src/config/)

| File | Purpose | Lines | Exports |
|------|---------|-------|---------|
| `database.js` | Database connection & schema initialization | ~120 | db instance |
| `passport.js` | Discord OAuth strategy configuration | ~90 | passport instance |

## Source Code - Middleware (src/middleware/)

| File | Purpose | Lines | Exports |
|------|---------|-------|---------|
| `auth.js` | Authentication middleware functions | ~100 | ensureAuthenticated, ensureInServer, redirectIfAuthenticated, checkServiceAccess |

## Source Code - Models (src/models/)

| File | Purpose | Lines | Exports |
|------|---------|-------|---------|
| `User.js` | User data model and operations | ~80 | User class |
| `Service.js` | Service model and subscription management | ~110 | Service class |

## Source Code - Routes (src/routes/)

| File | Purpose | Lines | Exports |
|------|---------|-------|---------|
| `auth.js` | Authentication routes (login, callback, logout) | ~40 | Express router |
| `dashboard.js` | Dashboard routes (services, forms, profile) | ~120 | Express router |

## Source Code - Utilities (src/utils/)

| File | Purpose | Lines | Exports |
|------|---------|-------|---------|
| `encryption.js` | AES-256 encryption/decryption | ~50 | encrypt, decrypt, hash |
| `initDatabase.js` | Database initialization script | ~150 | Executable script |
| `generateKeys.js` | Secure key generation utility | ~40 | Executable script |

## Source Code - Main (src/)

| File | Purpose | Lines | Description |
|------|---------|-------|-------------|
| `server.js` | Express web server | ~130 | Main web application |
| `bot.js` | Discord bot | ~150 | Discord bot with slash commands |

## Views - Pages (views/)

| File | Purpose | Lines | Description |
|------|---------|-------|-------------|
| `index.ejs` | Landing page | ~120 | Home page with features |
| `dashboard.ejs` | Main dashboard | ~130 | Service catalog |
| `service-details.ejs` | Service detail page | ~150 | Individual service page |
| `profile.ejs` | User profile | ~140 | User subscriptions & history |
| `not-in-server.ejs` | Server verification error | ~50 | Error page |
| `error.ejs` | Generic error page | ~40 | Error display |
| `login-failed.ejs` | Login error page | ~40 | OAuth failure |

## Views - Partials (views/partials/)

| File | Purpose | Lines | Description |
|------|---------|-------|-------------|
| `header.ejs` | Page header | ~30 | Navigation bar |
| `footer.ejs` | Page footer | ~35 | Footer section |

## Public Assets - CSS (public/css/)

| File | Purpose | Lines | Description |
|------|---------|-------|-------------|
| `style.css` | Complete application styling | ~1,200 | Pokemon-themed CSS |

## Public Assets - JavaScript (public/js/)

| File | Purpose | Lines | Description |
|------|---------|-------|-------------|
| `main.js` | Core client-side JavaScript | ~100 | Global utilities |
| `dashboard.js` | Dashboard-specific JavaScript | ~90 | Dashboard interactions |

## Directory Structure

```
ACO Service/
├── 📄 Root Configuration Files (12 files)
│   ├── .env
│   ├── .env.example
│   ├── .gitignore
│   ├── package.json
│   ├── setup.bat
│   ├── setup.sh
│   └── Documentation (6 MD files)
│
├── 📁 src/ (Source Code)
│   ├── server.js (Express server)
│   ├── bot.js (Discord bot)
│   │
│   ├── 📁 config/
│   │   ├── database.js
│   │   └── passport.js
│   │
│   ├── 📁 middleware/
│   │   └── auth.js
│   │
│   ├── 📁 models/
│   │   ├── User.js
│   │   └── Service.js
│   │
│   ├── 📁 routes/
│   │   ├── auth.js
│   │   └── dashboard.js
│   │
│   └── 📁 utils/
│       ├── encryption.js
│       ├── initDatabase.js
│       └── generateKeys.js
│
├── 📁 views/ (EJS Templates)
│   ├── index.ejs
│   ├── dashboard.ejs
│   ├── service-details.ejs
│   ├── profile.ejs
│   ├── not-in-server.ejs
│   ├── error.ejs
│   ├── login-failed.ejs
│   └── 📁 partials/
│       ├── header.ejs
│       └── footer.ejs
│
├── 📁 public/ (Static Assets)
│   ├── 📁 css/
│   │   └── style.css
│   ├── 📁 js/
│   │   ├── main.js
│   │   └── dashboard.js
│   └── 📁 images/ (empty - for future use)
│
└── 📁 data/ (Auto-created)
    ├── aco.db (SQLite database)
    └── sessions.db (Session store)
```

## File Count Summary

- **Total Files**: 32+
- **Source Code Files**: 12 (.js)
- **Template Files**: 9 (.ejs)
- **Stylesheet Files**: 1 (.css)
- **Documentation Files**: 6 (.md)
- **Configuration Files**: 4
- **Database Files**: 2 (auto-created)

## File Purposes by Category

### Configuration Files
- `.env` - Active environment variables
- `.env.example` - Environment template
- `.gitignore` - Git exclusions
- `package.json` - Dependencies and scripts

### Documentation
- `README.md` - Complete guide
- `QUICK_START.md` - Fast setup
- `GOOGLE_FORMS_SETUP.md` - Forms config
- `DEPLOYMENT_CHECKLIST.md` - Deploy guide
- `PROJECT_SUMMARY.md` - Overview
- `FILE_INDEX.md` - This file

### Backend Code
- **Core**: server.js, bot.js
- **Config**: database.js, passport.js
- **Middleware**: auth.js
- **Models**: User.js, Service.js
- **Routes**: auth.js, dashboard.js
- **Utils**: encryption.js, initDatabase.js, generateKeys.js

### Frontend Code
- **Templates**: 7 pages + 2 partials
- **Styles**: style.css (Pokemon theme)
- **Scripts**: main.js, dashboard.js

## Database Files (Auto-created)

| File | Purpose | Size | Created By |
|------|---------|------|------------|
| `data/aco.db` | Main database | Variable | npm run init-db |
| `data/sessions.db` | Session store | Variable | Express session |

## Essential Files for Operation

### Required for Startup
1. `package.json` - Dependencies
2. `.env` - Configuration
3. `src/server.js` - Web server
4. `src/bot.js` - Discord bot
5. `data/aco.db` - Database

### Required for Functionality
- All files in `src/config/`
- All files in `src/middleware/`
- All files in `src/models/`
- All files in `src/routes/`
- All files in `views/`
- All files in `public/css/`
- All files in `public/js/`

## Optional Files

- `setup.bat` - Windows automation
- `setup.sh` - Linux/Mac automation
- Documentation files (helpful but not required for operation)
- `src/utils/generateKeys.js` - One-time use

## Files Modified by User

Files you need to edit:
1. `.env` - Add your credentials
2. `src/models/Service.js` - Add/remove services (optional)
3. `public/css/style.css` - Customize theme (optional)
4. `views/*.ejs` - Customize pages (optional)

## Files NEVER to Edit

- `package-lock.json` (auto-generated)
- `data/*.db` (managed by SQLite)
- `node_modules/*` (dependencies)

## Build Artifacts

None - this is a Node.js application without a build step.

## Environment-Specific Files

### Development
- `.env` with local URLs
- `nodemon` for auto-restart

### Production
- `.env` with production URLs
- PM2 process files (created by PM2)
- Nginx config (separate file)

## File Dependencies

### server.js requires:
- config/database.js
- config/passport.js
- middleware/auth.js
- routes/auth.js
- routes/dashboard.js
- All views/*.ejs

### bot.js requires:
- config/database.js
- .env (Discord bot token)

### dashboard.js requires:
- models/User.js
- models/Service.js
- middleware/auth.js

## Version Control

### Track in Git
- All source code
- All documentation
- Configuration templates (.env.example)
- Public assets

### Ignore in Git (.gitignore)
- `.env` (secrets)
- `node_modules/` (dependencies)
- `data/` (database)
- `*.log` (logs)
- `.DS_Store` (OS files)

## File Size Summary

- **Total Source Code**: ~3,500 lines
- **Total CSS**: ~1,200 lines
- **Total Documentation**: ~10,000 words
- **Total Project Size**: ~15 KB (excluding node_modules)
- **With Dependencies**: ~50-100 MB

## File Permissions (Linux/Mac)

```bash
# Make scripts executable
chmod +x setup.sh
chmod +x src/utils/*.js

# Secure .env
chmod 600 .env

# Database directory
chmod 700 data/
```

## Maintenance Schedule

### Daily
- Monitor log files (if logging to files)

### Weekly
- Review database size
- Check for updates: `npm outdated`

### Monthly
- Update dependencies: `npm update`
- Backup database
- Review and archive old sessions

## File Backup Priority

**Critical** (backup daily):
- `data/aco.db`
- `.env`

**Important** (backup on changes):
- `src/**/*.js`
- `views/**/*.ejs`
- `public/**/*`

**Low** (can recreate):
- `node_modules/`
- Documentation
- `package-lock.json`

## Quick Reference

```bash
# View project structure
tree -L 3

# Count lines of code
find src -name "*.js" | xargs wc -l

# Find all JavaScript files
find . -name "*.js" -not -path "./node_modules/*"

# Find all templates
find views -name "*.ejs"

# Check file sizes
du -sh src/ views/ public/
```

---

**Last Updated**: November 24, 2025
**Total Files**: 32+ (excluding node_modules)
**Total Directories**: 12
