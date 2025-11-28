# Automating Bot Profile Population

## Overview

Instead of building a full custom checkout automation system, this document outlines a simpler approach: **automatically populating bot profiles** (Stellar/Refract/Valor) with customer data from the ACO Service website.

---

## What This Automates

**Current workflow (manual)**:
1. Customer submits card data on your website → Saves to database ✅ (already works)
2. You open Stellar/Refract/Valor
3. You manually type card info into the bot's profile builder
4. You manually create tasks for each customer
5. You click "Start" when a drop happens

**Desired workflow (automated)**:
1. Customer submits card data on your website → Saves to database ✅
2. **Script automatically exports data to bot profile format**
3. **Script creates tasks in the bot**
4. You just click "Start" when drop happens

---

## Is This Possible?

**Short answer: YES, but it depends on which bots you use.**

Each bot stores profiles/tasks differently:

### **Stellar AIO**
- **Profile storage**: JSON files in `C:\Users\YourName\AppData\Roaming\Stellar\profiles.json`
- **Task storage**: JSON files in `tasks.json`
- **Automation difficulty**: ⭐⭐ (Easy - just write to JSON files)

### **Refract**
- **Profile storage**: JSON files in `%appdata%\Refract\profiles\`
- **Task storage**: Database or JSON (depends on version)
- **Automation difficulty**: ⭐⭐ (Easy - JSON manipulation)

### **Valor**
- **Profile storage**: SQLite database or JSON
- **Task storage**: SQLite database
- **Automation difficulty**: ⭐⭐⭐ (Medium - need to write to SQLite)

### **Kodai/Prism/Balko**
- **Profile storage**: Encrypted or proprietary formats
- **Automation difficulty**: ⭐⭐⭐⭐⭐ (Very Hard or Impossible)

---

## Step 1: Check What Format Your Bots Use

Do this for each bot you own:

1. Open the bot (Stellar/Refract/Valor)
2. Create a dummy profile manually:
   - Name: `TEST PROFILE`
   - Card: `4111111111111111`
   - Expiry: `12/25`
   - CVV: `123`
   - Address: `123 Main St, New York, NY 10001`
3. Save the profile
4. **Close the bot completely**
5. Go to these locations and search for "TEST PROFILE":

**Windows locations to check**:
```
C:\Users\YourName\AppData\Roaming\Stellar\
C:\Users\YourName\AppData\Roaming\Refract\
C:\Users\YourName\AppData\Local\Valor\
C:\Users\YourName\Documents\[BotName]\
```

6. Open any JSON files you find with Notepad
7. Look for your test profile - if you see it in **plain text JSON**, you're golden!

**Example - What you're looking for**:

```json
{
  "profiles": [
    {
      "id": "abc123",
      "name": "TEST PROFILE",
      "cardNumber": "4111111111111111",
      "cvv": "123",
      "expiryMonth": "12",
      "expiryYear": "25",
      "billingAddress": {
        "line1": "123 Main St",
        "city": "New York",
        "state": "NY",
        "zip": "10001"
      }
    }
  ]
}
```

**If you find this, we can 100% automate it.**

---

## Implementation (Assuming Bots Use JSON)

### **Script 1: Export Profiles to Bot**

Create `scripts/export-to-bot.js`:

```javascript
const db = require('../src/config/database');
const CryptoJS = require('crypto-js');
const fs = require('fs');
const path = require('path');

