# 🚀 Render Deployment Guide for Socket.IO Admin UI

## Quick Fix for Admin.socket.io Connection Issues

Your Socket.IO server is now configured to work properly with `admin.socket.io` on Render. Here's what was fixed and how to deploy:

## 🔧 Issues Fixed

1. **CORS Configuration**: Added `https://admin.socket.io` to allowed origins
2. **Environment Variables**: Made configuration dynamic using environment variables
3. **Admin Instrumentation**: Fixed Socket.IO Admin UI configuration
4. **Render Compatibility**: Added Render-specific configuration

## 📋 Environment Variables for Render

Set these environment variables in your Render dashboard:

```bash
NODE_ENV=production
PORT=10000
HOST=0.0.0.0
CORS_ORIGIN=https://ashram-queue-socket-server.onrender.com
APP_URL=https://ashram-queue-socket-server.onrender.com
SOCKET_PATH=/socket.io
LOG_LEVEL=warn
ADMIN_AUTH=true
ADMIN_MODE=production
ADMIN_USERNAME=your_secure_username
ADMIN_PASSWORD=your_very_secure_password
```

## 🚀 Deployment Steps

### Option 1: Using render.yaml (Recommended)
1. The `render.yaml` file is already created with proper configuration
2. Connect your GitHub repository to Render
3. Render will automatically detect and use the `render.yaml` configuration

### Option 2: Manual Configuration
1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Set the environment variables listed above
4. Use these build settings:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

## 🔍 Testing Your Deployment

### 1. Health Check
```bash
curl https://ashram-queue-socket-server.onrender.com/health
```

### 2. Admin Info Check
```bash
curl https://ashram-queue-socket-server.onrender.com/admin-info
```

### 3. Connect to Admin UI
1. Go to [https://admin.socket.io](https://admin.socket.io)
2. Enter your server URL: `https://ashram-queue-socket-server.onrender.com`
3. Use your `ADMIN_USERNAME` and `ADMIN_PASSWORD`

## 🔐 Security Recommendations

1. **Change Default Credentials**: Update `ADMIN_USERNAME` and `ADMIN_PASSWORD` to secure values
2. **Use Strong Passwords**: At least 12 characters with mixed case, numbers, and symbols
3. **Monitor Access**: Check Render logs for any suspicious activity

## 🐛 Troubleshooting

### Admin UI Still Not Connecting?

1. **Check Environment Variables**:
   ```bash
   curl https://ashram-queue-socket-server.onrender.com/admin-info
   ```

2. **Verify CORS Configuration**:
   ```bash
   curl -H "Origin: https://admin.socket.io" https://ashram-queue-socket-server.onrender.com/health
   ```

3. **Check Render Logs**:
   - Go to your Render dashboard
   - Click on your service
   - Check the "Logs" tab for any errors

### Common Issues:

1. **"Connection Failed"**: 
   - Verify `ADMIN_AUTH=true` and credentials are set
   - Check that `ADMIN_MODE=production`

2. **"CORS Error"**:
   - Ensure `CORS_ORIGIN` includes your domain
   - Verify `https://admin.socket.io` is in the CORS origins

3. **"Server Not Found"**:
   - Check that your Render service is running
   - Verify the URL is correct (no trailing slash)

## 📊 Monitoring

### Health Endpoints:
- **Health Check**: `/health` - Server status and connection count
- **Admin Info**: `/admin-info` - Admin UI configuration status

### Admin Dashboard Features:
- Real-time connection monitoring
- Room management
- Event logging
- Performance metrics
- Live debugging

## 🔄 Updates and Maintenance

1. **Redeploy**: Push changes to your GitHub repository
2. **Environment Updates**: Change variables in Render dashboard
3. **Monitoring**: Use the admin dashboard to monitor performance

## 📞 Support

If you're still having issues:
1. Check Render service logs
2. Verify all environment variables are set
3. Test the health endpoints
4. Ensure your GitHub repository is properly connected

---

**🎉 Your Socket.IO server should now work perfectly with admin.socket.io on Render!**
