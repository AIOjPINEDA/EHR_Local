# Deploy Frontend Next.js to Render

## Summary
Configured Next.js frontend for static export deployment on Render as a Web Service.

## Changes Made

### 1. Updated `frontend/next.config.js`
- Added `output: 'export'` for static generation
- Added `trailingSlash: true` for proper routing
- Added `distDir: 'out'` to specify output directory
- Set `images.unoptimized: true` for static export compatibility

### 2. Created `render-frontend.yaml`
- Render configuration file for Web Service deployment
- Static site configuration with Node.js 18
- Environment variables:
  - `NEXT_PUBLIC_API_URL` → Backend URL (update with actual URL)
  - `NEXT_PUBLIC_APP_NAME` → ConsultaMed
- Security headers configured
- API proxy routing for backend calls

## Deployment Instructions

### Option A: Using Render Dashboard (Recommended)
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **New** → **Static Site**
3. Connect your GitHub repository
4. Configure:
   - **Name**: `consultamed-frontend`
   - **Branch**: `main`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `out`
   - **Node Version**: `18`

### Option B: Using render.yaml
1. Push `render-frontend.yaml` to your repository
2. Connect your repository to Render
3. Render will auto-configure using the YAML file

## Environment Variables to Set in Render

After creating the service, add these environment variables:

```bash
NEXT_PUBLIC_API_URL=https://your-backend-url.onrender.com
NEXT_PUBLIC_APP_NAME=ConsultaMed
```

**Important**: Replace `your-backend-url.onrender.com` with the actual backend URL after deployment.

## Post-Deployment Checklist

1. **Verify Frontend Access**
   ```bash
   curl -I https://consultamed-frontend.onrender.com
   ```

2. **Test API Communication**
   - Open browser dev tools
   - Navigate to the frontend
   - Check Network tab for API calls to backend
   - Verify CORS is properly configured

3. **Update Backend CORS**
   Ensure the backend allows requests from your frontend URL:
   ```python
   # In backend/main.py or CORS middleware config
   CORS_ALLOW_ORIGINS = [
       "https://consultamed-frontend.onrender.com",
       "http://localhost:3000",  # For local development
   ]
   ```

## Troubleshooting

### Build Fails with Image Errors
The `images.unoptimized: true` setting should resolve this. If issues persist:
- Check if any components are using `next/image` with external domains
- Consider using regular `<img>` tags for static export

### API Calls Fail
1. Verify `NEXT_PUBLIC_API_URL` is correctly set in Render
2. Check backend CORS configuration
3. Ensure backend is deployed and accessible

### Routes Not Working
The `trailingSlash: true` configuration ensures proper routing for static exports.

## Notes
- Static export means the frontend is pre-built at deploy time
- No server-side features available (must use client-side only)
- Perfect for cost-effective hosting on Render's free tier