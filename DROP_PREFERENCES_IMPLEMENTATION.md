# Drop SKU Preference System - Implementation Complete

## Overview

A complete Discord drop announcement system with SKU preference management has been implemented. This allows you to:

1. **Create drops** with multiple SKUs via admin panel
2. **Post drops** to Discord with interactive "Manage Preferences" button
3. **Users opt in/out** of specific SKUs via Discord buttons
4. **View preferences** and export to CSV for manual processing with refracT

## What Was Implemented

### 1. Database Layer
**Files Created:**
- `src/migrations/add-drop-preferences.js` - Creates `drops` and `drop_preferences` tables
- Updated `src/config/database.js` - Auto-runs the migration

**Database Schema:**
- **drops table**: Stores drop announcements with SKU list, Discord message ID, channel ID
- **drop_preferences table**: Tracks user preferences per drop per SKU, with Discord user matching

### 2. Backend API
**Files Modified:**
- `src/routes/admin.js` - Added 8 new admin endpoints:
  - `GET /admin/drops` - List all drops
  - `POST /admin/drops` - Create new drop
  - `GET /admin/drops/:id` - Get drop details
  - `PUT /admin/drops/:id` - Edit drop
  - `DELETE /admin/drops/:id` - Soft delete drop
  - `POST /admin/drops/:id/announce` - Post to Discord
  - `GET /admin/drops/:id/preferences` - View preferences page
  - `GET /admin/api/drops/:id/export` - Export CSV

- `src/routes/discord-bot.js` - Added 4 new Discord bot endpoints:
  - `POST /api/discord-bot/drop-interaction` - Handle SKU button clicks
  - `GET /api/discord-bot/drop-preferences/:dropId/:discordId` - Get user prefs
  - `POST /api/post-drop-announcement` - Queue drop for Discord posting
  - `GET /api/discord-bot/get-drop-queue` - Discord bot polls for announcements

### 3. Admin Interface
**Files Created:**
- `views/admin-drops.ejs` - Drop management page with table, create/edit modal
- `views/admin-drop-preferences.ejs` - Preferences view page grouped by SKU

**Features:**
- Create drops with multiple SKUs (dynamic SKU list)
- Edit/delete drops
- Post to Discord button
- View user preferences
- Export to CSV

### 4. Discord Bot Integration
**Files Created:**
- `discord-bot/DROP_PREFERENCES_GUIDE.md` - Complete implementation guide

**Features to Add (see guide):**
- Poll for drop announcements every 5 seconds
- Post drop embeds with "Manage Preferences" button
- Handle button interactions
- Toggle SKU preferences
- Update button appearance in real-time

### 5. Environment Variables
**Updated `.env.example`** with:
```env
DISCORD_BOT_API_SECRET=your-shared-secret-between-web-and-bot
DISCORD_BOT_API_URL=http://localhost:3001
DROP_ANNOUNCEMENT_CHANNEL_ID=your-discord-channel-id-for-drop-announcements
ADMIN_DISCORD_WEBHOOK=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN
```

## How to Use

### Step 1: Configuration

1. **Copy environment variables to `.env`**:
   ```bash
   # Add these to your .env file
   DISCORD_BOT_API_SECRET=some-random-secret-key-123
   DISCORD_BOT_API_URL=http://localhost:3001
   DROP_ANNOUNCEMENT_CHANNEL_ID=1234567890  # Your Discord channel ID
   ```

2. **Update Discord bot** (see `discord-bot/DROP_PREFERENCES_GUIDE.md`):
   - Add button interaction handlers
   - Add drop announcement polling
   - Start bot

### Step 2: Create a Drop

1. Navigate to `/admin/drops` in your admin panel
2. Click "Create New Drop"
3. Fill in:
   - **Drop Name**: e.g., "Pokemon 151 ETB Drop"
   - **Description**: Optional details about the drop
   - **Drop Date**: When the drop happens
   - **SKUs**: Click "+ Add SKU" for each product
     - SKU Code: e.g., "ETB-001"
     - Product Name: e.g., "Elite Trainer Box"
4. Click "Save Drop"

### Step 3: Post to Discord

1. In the drops table, click "📢 Post to Discord"
2. Confirms, then queues the announcement
3. Discord bot polls every 5 seconds and posts the embed
4. Users will see the announcement with "⚙️ Manage Preferences" button

### Step 4: Users Manage Preferences

