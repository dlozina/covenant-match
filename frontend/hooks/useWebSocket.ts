import { useEffect, useCallback, useState } from 'react';
import { toast } from 'sonner';

// Define types for WebSocket messages and handlers
interface JoinMessageData {
  userId: string;
  username: string;
  nightfarer: string;
  [key: string]: unknown;
}

type MessageData = JoinMessageData | Record<string, unknown>;
type MessageHandler = (data: MessageData) => void;
type UnsubscribeFunction = () => void;

interface WebSocketMessage {
  type: string;
  data: MessageData;
}

// Singleton WebSocket service
class WebSocketService {
  private socket: WebSocket | null = null;
  private messageHandlers: Map<string, MessageHandler[]> = new Map();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private sessionId: string | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error' = 'disconnected';
  private lastActiveTime: number = Date.now();
  
  // Get the current connection status
  getConnectionStatus(): 'disconnected' | 'connecting' | 'connected' | 'error' {
    return this.connectionStatus;
  }
  
  // Update the last active time
  updateActivity(): void {
    this.lastActiveTime = Date.now();
  }
  
  // Get time since last activity in seconds
  getInactiveTime(): number {
    return (Date.now() - this.lastActiveTime) / 1000;
  }
  
  connect(sessionId: string): void {
    if (this.socket) {
      this.disconnect();
    }
    
    this.sessionId = sessionId;
    this.connectionStatus = 'connecting';
    this.updateActivity();
    
    // Ensure token is available
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No authentication token found');
      toast.error('Authentication token not found');
      
      // Schedule a retry after a short delay - token might not be loaded yet
      this.reconnectTimer = setTimeout(() => {
        console.log('Retrying connection - token might be available now');
        this.connect(sessionId);
      }, 1000);
      
      return;
    }
    
    // Use the API base URL from environment variables
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
    
    // Extract the host from the API base URL or use a default
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    let wsHost = '';
    
    // If we have an API base URL, use it to construct the WebSocket URL
    if (apiBaseUrl) {
      try {
        const url = new URL(apiBaseUrl);
        wsHost = url.host;
        console.log('Using API base URL for WebSocket:', url.host);
      } catch {
        console.error('Invalid API base URL:', apiBaseUrl);
        // Fallback to the current host but different port
        wsHost = window.location.hostname + ':8080';
        console.log('Falling back to default WebSocket host:', wsHost);
      }
    } else {
      // Fallback to the current host but different port
      wsHost = window.location.hostname + ':8080';
      console.log('No API base URL provided, using default WebSocket host:', wsHost);
    }
    
    const wsUrl = `${wsProtocol}//${wsHost}/ws/${sessionId}?token=${encodeURIComponent(token)}`;
    console.log('Connecting to WebSocket:', wsUrl);
    
