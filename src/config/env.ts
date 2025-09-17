/**
 * Environment configuration for Socket.IO server
 * Simplified configuration for single port operation
 */

export const config = {
  // Server configuration
  port: 7077,
  host: '0.0.0.0',
  nodeEnv: 'production',
  
  // CORS configuration - PRODUCTION DOMAIN
  corsOrigin: 'https://ashram-queue-socket-server.onrender.com',
  
  // Socket.IO configuration
  socketPath: '/socket.io',
  
  // Main application URL - PRODUCTION DOMAIN
  appUrl: 'https://ashram-queue-socket-server.onrender.com',
  
  // Logging
  logLevel: 'warn',
  
  // Socket.IO Admin configuration
  adminAuth: true,
  adminMode: 'production',
  adminUsername: 'admin', // Change this to your secure username
  adminPassword: 'secure_password_123' // Change this to your secure password
};