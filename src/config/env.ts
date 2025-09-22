/**
 * Environment configuration for Socket.IO server
 * Simplified configuration for single port operation
 */

export const config = {
  // Server configuration - Use PORT environment variable for deployment
  port: process.env['PORT'] ? parseInt(process.env['PORT']) : 7077,
  host: '0.0.0.0',
  nodeEnv: process.env['NODE_ENV'] || 'production',

  // CORS configuration - Allow multiple origins including admin.socket.io
  corsOrigin: process.env['CORS_ORIGIN'] || 'https://ashram-queue-socket-server.onrender.com',

  // Socket.IO configuration
  socketPath: process.env['SOCKET_PATH'] || '/socket.io',

  // Main application URL
  appUrl: process.env['APP_URL'] || 'https://ashram-queue-socket-server.onrender.com',

  // Logging
  logLevel: process.env['LOG_LEVEL'] || 'warn',

  // Socket.IO Admin configuration
  adminAuth: process.env['ADMIN_AUTH'] === 'true',
  adminMode: (process.env['ADMIN_MODE'] as 'development' | 'production') || 'production',
  adminUsername: process.env['ADMIN_USERNAME'] || 'admin',
  adminPassword: process.env['ADMIN_PASSWORD'] || 'secure_password_123'
};