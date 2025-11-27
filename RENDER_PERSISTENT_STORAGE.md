# Render Persistent Storage Setup for Logo Uploads

## Problem
Logo uploads were being lost on every deployment because they were stored in the ephemeral filesystem, which gets wiped on each deploy.

## Solution
Configure Render's persistent disk to store uploads permanently.

## Setup Steps

### 1. Create a Persistent Disk in Render

1. Go to your Render dashboard
2. Click on your web service
3. Navigate to **"Disks"** in the left sidebar
4. Click **"Add Disk"**
5. Configure:
   - **Name**: `uploads-disk` (or any name you prefer)
   - **Mount Path**: `/data`
   - **Size**: 1 GB (or more if needed)
6. Click **"Save Changes"**

### 2. Add Environment Variable

1. In your Render service, go to **"Environment"**
2. Add a new environment variable:
   - **Key**: `UPLOADS_DIR`
   - **Value**: `/data/uploads`
3. Click **"Save Changes"**

### 3. Deploy

Render will automatically redeploy with the new configuration. Your uploads will now persist across deployments!

## How It Works

- **Locally**: Uploads are stored in `./public/uploads` (default)
- **On Render**: Uploads are stored in `/data/uploads` (persistent disk)
- The app automatically serves files from the correct location based on the `UPLOADS_DIR` environment variable

## Verify It's Working

1. Upload a logo through the admin settings
2. Check that the logo displays correctly
3. Trigger a redeploy (push a commit or manual redeploy)
4. After redeploy, the logo should still be there!

## File Locations

- **Logo uploads**: `{UPLOADS_DIR}/logos/`
- **Database**: Already using persistent storage via `DATABASE_PATH`
- **Sessions**: Stored in `./data/sessions.db` (gets cleared on startup, which is intentional)

## Cost

Render's persistent disks are free for the first 1 GB on the free plan, and very affordable on paid plans.
