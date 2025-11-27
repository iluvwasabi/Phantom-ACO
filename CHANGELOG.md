# Phantom ACO - Changelog

All notable changes to the Phantom ACO service are documented here.

---

## [November 27, 2025]

### ✨ Features
- **Public & Private Changelogs** - Public changelog at `/changelog` shows user-facing features, admin changelog at `/admin/changelog` shows full technical details
- **Changelog Links in Dashboard** - Users see "What's New" link, admins see "Full Changelog" link
- **Notes Field for Submissions** - Users can add special instructions like "Only run ETB" or "Avoid booster boxes" to each panel submission
- **Multi-Server Switcher** - Users in multiple Discord servers can now select which server to use via dropdown in dashboard header

### 🐛 Bug Fixes
- Fixed multi-server permission checking - users with ACO role in one server no longer denied access when system auto-selected wrong server

---

## [November 26-27, 2025]

### ✨ Features
- **Terms of Service System** - Legal protection with user acceptance tracking (IP address, user agent, timestamp, version)
- **Server Management UI** - Admin panel to add/edit/delete Discord servers at `/admin/servers`
- **Multi-Tenant Architecture** - Support for multiple Discord communities using separate servers with different role requirements

### 🔒 Security
- **Removed Discord Admin Bypass** - Only designated admin panel users can access admin features (no automatic Discord permission bypass)
- **Admin Password Reset on Startup** - Embedded admin user creation/reset directly in server.js for Render deployment
- **Session Cache Clearing** - Clears sessions.db on startup to prevent stale authentication

### ⚙️ Admin Features
- **TOS Acceptances View** - Track all user consents at `/admin/tos-acceptances`
- **Server List Management** - View user count per server, activate/deactivate servers

---

## [Earlier Development]

### 🚀 Core Features
- **Discord OAuth Authentication** - Secure login via Discord with role verification
- **Service Panels System** - Dynamic panels for Target, Walmart, Best Buy, Pokemon Center, Shopify
- **Encrypted Credentials Storage** - AES encryption for sensitive user data (passwords, payment info, IMAP)
- **Submission Management** - Users can create, edit, delete multiple submissions per service
- **Admin Dashboard** - View all submissions by service with click-to-copy fields

### 👤 User Features
- **Payment Information Storage** - Card details, billing/shipping addresses
- **Multiple Submissions** - Users can have multiple profiles per service
- **Account Credentials** - IMAP support for login-required services

### 🛠️ Admin Features
- **Submission Editing** - Admins can edit user submissions directly
- **User Management** - View all users with submission counts
- **Login Page Customization** - Customize brand name, title, tagline, logo
- **Panel Management** - Enable/disable services, reorder, customize colors/icons

### 🔧 Technical
- **Better-SQLite3** - Fast, reliable local database
- **Express Sessions** - Persistent user sessions with SQLite store
- **Rate Limiting** - Protection against brute force attacks
- **Helmet Security** - CSP and security headers
- **Migration System** - Automatic database schema updates

---

## 📊 Summary Stats

- **6 Services Supported** - Target, Walmart, Best Buy, Pokemon Center, Shopify, Generic
- **Multi-Tenant** - Support for unlimited Discord servers
- **Legal Protection** - Full TOS acceptance audit trail
- **Admin Features** - Comprehensive management of users, submissions, and servers
- **Security First** - Encrypted storage, role-based access, session management

---

_Last Updated: November 27, 2025_
_Generated with ❤️ by [Claude Code](https://claude.com/claude-code)_