    try {
      // Create WebSocket with a timeout
      this.socket = new WebSocket(wsUrl);
      
      // Set connection timeout
      const connectionTimeout = setTimeout(() => {
        if (this.socket && this.socket.readyState !== WebSocket.OPEN) {
          console.error('WebSocket connection timeout');
          this.socket.close();
          // The onclose handler will handle reconnection
        }
      }, 5000); // 5 second connection timeout
      
      this.socket.onopen = () => {
        clearTimeout(connectionTimeout);
        console.log('WebSocket connected successfully');
        toast.success('WebSocket connected');
        this.reconnectAttempts = 0; // Reset reconnect attempts on successful connection
        this.connectionStatus = 'connected';
        this.updateActivity();
      };
      
      this.socket.onmessage = (event) => {
        this.updateActivity(); // Update activity timestamp on any message
        try {
          console.log('WebSocket message received:', event.data);
          const message = JSON.parse(event.data);
          
          // Handle different message formats (backend sends message_type, frontend expects type)
          const messageType = message.type || message.message_type;
          const messageData = message.data;
          
          if (messageType && messageData) {
            const handlers = this.messageHandlers.get(messageType) || [];
            handlers.forEach(handler => handler(messageData));
          } else {
            console.warn('Received WebSocket message with invalid format:', message);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      this.socket.onclose = (event) => {
        console.log('WebSocket disconnected with code:', event.code, 'reason:', event.reason);
        this.socket = null;
        this.connectionStatus = 'disconnected';
        
        // Attempt to reconnect if not a normal closure
        if (event.code !== 1000 && event.code !== 1001) {
          this.scheduleReconnect();
        }
      };
      
      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        toast.error('WebSocket connection error');
        this.connectionStatus = 'error';
        // Don't close the socket here, let the onclose handler handle it
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      toast.error('Failed to create WebSocket connection');
    }
  }
  
  disconnect(): void {
    if (this.socket) {
      console.log('Manually disconnecting WebSocket');
      this.socket.close();
      this.socket = null;
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    // Reset reconnect attempts
    this.reconnectAttempts = 0;
    this.connectionStatus = 'disconnected';
  }
  
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    // Check if we've exceeded max reconnect attempts
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Maximum reconnect attempts reached, giving up');
      toast.error('Failed to reconnect to WebSocket after multiple attempts');
      return;
    }
    
    // Exponential backoff with jitter: 1-2s, 2-4s, 4-8s, 8-16s, 16-32s
    const baseDelay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    // Add jitter (±20%) to prevent reconnection storms
    const jitter = baseDelay * 0.2 * (Math.random() - 0.5);
    const delay = Math.max(1000, baseDelay + jitter);
    
    this.reconnectAttempts++;
    
    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${Math.round(delay)}ms`);
    
    this.reconnectTimer = setTimeout(() => {
      if (this.sessionId) {
        console.log(`Attempting to reconnect (attempt ${this.reconnectAttempts})`);
        this.connect(this.sessionId);
      }
    }, delay);
  }
  
  on(messageType: string, handler: MessageHandler): UnsubscribeFunction {
    const handlers = this.messageHandlers.get(messageType) || [];
    handlers.push(handler);
    this.messageHandlers.set(messageType, handlers);
    console.log(`Registered handler for message type: ${messageType}`);
    
    // Return unsubscribe function
    return () => {
      const currentHandlers = this.messageHandlers.get(messageType) || [];
      const index = currentHandlers.indexOf(handler);
      if (index !== -1) {
        currentHandlers.splice(index, 1);
        this.messageHandlers.set(messageType, currentHandlers);
        console.log(`Unregistered handler for message type: ${messageType}`);
      }
    };
  }
  
  send(type: string, data: MessageData): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not connected, cannot send message');
      return;
    }
    
    const message: WebSocketMessage = { type, data };
    console.log('Sending WebSocket message:', message);
    this.socket.send(JSON.stringify(message));
  }
  
  // Add a method to check connection status
  isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }
  
  // Add a method to manually reconnect
  reconnect(): void {
    if (!this.sessionId) {
      console.error('Cannot reconnect: No session ID available');
      return;
    }
    
    console.log('Manual reconnection requested');
    
    // Only disconnect if the socket is in a bad state
    if (!this.isConnected()) {
      if (this.socket) {
        console.log('Closing existing socket before reconnecting');
        this.disconnect();
      }
      
      // Reset reconnect attempts for manual reconnection
      this.reconnectAttempts = 0;
      
      // Connect with a small delay to ensure clean state
      setTimeout(() => {
        console.log('Reconnecting after manual request');
        this.connect(this.sessionId as string);
      }, 100);
    } else {
      console.log('Socket already connected, no need to reconnect');
    }
  }
}

// Create a singleton instance
const websocketService = new WebSocketService();

// Custom hook for using WebSockets
export function useWebSocket(sessionId: string | null, options = { 
  inactivityTimeout: 30 * 60 * 1000, // 30 minutes by default
  visibilityTimeout: 5 * 60 * 1000,  // 5 minutes by default
  autoReconnect: true
}) {
  // Track if the page is visible
  const [isPageVisible, setIsPageVisible] = useState<boolean>(true);
  
  // Set up inactivity checker
  useEffect(() => {
    if (!sessionId || !options.inactivityTimeout) return;
    
    const inactivityCheck = setInterval(() => {
      const inactiveTime = websocketService.getInactiveTime();
      
      // If inactive for longer than the timeout, disconnect
      if (inactiveTime * 1000 > options.inactivityTimeout && 
          websocketService.isConnected()) {
        console.log(`Disconnecting WebSocket due to inactivity (${Math.round(inactiveTime)} seconds)`);
        websocketService.disconnect();
      }
    }, 60000); // Check every minute
    
    return () => {
      clearInterval(inactivityCheck);
    };
  }, [sessionId, options.inactivityTimeout]);
  
  // Handle page visibility changes
  useEffect(() => {
    if (!sessionId) return;
    
    let disconnectTimer: NodeJS.Timeout | null = null;
    
    const handleVisibilityChange = () => {
      const visible = document.visibilityState === 'visible';
      setIsPageVisible(visible);
      
      // If page becomes visible and we're not connected, reconnect
      if (visible && !websocketService.isConnected() && sessionId && options.autoReconnect) {
        console.log('Page became visible, reconnecting WebSocket');
        websocketService.reconnect();
        
        // Clear any disconnect timer
        if (disconnectTimer) {
          clearTimeout(disconnectTimer);
          disconnectTimer = null;
        }
      }
      
      // If page is hidden for more than the visibility timeout, disconnect to save resources
      if (!visible && options.visibilityTimeout) {
        disconnectTimer = setTimeout(() => {
          console.log(`Page hidden for ${options.visibilityTimeout/60000} minutes, disconnecting WebSocket to save resources`);
          websocketService.disconnect();
          disconnectTimer = null;
        }, options.visibilityTimeout);
      } else if (disconnectTimer) {
        clearTimeout(disconnectTimer);
        disconnectTimer = null;
      }
    };
    
    // Set up visibility change listener
    document.addEventListener('visibilitychange', handleVisibilityChange);
    // Initial check
    handleVisibilityChange();
    
    // Clean up
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (disconnectTimer) {
        clearTimeout(disconnectTimer);
      }
    };
  }, [sessionId, options.visibilityTimeout, options.autoReconnect]);
  
  useEffect(() => {
    if (!sessionId) {
      console.log('No session ID provided, not connecting to WebSocket');
      return;
    }
    
    console.log('useWebSocket hook initializing with session ID:', sessionId);
    
    // Only connect if the page is visible
    if (isPageVisible) {
      // Add a small delay before connecting to ensure token is loaded
      // and server is ready to accept connections
      const connectionTimer = setTimeout(() => {
        // Connect to WebSocket
        websocketService.connect(sessionId);
      }, 500); // 500ms delay before initial connection
      
      // Cleanup on unmount
      return () => {
        clearTimeout(connectionTimer);
        console.log('useWebSocket hook cleaning up');
        websocketService.disconnect();
      };
    }
    
    return () => {
      console.log('useWebSocket hook cleaning up');
      websocketService.disconnect();
    };
  }, [sessionId, isPageVisible]);
  
  const subscribe = useCallback((messageType: string, handler: MessageHandler): UnsubscribeFunction => {
    if (!messageType || !handler) {
      console.warn('Invalid parameters for subscribe');
      return () => {}; // Return empty function if invalid params
    }
    console.log(`Subscribing to message type: ${messageType}`);
    return websocketService.on(messageType, handler);
  }, []); // Empty dependency array is correct since websocketService is a singleton
  
  const send = useCallback((type: string, data: MessageData): void => {
    console.log(`Sending message of type: ${type}`);
    websocketService.send(type, data);
  }, []); // Empty dependency array is correct since websocketService is a singleton
  
  const reconnect = useCallback(() => {
    websocketService.reconnect();
  }, []);
  
  const isConnected = useCallback(() => {
    return websocketService.isConnected();
  }, []);
  
  return { subscribe, send, reconnect, isConnected };
} 