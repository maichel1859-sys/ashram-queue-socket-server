# 🚀 Aashram Queue Socket Server

A **Socket.IO server** for real-time queue management in the Aashram app. This server runs on **ONE PORT ONLY** (7077) and includes Socket.IO Admin for easy monitoring.

## ✨ Features

- **Single Port Operation** - Only runs on port 7077
- **Real-time Queue Updates** - Live queue position and status updates
- **Socket.IO Admin** - Built-in monitoring dashboard at `/admin`
- **TypeScript** - Full type safety
- **CORS Ready** - Configured for your main app
- **Health Check** - `/health` endpoint for monitoring
- **Production Ready** - Environment-based configuration

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
Copy `.env.example` to `.env` and configure:
```bash
# Server Configuration
NODE_ENV=development
PORT=7077
HOST=0.0.0.0

# CORS Configuration  
CORS_ORIGIN=http://localhost:3000

# Socket.IO Configuration
SOCKET_PATH=/socket.io

# Socket.IO Admin (Optional - for monitoring)
ADMIN_AUTH=false
ADMIN_MODE=development
```

### 3. Start Server
```bash
# Development
npm run dev

# Production
npm run build && npm start
```

## 📍 **Single Port Setup**

Your server now runs on **ONLY ONE PORT**:
- **Main Server**: `http://localhost:7077`
- **Socket.IO**: `ws://localhost:7077/socket.io`
- **Admin Dashboard**: `http://localhost:7077/admin`
- **Health Check**: `http://localhost:7077/health`

## 🔍 Socket.IO Admin Dashboard

Access the built-in monitoring dashboard at:
```
http://localhost:7077/admin
```

**Features:**
- Real-time connection monitoring
- Room management
- Event logging
- Performance metrics
- Live debugging

**Authentication:**
- **Development**: No authentication (ADMIN_AUTH=false)
- **Production**: Basic authentication required (ADMIN_AUTH=true)

## 🔌 Integration with Main App

### Connect from your main app:
```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:7077', {
  path: '/socket.io',
  transports: ['websocket', 'polling']
});

// Listen for queue updates
socket.on('queue_update', (data) => {
  console.log('Queue updated:', data);
});
```

### Queue Management Examples:

#### Join Queue Room
```typescript
// Join as a user
socket.emit('join_room', { 
  userId: 'user-123', 
  role: 'USER' 
});

// Join as a guruji
socket.emit('join_room', { 
  gurujiId: 'guruji-456', 
  role: 'GURUJI' 
});

// Join as admin
socket.emit('join_room', { 
  role: 'ADMIN' 
});
```

#### Listen for Queue Events
```typescript
// Queue position updates
socket.on('queue_position_updated', (data) => {
  console.log(`New position: ${data.position}`);
});

// Queue entry updates
socket.on('queue_entry_updated', (entry) => {
  console.log(`Entry updated: ${entry.id}`);
});

// Queue entry added/removed
socket.on('queue_entry_added', (entry) => {
  console.log(`New entry: ${entry.id}`);
});

socket.on('queue_entry_removed', (entry) => {
  console.log(`Entry removed: ${entry.id}`);
});
```

#### Request Queue Information
```typescript
// Request queue update
socket.emit('request_queue_update');

// Request user's queue status
socket.emit('request_user_queue_status', { 
  userId: 'user-123' 
});

// Request guruji's queue
socket.emit('request_guruji_queue', { 
  gurujiId: 'guruji-456' 
});
```

### Health Monitoring
```typescript
// Check server health
const health = await fetch('http://localhost:7077/health');
const status = await health.json();
console.log('Active connections:', status.socketConnections);
```

## 📊 Available Endpoints

- **`/`** - Server info
- **`/health`** - Health check with connection stats
- **`/admin`** - Socket.IO Admin dashboard
- **`/socket.io/`** - Socket.IO WebSocket endpoint

## 🎯 What You Get

- ✅ **Single Port** - No more multiple ports confusion
- ✅ **Real-time Updates** - Instant queue position changes
- ✅ **Admin Dashboard** - Monitor connections and events
- ✅ **Health Monitoring** - Server status and metrics
- ✅ **Easy Integration** - Simple HTTP and WebSocket APIs
- ✅ **Production Ready** - Environment-based configuration

## 🔧 Configuration

### Environment Variables
```bash
PORT=7077                    # Server port (default: 7077)
HOST=0.0.0.0                # Server host (default: 0.0.0.0)
CORS_ORIGIN=http://localhost:3000  # Your main app URL
SOCKET_PATH=/socket.io       # Socket.IO path
ADMIN_AUTH=false             # Admin authentication (default: false)
ADMIN_MODE=development       # Admin mode (default: development)
```

## 🚨 Troubleshooting

### Port Already in Use
```bash
# Check what's using port 7077
netstat -an | findstr :7077

# Kill process if needed
taskkill /PID <PID> /F
```

### CORS Issues
Make sure your main app URL is in `CORS_ORIGIN`:
```bash
CORS_ORIGIN=http://localhost:3000
```

### Admin Dashboard Not Loading
Check that `ADMIN_AUTH=false` in your `.env` file for development.

## 🚀 Production Deployment

For production deployment, see **[PRODUCTION.md](./PRODUCTION.md)** for:
- Environment variable setup
- Security configuration
- Nginx reverse proxy setup
- PM2 process management
- SSL/TLS configuration
- Performance tuning
- Monitoring and health checks

## 📚 Documentation

- **Socket.IO Admin**: [Official Docs](https://socket.io/docs/v4/admin-ui/)
- **Socket.IO**: [Official Docs](https://socket.io/docs/v4/)
- **Production Guide**: [PRODUCTION.md](./PRODUCTION.md)

---

**🎉 Now you have a clean, single-port Socket.IO server with built-in monitoring and production-ready configuration!**