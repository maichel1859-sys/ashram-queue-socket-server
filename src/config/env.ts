import dotenv from 'dotenv';
dotenv.config();

/**
 * Environment configuration for Socket.IO server
 * Simplified configuration for single port operation
 */

export const config = {
  // Server configuration
  port: process.env['PORT'] || 7077,
  host: process.env['HOST'] || '0.0.0.0',
  nodeEnv: process.env['NODE_ENV'] || 'development',
  
  // CORS configuration
  corsOrigin: process.env['CORS_ORIGIN'] || 'http://localhost:3000',
  
  // Socket.IO configuration
  socketPath: process.env['SOCKET_PATH'] || '/socket.io',
  
  // Main application URL
  appUrl: process.env['APP_URL'] || 'http://localhost:3000',
  
  // Logging
  logLevel: process.env['LOG_LEVEL'] || 'info',
  
  // Socket.IO Admin configuration
  adminAuth: process.env['ADMIN_AUTH'] === 'true',
  adminMode: process.env['ADMIN_MODE'] || 'development',
  adminUsername: process.env['ADMIN_USERNAME'],
  adminPassword: process.env['ADMIN_PASSWORD']
};