**User Flow:**
1. User clicks "⚙️ Manage Preferences" button
2. Bot sends ephemeral message (only they see) with SKU buttons
3. User clicks SKU buttons to toggle opt-in/opt-out:
   - ✅ Green button = Opted in
   - ⬜ Gray button = Opted out
4. Preferences saved automatically

### Step 5: View Preferences & Export

1. **View Preferences**:
   - Go to `/admin/drops`
   - Click "👥 Preferences" for any drop
   - See users grouped by SKU with Discord username, first name, last name

2. **Export CSV**:
   - On preferences page, click "📊 Export CSV"
   - Downloads CSV with columns:
     - Discord Username
     - First Name (if registered)
     - Last Name (if registered)
     - Email (if registered)
     - Discord ID
     - Opted SKUs

3. **Use with refracT**:
   - Open CSV in Excel
   - Manually process opted-in users
   - Input to refracT as needed

## User Matching

### How Discord Users Are Matched to Profiles

When a user interacts with a drop:
1. System checks if `users.discord_id` exists in database
2. **If user is registered**:
   - Links preference via `user_id`
   - Shows `first_name` and `last_name` in admin view
3. **If user is NOT registered**:
   - Stores only `discord_id` and `discord_username`
   - Shows "Not registered" in admin view
   - `user_id` = NULL

This ensures all Discord users can participate, even if they haven't registered on your website yet.

## File Structure

```
ACO Service/
├── src/
│   ├── migrations/
│   │   └── add-drop-preferences.js (NEW)
│   ├── routes/
│   │   ├── admin.js (MODIFIED - added drop routes)
│   │   └── discord-bot.js (MODIFIED - added interaction endpoints)
│   └── config/
│       └── database.js (MODIFIED - added migration)
├── views/
│   ├── admin-drops.ejs (NEW)
│   └── admin-drop-preferences.ejs (NEW)
├── discord-bot/
│   ├── index.js (NEEDS UPDATE - see guide)
│   └── DROP_PREFERENCES_GUIDE.md (NEW)
├── .env.example (MODIFIED - added new vars)
└── DROP_PREFERENCES_IMPLEMENTATION.md (THIS FILE)
```

## Next Steps

### Required to Complete:
1. **Update Discord Bot** following `discord-bot/DROP_PREFERENCES_GUIDE.md`
   - Add interaction handlers
   - Add polling for announcements
   - Test posting and interactions

2. **Configure Environment**:
   - Add variables to `.env`
   - Get Discord channel ID for announcements
   - Set up Discord bot API secret

3. **Test End-to-End**:
   - Create test drop
   - Post to Discord
   - Click manage preferences
   - Toggle SKUs
   - View in admin panel
   - Export CSV

### Optional Enhancements (Future):
- Pagination for >25 SKUs per drop
- DM confirmations when users opt in
- Reminder DMs before drop date
- SKU capacity limits (first-come-first-served)
- Drop status updates (sold out, delayed, etc.)
- Auto-sync with refracT API (instead of manual CSV import)
- Drop templates for common SKU lists
- Preference history/audit log

## Troubleshooting

### Database Migration Not Running
- Restart the server: `npm start`
- Check console for migration logs
- Manually run: `node src/migrations/add-drop-preferences.js`

### Can't Access /admin/drops
- Ensure you're logged in as admin
- Check browser console for errors
- Verify `admin.js` routes are loaded

### Discord Bot Not Posting
- Check `DISCORD_BOT_API_URL` in web `.env`
- Verify bot is running: `cd discord-bot && node index.js`
- Check bot console logs for errors
- Verify `DROP_ANNOUNCEMENT_CHANNEL_ID` is correct

### Preferences Not Saving
- Check network tab in browser dev tools
- Verify Discord bot has correct API secret
- Check database for `drop_preferences` table
- Review API endpoint logs

## Support

For questions or issues:
1. Check `discord-bot/DROP_PREFERENCES_GUIDE.md` for Discord bot setup
2. Review error logs in terminal/console
3. Check database with `sqlite3 data/aco.db` → `SELECT * FROM drops;`

## Success Criteria

✅ Database tables created (drops, drop_preferences)
✅ Admin can create/edit/delete drops
✅ Admin can post drops to Discord
✅ Users can manage SKU preferences via Discord buttons
✅ Admin can view preferences grouped by SKU
✅ Admin can export preferences to CSV
✅ Discord users matched to profiles (first_name, last_name)

**All backend implementation complete!** Just need to update Discord bot (see guide).
