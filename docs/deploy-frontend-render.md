# Deploy Frontend Next.js to Render

## Summary
Configured Next.js frontend for Server-Side Rendering (SSR) deployment on Render as a Node Web Service.

## Configuration

### 1. `render.yaml` - Single Source of Truth
The main `render.yaml` file at the repository root contains the configuration for both backend and frontend services.

**Frontend Service Configuration:**
- Type: Web Service (Node.js)
- Runtime: node
- Plan: free
- Build Command: `npm run build`
- Start Command: `npm start`
- Environment Variables:
  - `NEXT_PUBLIC_API_URL` → Backend URL
  - `NEXT_PUBLIC_ENVIRONMENT` → production

### 2. `frontend/next.config.js` - SSR Configuration
The Next.js configuration is set up for Server-Side Rendering:
- No `output: 'export'` (allows SSR)
- `reactStrictMode: true` for best practices
- Image optimization enabled

## Deployment Instructions

### Using render.yaml (Recommended)
1. Ensure `render.yaml` is in your repository root
2. Connect your repository to Render
3. Render will automatically detect and configure both services

### Manual Setup (Alternative)
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **New** → **Web Service**
3. Connect your GitHub repository
4. Configure:
   - **Name**: `consultamed-frontend`
   - **Branch**: `main`
   - **Root Directory**: `frontend`
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

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
If issues persist:
- Check if any components are using `next/image` with unconfigured external domains
- Add allowed domains to `images.domains` in next.config.js if needed

### API Calls Fail
1. Verify `NEXT_PUBLIC_API_URL` is correctly set in Render
2. Check backend CORS configuration
3. Ensure backend is deployed and accessible

### Routes Not Working
SSR handles routing automatically. Ensure all routes work without client-side configuration.

## Notes
- SSR enables dynamic data fetching for medical records
- Server-side rendering provides better security for sensitive healthcare data
- Real-time patient data updates without page reloads
- Better SEO and initial load performance for medical dashboard