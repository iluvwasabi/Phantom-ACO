# Running Database Migrations on Render

## ⚠️ IMPORTANT: Run These Migrations on Render

After deploying new code, you need to run the database migrations to add the new columns.

## How to Run Migrations on Render

### Option 1: Using Render Shell (Recommended)

1. Go to your Render dashboard
2. Click on your web service
3. Go to the "Shell" tab
4. Run this command:

```bash
node src/migrations/run-all-migrations.js
```

### Option 2: SSH into Render

```bash
# SSH into your Render instance
ssh [your-render-ssh-command]

# Navigate to project directory
cd /opt/render/project/src

# Run migrations
node src/migrations/run-all-migrations.js
```

## What This Migration Does

The migration adds the following columns to the `users` table:

1. `first_name` (TEXT) - User's first name
2. `last_name` (TEXT) - User's last name
3. `billing_same_as_shipping` (INTEGER, default: 1) - Flag for billing address
4. `max_qty` (INTEGER, default: 1) - Max quantity per checkout
5. `max_checkouts` (INTEGER, default: 1) - Max checkouts per drop

## Verify Migration Success

After running the migration, you should see output like:

```
✓ Added first_name column
✓ Added last_name column
✓ Added billing_same_as_shipping column
✓ Added max_qty column
✓ Added max_checkouts column
✅ All migrations completed successfully!
```

If you see "column already exists" messages, that's fine - it means the migration was already run.

## Troubleshooting

If you see errors about "no such column: first_name" or similar:
- The migration hasn't been run yet
- Follow the steps above to run the migration
- Restart your Render service after running migrations

## After Migration

Once the migration is complete:
- Restart your Render service
- The new fields should work in the admin panel
- Users can now input first name, last name, max qty, and max checkouts
- Admins can edit these fields in the submission edit modal
