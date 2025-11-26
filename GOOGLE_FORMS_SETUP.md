# Google Forms Setup Guide

This guide will walk you through creating and configuring Google Forms for the ACO Service system.

## Overview

You need to create **TWO** Google Forms:
1. **Login Required Services Form** - For Target, Walmart, Best Buy
2. **No Login Services Form** - For Pokemon Center, Shopify sites

## Step 1: Create the Forms

### Form A: Login Required Services

1. Go to [Google Forms](https://forms.google.com)
2. Click "Blank" to create a new form
3. Name it: "ACO Service - Login Required Registration"

#### Add These Questions (in order):

1. **Discord ID** (Short answer, Required)
   - Description: "Your Discord ID will be automatically filled"

2. **Discord Username** (Short answer, Required)
   - Description: "Your Discord username will be automatically filled"

3. **Service Name** (Short answer, Required)
   - Description: "Which service are you registering for"

4. **Retailer Account Username** (Short answer, Required)
   - Description: "Your account username/email for the retailer"

5. **Retailer Account Password** (Short answer, Required)
   - Description: "Your account password (will be encrypted)"

6. **iMap** (Short answer, Required)
   - Description: "Your iMap for identity verification"
   - Help text: "Find your iMap at https://www.icloud.com/imap"

7. **Shipping Address - Street** (Short answer, Required)

8. **Shipping Address - City** (Short answer, Required)

9. **Shipping Address - State** (Short answer, Required)

10. **Shipping Address - ZIP Code** (Short answer, Required)

11. **Payment - Card Number** (Short answer, Required)
    - Description: "Credit card number (will be encrypted)"

12. **Payment - Expiration (MM/YY)** (Short answer, Required)

13. **Payment - CVV** (Short answer, Required)
    - Description: "Security code (will be encrypted)"

14. **Payment - Billing ZIP** (Short answer, Required)

15. **Phone Number** (Short answer, Required)
    - Description: "For order notifications"

### Form B: No Login Services

1. Create another new form
2. Name it: "ACO Service - No Login Registration"

#### Add These Questions (in order):

1. **Discord ID** (Short answer, Required)
   - Description: "Your Discord ID will be automatically filled"

2. **Discord Username** (Short answer, Required)
   - Description: "Your Discord username will be automatically filled"

3. **Service Name** (Short answer, Required)
   - Description: "Which service are you registering for"

4. **Shipping Address - Street** (Short answer, Required)

5. **Shipping Address - City** (Short answer, Required)

6. **Shipping Address - State** (Short answer, Required)

7. **Shipping Address - ZIP Code** (Short answer, Required)

8. **Payment - Card Number** (Short answer, Required)
   - Description: "Credit card number (will be encrypted)"

9. **Payment - Expiration (MM/YY)** (Short answer, Required)

10. **Payment - CVV** (Short answer, Required)
    - Description: "Security code (will be encrypted)"

11. **Payment - Billing ZIP** (Short answer, Required)

12. **Phone Number** (Short answer, Required)
    - Description: "For order notifications"

## Step 2: Get Form URLs

1. Click "Send" in the top right
2. Click the link icon
3. Copy the form URL
4. Save this URL - you'll need it for the `.env` file

Example URL format:
```
https://docs.google.com/forms/d/e/1FAIpQLSe_XXXXXXXXXXXXXXXXXXXXXX/viewform
```

## Step 3: Get Prefill Entry IDs

This is the **most important** step for linking Discord users to form submissions.

### For Each Form:

1. Click the "Send" button
2. Fill out the form with test data:
   - Discord ID: `test123`
   - Discord Username: `testuser`
   - Fill in other fields with dummy data

3. Submit the form

4. In the form editor, click "Responses" tab
5. Click "View in Sheets" to create a Google Sheet

6. Go back to the form, click "Send" again
7. Fill out the form again with DIFFERENT test data
8. **Before submitting**, look at the URL

9. The URL will look like:
```
https://docs.google.com/forms/d/e/FORM_ID/viewform?usp=pp_url
&entry.123456789=test123
&entry.987654321=testuser
&entry.111222333=...
```

10. Find the entry IDs for:
    - `entry.XXXXXXXX` that corresponds to Discord ID
    - `entry.YYYYYYYY` that corresponds to Discord Username

### Alternative Method (Easier):

1. Open the form in edit mode
2. Click the three dots menu (⋮) on a question
3. Select "Get pre-filled link"
4. Enter test data in the fields you want to prefill
5. Click "Get Link"
6. The URL will show the entry IDs:
```
https://docs.google.com/forms/d/e/FORM_ID/viewform?
entry.123456789=TestDiscordID
&entry.987654321=TestUsername
```

## Step 4: Configure .env File

Copy the entry IDs to your `.env` file:

```env
# Form URLs
FORM_LOGIN_SERVICES=https://docs.google.com/forms/d/e/YOUR_FORM_ID/viewform
FORM_NO_LOGIN_SERVICES=https://docs.google.com/forms/d/e/YOUR_FORM_ID/viewform

# Login Required Form Entry IDs
FORM_LOGIN_DISCORD_ID_ENTRY=entry.123456789
FORM_LOGIN_DISCORD_USERNAME_ENTRY=entry.987654321

# No Login Form Entry IDs
FORM_NO_LOGIN_DISCORD_ID_ENTRY=entry.111111111
FORM_NO_LOGIN_DISCORD_USERNAME_ENTRY=entry.222222222
```

## Step 5: Test the Integration

1. Start your ACO Service application
2. Login with Discord
3. Try to subscribe to a service
4. The Google Form should open with Discord ID and Username pre-filled
5. Submit the form
6. Check the Google Sheet to verify the data was recorded

## Step 6: Set Up Response Collection (Optional)

### Create a Google Apps Script to Process Responses:

1. In your Google Sheet (form responses), click "Extensions" > "Apps Script"
2. Create a script to:
   - Validate submissions
   - Send Discord notifications
   - Export data to your ACO system

Example script:
```javascript
function onFormSubmit(e) {
  var responses = e.values;
  var discordId = responses[1]; // Adjust index based on your form
  var serviceName = responses[3];

  // Send webhook to your server
  var webhookUrl = 'YOUR_SERVER_WEBHOOK_URL';
  var payload = {
    discordId: discordId,
    service: serviceName,
    timestamp: new Date()
  };

  UrlFetchApp.fetch(webhookUrl, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload)
  });
}
```

3. Set up a trigger:
   - Click "Triggers" (clock icon)
   - Add trigger
   - Choose "onFormSubmit"
   - Event type: "On form submit"

## Security Best Practices

1. **Limit Access**:
   - Go to Form Settings
   - Uncheck "Collect email addresses" if not needed
   - Check "Limit to 1 response" to prevent spam

2. **Response Validation**:
   - Use "Response validation" for specific fields
   - Example: For ZIP code, use regex validation

3. **Data Protection**:
   - Regularly export and backup form responses
   - Delete old responses containing sensitive data
   - Use Google Forms encryption add-ons if needed

4. **Monitor Responses**:
   - Set up email notifications for new responses
   - Form Settings > Responses > "Get email notifications for new responses"

## Troubleshooting

### Forms Not Pre-filling?

1. Check that entry IDs are correct in `.env`
2. Verify the form URLs are complete
3. Test the prefill URL manually:
   ```
   YOUR_FORM_URL?entry.123456789=TestID&entry.987654321=TestUser
   ```

### Data Not Appearing in Sheet?

1. Check that responses are being accepted (form is not closed)
2. Verify the Google Sheet is linked (Responses > View in Sheets)
3. Check Sheet permissions

### Entry IDs Changed?

- Entry IDs change if you modify or recreate questions
- Always get fresh entry IDs if you edit the form structure

## Next Steps

After setting up the forms:

1. Add the URLs and entry IDs to your `.env` file
2. Test the full flow: Discord login → Service selection → Form submission
3. Verify data is captured correctly in Google Sheets
4. Set up any automated processing or notifications
5. Train your team on how to access and process form responses

## Support

For issues with Google Forms integration, check:
- [Google Forms Help Center](https://support.google.com/docs/topic/9054603)
- Your `.env` configuration
- Browser console for JavaScript errors
