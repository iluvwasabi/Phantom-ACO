# Phantom ACO - Changelog

All notable changes to the Phantom ACO service are documented here.

---

## [December 5, 2025]

### 🔔 Notifications
- **Discord Urgent Notifications** - Automatically sends notifications to Discord when submissions are added, edited, or deleted
  - New submissions: Green notification with user details
  - Edited submissions: Orange notification showing what changed
  - Deleted submissions: Red notification for removal tracking
  - All notifications include: User name, Discord ID, Service, Email, and Timestamp

### ✨ Features
- **Discord Username Visibility** - Discord usernames now visible and copyable in admin panel
- **Stellar CSV Export** - Added export option for Stellar bot with proper formatting
  - Supports all required fields: billing, shipping, payment info
  - Auto-fills billing address when "same as shipping" is checked
  - Proper card type formatting (Visa, Discover, MasterCard, Amex, JCB)
  - 2-digit year format (YY) and month format for card expiration
  - 2-letter state codes for compatibility

### 🎨 UI Improvements
- **Sectioned Forms** - All service forms now organized with clear section headers:
  - User Information
  - Billing Information
  - Address
  - Account Information (for login-required services)
  - Notes
- **Enhanced Forms** - Best Buy, Pokemon Center, and Shopify now match Target/Walmart's clean sectioned layout
- **Discord Username in Edit Modal** - Shows Discord username (read-only) when editing submissions

### 🐛 Bug Fixes
- **Target iMAP Issue** - Fixed Target submissions incorrectly requiring iMAP field when editing
- **Prism JSON Export** - Fixed billing address not populating when "billing same as shipping" is checked
- **Card Type Validation** - Fixed MasterCard capitalization for Stellar bot compatibility
- **Service Type Assignment** - Custom forms now properly assigned to services (Target, Walmart, Best Buy, Pokemon Center, Shopify)

### 🔧 Technical
- Added Discord Bot API integration for urgent notifications
- Updated service type mapping for custom form services
- Improved card type detection with case-insensitive matching
- Enhanced CSV export with proper field escaping and formatting
- State name to 2-letter code conversion for exports

---

## [December 1, 2025]

### ✨ Features
- **Admin Assignment Tracking** - Replace single "added to bot" checkbox with dropdown to track which admin (Desi or Ivan) added submissions to their bot
- **Individual Admin Accounts** - Created separate login accounts for Desi and Ivan with unique passwords
- **Enhanced Submission Forms** - Added First Name and Last Name fields to all submission forms
- **Billing Address Control** - Added "Billing Address Same as Shipping" checkbox with conditional billing fields
- **Quantity Controls** - Added Max Quantity per Checkout and Max Checkouts per Drop fields

### 🐛 Bug Fixes
- **Notes Field Visibility** - Fixed notes/special instructions not displaying in admin submissions view
- **Conditional Login Fields** - Account Email, Password, and IMAP fields now only show for login-required services (Target, Walmart, Best Buy)
- **Migration Script Dependencies** - Fixed bcryptjs dependency issue in migration script by using pre-hashed passwords

### 🎨 UI Improvements
- **Scrollable Edit Modal** - Admin edit dialog now scrollable with max-height: 70vh for better usability
- **Enhanced Notes Display** - Notes field now displays with 6 rows and visual separator for better readability
- **Assignment Column** - Changed "Bot" column to "Assigned To" with dropdown selector (Unassigned, Desi, Ivan)

### 🔧 Technical
- Added database columns: `first_name`, `last_name`, `billing_same_as_shipping`, `max_qty`, `max_checkouts`, `assigned_to`
- Created admin accounts table with bcrypt password hashing
- Updated API endpoint from `/toggle-bot` to `/assign` for assignment tracking
- Added conditional field display logic based on `service_type`
- Created `run-all-migrations.js` unified migration script for Render deployment
- Added bcryptjs to package.json dependencies

### 📚 Documentation
- Created `RENDER_MIGRATION_INSTRUCTIONS.md` with step-by-step migration guide for Render shell

---

## [November 27, 2025]

### ✨ Features
- **Public & Private Changelogs** - Public changelog at `/changelog` shows user-facing features, admin changelog at `/admin/changelog` shows full technical details
- **Changelog Links in Dashboard** - Users see "What's New" link, admins see "Full Changelog" link
- **Notes Field for Submissions** - Users can add special instructions like "Only run ETB" or "Avoid booster boxes" to each panel submission
- **Multi-Server Switcher** - Users in multiple Discord servers can now select which server to use via dropdown in dashboard header
- **Persistent Logo Storage** - Configured persistent storage for logo uploads using Render disk mounts via `UPLOADS_DIR` environment variable

### 🎨 UI Improvements
- **Larger Login Logo** - Increased login page logo size from 250px to 350px for better visibility

### 🐛 Bug Fixes
- Fixed multi-server permission checking - users with ACO role in one server no longer denied access when system auto-selected wrong server
- Fixed logo uploads being wiped on deployment - uploads now persist when `UPLOADS_DIR` points to Render persistent disk

### 🔧 Technical
- Added `UPLOADS_DIR` environment variable for configurable upload directory (defaults to `./public/uploads`)
- Updated multer storage configuration to use `UPLOADS_DIR` for flexible deployment
- Added static file serving for uploads directory when stored outside public folder
- Created `RENDER_PERSISTENT_STORAGE.md` setup guide for Render disk configuration

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

_Last Updated: December 5, 2025_
_Generated with ❤️ by [Claude Code](https://claude.com/claude-code)_