// Decrypt helper (same as your submissions.js)
function decrypt(ciphertext) {
  const bytes = CryptoJS.AES.decrypt(ciphertext, process.env.ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

// Get all active submissions from database
const submissions = db.prepare(`
  SELECT ss.*, ec.encrypted_password, ec.encrypted_username, ec.encrypted_imap
  FROM service_subscriptions ss
  LEFT JOIN encrypted_credentials ec ON ec.subscription_id = ss.id
  WHERE ss.status = 'active'
`).all();

// Convert to bot profile format
const stellarProfiles = [];

submissions.forEach(sub => {
  // Decrypt the data
  const decryptedData = JSON.parse(decrypt(sub.encrypted_password));

  // Map to Stellar profile format
  stellarProfiles.push({
    id: `profile_${sub.id}`,
    name: `Customer ${sub.user_id} - ${sub.service_name}`,
    email: decryptedData.email || decryptedData.account_email,
    phone: decryptedData.phone,

    // Payment info
    cardNumber: decryptedData.card_number,
    cvv: decryptedData.cvv,
    expiryMonth: decryptedData.exp_month,
    expiryYear: decryptedData.exp_year,
    cardType: decryptedData.card_type,
    nameOnCard: decryptedData.name_on_card,

    // Billing address
    billingAddress: {
      line1: decryptedData.billing_address,
      line2: '',
      city: decryptedData.billing_city,
      state: decryptedData.billing_state,
      zip: decryptedData.billing_zipcode,
      country: 'US'
    },

    // Shipping address
    shippingAddress: {
      line1: decryptedData.address1,
      line2: decryptedData.unit_number || '',
      city: decryptedData.city,
      state: decryptedData.state,
      zip: decryptedData.zip_code,
      country: decryptedData.country || 'US'
    },

    // Account credentials (for login_required services)
    accountEmail: decryptedData.account_email || null,
    accountPassword: decryptedData.account_password || null,
    accountImap: decryptedData.account_imap || null
  });
});

// Write to Stellar profiles file
const stellarPath = path.join(
  process.env.APPDATA,
  'Stellar',
  'profiles.json'
);

// Backup existing profiles first
if (fs.existsSync(stellarPath)) {
  const backup = stellarPath.replace('.json', `_backup_${Date.now()}.json`);
  fs.copyFileSync(stellarPath, backup);
  console.log(`✅ Backed up existing profiles to: ${backup}`);
}

// Write new profiles
fs.writeFileSync(stellarPath, JSON.stringify({
  profiles: stellarProfiles
}, null, 2));

console.log(`✅ Exported ${stellarProfiles.length} profiles to Stellar`);
```

**Usage**:
```bash
cd "D:\AI Projects\Claude Projects\ACO Service"
node scripts/export-to-bot.js
```

---

### **Script 2: Auto-Create Tasks**

Create `scripts/create-tasks.js`:

```javascript
const db = require('../src/config/database');
const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const retailer = args.find(arg => arg.startsWith('--retailer='))?.split('=')[1];
const productUrl = args.find(arg => arg.startsWith('--product-url='))?.split('=')[1];

if (!retailer || !productUrl) {
  console.error('Usage: node create-tasks.js --retailer=target --product-url=https://...');
  process.exit(1);
}

// Get all active subscriptions for this retailer
const subs = db.prepare(`
  SELECT * FROM service_subscriptions
  WHERE service_name = ? AND status = 'active'
`).all(retailer);

const tasks = subs.map(sub => ({
  id: `task_${sub.id}`,
  productUrl: productUrl,
  retailer: retailer,
  profileId: `profile_${sub.id}`,
  size: 'N/A',
  mode: 'safe',
  quantity: 1,
  proxy: 'proxy_group_1'
}));

// Write to Stellar tasks.json
const tasksPath = path.join(process.env.APPDATA, 'Stellar', 'tasks.json');

// Backup existing tasks
if (fs.existsSync(tasksPath)) {
  const backup = tasksPath.replace('.json', `_backup_${Date.now()}.json`);
  fs.copyFileSync(tasksPath, backup);
  console.log(`✅ Backed up existing tasks to: ${backup}`);
}

fs.writeFileSync(tasksPath, JSON.stringify({ tasks }, null, 2));

console.log(`✅ Created ${tasks.length} tasks for ${retailer} drop`);
console.log(`Product: ${productUrl}`);
```

**Usage**:
```bash
node scripts/create-tasks.js --retailer=target --product-url=https://www.target.com/p/pokemon-prismatic-evolutions/-/A-90351753
```

---

## Complete Workflow with Automation

### **Before Drop (10 minutes)**
1. Customer submits info on website → Saved to database ✅
2. Run: `node scripts/export-to-bot.js` → Profiles loaded into Stellar ✅
3. Drop announced (e.g., Prismatic Evolutions at Target, 3pm EST)
4. Run: `node scripts/create-tasks.js --retailer target --product-url [URL]` → Tasks created ✅

### **During Drop (1 click)**
5. Open Stellar
6. Click "Start All Tasks"
7. Monitor

### **After Drop (5 minutes)**
8. Mark successful orders in your database
9. Send confirmation emails to customers

**Time saved**:
- Old way: 2-3 hours of manual data entry per drop
- New way: 10 minutes of setup

---

## Important Notes

### **Security Considerations**
- The export script temporarily decrypts card data to write to bot profiles
- Bot profile files may be stored in plain text (depending on bot)
- **Never share your bot's AppData folder**
- **Never commit profiles.json to GitHub**
- Consider encrypting your entire bot folder with Windows BitLocker

### **Backup Strategy**
- Both scripts automatically backup existing profiles/tasks before overwriting
- Backups are saved with timestamps (e.g., `profiles_backup_1234567890.json`)
- Keep at least 3 backups at all times

### **Bot Compatibility**
- Scripts above are written for **Stellar AIO** format
- Will need adjustment for Refract/Valor (different JSON structure)
- May not work at all for bots with encrypted/proprietary formats

---

## Multi-Bot Support

If you use multiple bots, you can create separate export functions:

```javascript
// In export-to-bot.js

function exportToStellar(profiles) {
  const stellarPath = path.join(process.env.APPDATA, 'Stellar', 'profiles.json');
  fs.writeFileSync(stellarPath, JSON.stringify({ profiles }, null, 2));
}

function exportToRefract(profiles) {
  const refractPath = path.join(process.env.APPDATA, 'Refract', 'profiles', 'profiles.json');
  // Adjust format for Refract's structure
  const refractProfiles = profiles.map(p => ({
    // Refract-specific mapping
  }));
  fs.writeFileSync(refractPath, JSON.stringify(refractProfiles, null, 2));
}

function exportToValor(profiles) {
  // Valor uses SQLite - need different approach
  const valorDb = new Database(path.join(process.env.APPDATA, 'Valor', 'data.db'));
  profiles.forEach(p => {
    valorDb.prepare('INSERT INTO profiles (name, card, ...) VALUES (?, ?, ...)').run(...);
  });
}

// Export to all bots
exportToStellar(stellarProfiles);
exportToRefract(stellarProfiles);
exportToValor(stellarProfiles);
```

---

## Next Steps

**Before implementing**:

1. ✅ Check which bots you use
2. ✅ Find where profiles are stored (use the check method above)
3. ✅ Determine the file format (JSON, SQLite, encrypted)
4. ✅ Share findings to customize the scripts

**After confirming compatibility**:

1. Create `scripts/` folder in project
2. Add `export-to-bot.js` script (customized for your bot)
3. Add `create-tasks.js` script (customized for your bot)
4. Test with 1-2 dummy profiles first
5. Run before your next drop
6. Iterate based on results

---

## Estimated Time Investment

- **Research**: 1 hour (finding profile locations, understanding format)
- **Script customization**: 2-3 hours (adjusting for your specific bots)
- **Testing**: 1 hour (test exports, verify bot reads profiles correctly)
- **Total**: **4-5 hours** (vs 220 hours for full custom automation)

---

## Support & Troubleshooting

### Common Issues

**Issue**: "Cannot find profiles.json"
- **Solution**: Make sure the bot has been opened at least once and a profile has been created manually

**Issue**: "Profiles don't show up in bot after export"
- **Solution**: Close the bot completely before running export script, then reopen

**Issue**: "Bot crashes after importing profiles"
- **Solution**: Profile format may be incorrect - compare your export to a manually created profile's JSON structure

**Issue**: "Some fields are missing in bot"
- **Solution**: Check the field mapping in export script - bot may use different field names

---

## Future Enhancements

Once basic export is working, consider:

1. **Web Interface**: Add "Export to Bots" button in admin dashboard
2. **Selective Export**: Export only specific retailers or customers
3. **Auto-Sync**: Run export script on a schedule (every hour)
4. **Multi-Bot Management**: Toggle which bots to export to
5. **Profile Validation**: Check for missing/invalid data before export
6. **Task Templates**: Save drop configurations for quick task creation

---

**Document created**: 2025-11-27
**Status**: Planning - Awaiting bot compatibility check
**Estimated implementation time**: 4-5 hours
**Complexity**: Low to Medium (depending on bot format)
