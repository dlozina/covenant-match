import { useEffect, useRef, useCallback } from 'react';

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

// WebSocket service class
class WebSocketService {
  private socket: WebSocket | null = null;
  private messageHandlers: Map<string, MessageHandler[]> = new Map();
  private sessionId: string | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error' = 'disconnected';
  private lastActiveTime: number = Date.now();
  private isReconnectingFlag: boolean = false;
  // Track number of active connections to prevent premature disconnection
  private activeConnections: number = 0;
  
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
  
  // Check if WebSocket is supported
  isSupported(): boolean {
    return typeof WebSocket !== 'undefined';
  }
  
  // Connect to WebSocket
  connect(sessionId: string): void {
    if (!sessionId || sessionId === 'null' || sessionId === 'undefined') {
      console.error('Invalid sessionId provided to WebSocket service');
      return;
    }
    
    if (!this.isSupported()) {
      console.error('WebSocket not supported in this browser');
      return;
    }
    
    // Store the session ID
    this.sessionId = sessionId;
    
    // Update connection status
    this.connectionStatus = 'connecting';
    
    // Reset reconnect attempts when starting a new connection
    this.reconnectAttempts = 0;
    
    try {
      // Get JWT token from localStorage
      const token = localStorage.getItem('token') || '';
      
      if (!token) {
        console.error('No token available for WebSocket connection');
        this.connectionStatus = 'error';
        return;
      }
      
      // Close existing connection if any
      if (this.socket) {
        this.socket.close();
        this.socket = null;
      }
      
      // Build the WebSocket URL with session ID and token
      // Use secure WebSocket protocol if on HTTPS
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/api/v1/ws/sessions/${sessionId}?token=${token}`;
      
      console.log('Connecting WebSocket to:', wsUrl.replace(/token=.*/, 'token=REDACTED'));
      
      // Create new WebSocket instance
      const newSocket = new WebSocket(wsUrl);
      
      // Setup WebSocket event handlers
      newSocket.onopen = () => {
        this.connectionStatus = 'connected';
        console.log('WebSocket connection opened');
        this.reconnectAttempts = 0; // Reset attempts on successful connection
        
        // Send initial ping
        this.sendPing();
      };
      
      newSocket.onclose = (event) => {
        console.log('WebSocket connection closed:', event.code, event.reason);
        this.connectionStatus = 'disconnected';
        
        // Attempt to reconnect if not deliberately closed and not too many attempts
        if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.attemptReconnect();
        } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.error('Failed to reconnect after multiple attempts');
        }
      };
      
      newSocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.connectionStatus = 'error';
        console.error('Error in realtime connection');
      };
      
      newSocket.onmessage = (event) => {
        this.updateActivity();
        
        try {
          // Parse the JSON data
          const message = JSON.parse(event.data);
          const eventType = message.message_type;
          const data = message.data;
          
          // Process heartbeat/pong messages
          if (eventType === 'pong') {
            console.log('Received pong from server');
            // Dispatch custom event for heartbeat
            const heartbeatEvent = new CustomEvent('ws-heartbeat', { 
              detail: { timestamp: Date.now() }
            });
            window.dispatchEvent(heartbeatEvent);
            return;
          }
          
          // Handle event-specific messages
          const handlers = this.messageHandlers.get(eventType) || [];
          if (handlers.length > 0) {
            handlers.forEach(handler => {
              try {
                handler(data);
              } catch (error) {
                console.error(`Error executing ${eventType} handler:`, error);
              }
            });
          }
          
          // Also handle generic message handlers
          const genericHandlers = this.messageHandlers.get('message') || [];
          if (genericHandlers.length > 0) {
            genericHandlers.forEach(handler => {
              try {
                handler(message);
              } catch (error) {
                console.error('Error executing generic message handler:', error);
              }
            });
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      // Store the socket
      this.socket = newSocket;
      
      // Set up ping interval
      this.startPingInterval();
      
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      this.connectionStatus = 'error';
      console.error('Failed to connect to realtime updates');
    }
  }
  
  // Send ping to keep connection alive
  private sendPing(): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(JSON.stringify({
          message_type: 'ping',
          data: { timestamp: Date.now() }
        }));
      } catch (error) {
        console.error('Error sending ping:', error);
      }
    }
  }
  
  // Start ping interval
  private startPingInterval(): void {
    // Clear any existing interval
    if (this.reconnectTimer) {
      clearInterval(this.reconnectTimer);
    }
    
    // Set up new interval
    this.reconnectTimer = setInterval(() => {
      this.sendPing();
    }, 30000); // Send ping every 30 seconds
  }
  
  // Attempt to reconnect
  private attemptReconnect(): void {
    if (this.isReconnectingFlag) return;
    
    this.isReconnectingFlag = true;
    this.reconnectAttempts++;
    
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 16000);
    
    setTimeout(() => {
      if (this.sessionId) {
        this.connect(this.sessionId);
      }
      this.isReconnectingFlag = false;
    }, delay);
  }
  
  // Register event handler
  on(eventType: string, handler: MessageHandler): UnsubscribeFunction {
    if (!this.messageHandlers.has(eventType)) {
      this.messageHandlers.set(eventType, []);
    }
    
    const handlers = this.messageHandlers.get(eventType)!;
    handlers.push(handler);
    
    // Return unsubscribe function
    return () => {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    };
  }
  
  // Check if connected
  isConnected(): boolean {
    return this.connectionStatus === 'connected' && 
           this.socket !== null && 
           this.socket.readyState === WebSocket.OPEN;
  }
  
  // Disconnect WebSocket
  disconnect(force: boolean = false): void {
    // Don't disconnect if force is false and there are still active connections
    if (!force && this.activeConnections > 0) {
      console.log('Not disconnecting WebSocket - still has active connections');
      return;
    }
    
    console.log('Disconnecting WebSocket');
    
    // Clear reconnect timer
    if (this.reconnectTimer) {
      clearInterval(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    // Close socket if it exists
    if (this.socket) {
      try {
        this.socket.close(1000, 'Disconnect requested by client');
      } catch (error) {
        console.error('Error closing WebSocket:', error);
      }
      this.socket = null;
    }
    
    // Reset state
    this.connectionStatus = 'disconnected';
    this.sessionId = null;
    this.reconnectAttempts = 0;
  }
  
  // Reconnect with fresh token
  reconnectWithFreshToken(sessionId: string): void {
    console.log('Reconnecting WebSocket with fresh token');
    this.disconnect(true);
    this.connect(sessionId);
  }
  
  // Track active connections
  incrementConnection(): number {
    return ++this.activeConnections;
  }
  
  decrementConnection(): boolean {
    this.activeConnections = Math.max(0, this.activeConnections - 1);
    return this.activeConnections === 0;
  }
}

// Custom hook for using WebSockets
export function useWebSocketUpdates(sessionId: string | null) {
  const service = useRef(new WebSocketService()).current;
  
  // Connect on mount or when session ID changes
  useEffect(() => {
    if (!sessionId) {
      return;
    }
    
    // Increment connection counter
    service.incrementConnection();
    
    // Connect to the server
    service.connect(sessionId);
    
    // Cleanup on unmount
    return () => {
      console.log('useWebSocketUpdates unmounting, decrementing connection count');
      const shouldDisconnect = service.decrementConnection();
      if (shouldDisconnect) {
        service.disconnect(false);
      }
    };
  }, [sessionId, service]);
  
  // Setup a token change listener to reconnect with fresh token
  useEffect(() => {
    if (!sessionId) return;
    
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token' && e.newValue && e.newValue !== e.oldValue) {
        console.log('Token changed in storage, reconnecting WebSocket');
        service.reconnectWithFreshToken(sessionId);
      }
    };
    
    // Listen for storage events (which occur when token is updated in another tab)
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [sessionId, service]);
  
  // Return the public API
  return {
    subscribe: useCallback((eventType: string, handler: MessageHandler): UnsubscribeFunction => {
      return service.on(eventType, handler);
    }, [service]),
    
    isConnected: useCallback((): boolean => {
      return service.isConnected();
    }, [service]),
    
    disconnect: useCallback((force: boolean = false): void => {
      service.disconnect(force);
    }, [service]),
    
    reconnectWithFreshToken: useCallback((sid: string = sessionId || ''): void => {
      if (sid) {
        service.reconnectWithFreshToken(sid);
      }
    }, [service, sessionId])
  };
} 