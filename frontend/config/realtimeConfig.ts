/**
 * Configuration for realtime communications
 * Default is to use WebSockets, but can be overridden by environment variables
 */

interface RealtimeConfig {
  useWebSockets: boolean;
  connectionRetryAttempts: number;
  connectionPingInterval: number; // in milliseconds
}

// Load configuration from environment variables if available
const useWebSocketsEnv = process.env.NEXT_PUBLIC_USE_WEBSOCKETS;

// Define the configuration object
const realtimeConfig: RealtimeConfig = {
  // Default to WebSockets, but allow override via environment variable
  useWebSockets: useWebSocketsEnv !== undefined 
    ? useWebSocketsEnv === 'true' 
    : true,
  
  // Number of retry attempts for connections
  connectionRetryAttempts: 5,
  
  // Ping interval for keepalive (30 seconds)
  connectionPingInterval: 30000,
};

export default realtimeConfig; 