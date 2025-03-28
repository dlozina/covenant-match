import { useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { EventSourcePolyfill } from 'event-source-polyfill';

// Define types for event messages
type MessageHandler = (data: unknown) => void;
type UnsubscribeFunction = () => void;

// Singleton EventSource service - simplified for single page use case
class EventSourceService {
  private eventSource: EventSource | null = null;
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
  
  // Check if EventSource is supported
  isSupported(): boolean {
    return typeof EventSource !== 'undefined';
  }
  
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
    if (!sessionId || sessionId === 'null' || sessionId === 'undefined') {
      console.error(`Invalid session ID provided for connection: ${sessionId}`);
      return;
    }
    
    console.log(`connect() called for session ${sessionId}. Current session: ${this.sessionId}, status: ${this.connectionStatus}`);
    
    // If we're already connected to this same session, just update activity
    if (this.sessionId === sessionId && this.eventSource && 
        this.connectionStatus === 'connected') {
      console.log(`Already connected to session ${sessionId}, updating activity`);
      this.updateActivity();
      return;
    }
    
    // If we're already connecting to this session, don't create another connection
    if (this.sessionId === sessionId && this.eventSource && 
        this.connectionStatus === 'connecting' && 
        this.eventSource.readyState !== EventSource.CLOSED) {
      console.log(`Already connecting to session ${sessionId}, waiting for connection to establish`);
      this.updateActivity();
      return;
    }
    
    // If we're in error state but the connection is not CLOSED and for the same session,
    // don't create a new connection - our error handler will take care of reconnection
    if (this.sessionId === sessionId && this.eventSource && 
        this.connectionStatus === 'error' && 
        this.eventSource.readyState !== EventSource.CLOSED &&
        this.isReconnectingFlag) {
      console.log(`Connection is in error state but reconnecting - not creating new connection for ${sessionId}`);
      this.updateActivity();
      return;
    }
    
    // If we're in error state or trying to connect to a different session, clean up first
    console.log(`Creating new connection to session ${sessionId}`);
    
    // Close existing connection if there is one
    if (this.eventSource) {
      console.log(`Closing existing EventSource connection to ${this.sessionId}`);
      if (this.eventSource.readyState !== EventSource.CLOSED) {
        this.eventSource.close();
      }
      this.eventSource = null;
    }
    
    // Set the session ID
    this.sessionId = sessionId;
    this.connectionStatus = 'connecting';
    
    // Get the API base URL from environment variable
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
    
    // Get the token from localStorage with validation
    const getValidToken = (): string | null => {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        return null;
      }
      
      // Just do basic validation without attempting to check expiration
      try {
        // Parse the token to verify it's valid JWT format
        const base64Url = token.split('.')[1];
        if (!base64Url) {
          console.error('Invalid token format');
          return null;
        }
        
        // Log that we're using the token - don't worry about expiration as auth-context handles that
        console.log('Retrieved token from localStorage for EventSource connection');
        return token;
      } catch (error) {
        console.error('Error parsing token:', error);
        return null;
      }
    };
    
    const token = getValidToken();
    if (!token) {
      console.error('No valid authentication token found');
      this.connectionStatus = 'error';
      toast.error('Authentication error - please refresh the page or log in again');
      return;
    }
    
    try {
      // Create a new EventSource connection with the correct endpoint
      const url = `${apiBaseUrl}/api/v1/sse/sessions/${sessionId}/events`;
      
      // Check for debug mode via URL
      const isDebugMode = typeof window !== 'undefined' && 
                          window.location.search.includes('debug=eventsource');
      
      // Create the EventSource instance -> this is the polyfilled EventSource
      const newEventSource = new EventSourcePolyfill(
        url, 
        {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          // Increase the heartbeat timeout to 2 minutes (120,000ms)
          // This value should be longer than the server's heartbeat interval
          heartbeatTimeout: 120000
        }
      );
      
      // For debugging the polyfill internals
      console.log('EventSourcePolyfill created with options:', {
        url,
        heartbeatTimeout: 120000
      });
      
      // Add a very low-level event listener to log all raw messages if in debug mode
      if (isDebugMode) {
        // Use the message event which triggers for any SSE event
        newEventSource.addEventListener('message', (event) => {
          console.log('RAW SSE MESSAGE:', { type: event.type, data: event.data });
        });
        
        // Add event listeners for open and error events in debug mode
        newEventSource.addEventListener('open', () => console.log('RAW SSE: Connection opened'));
        newEventSource.addEventListener('error', () => console.log('RAW SSE: Connection error'));
      }
      
      // Set up connection state handlers first
      newEventSource.onopen = () => {
        console.log('SSE connection opened successfully');
        this.connectionStatus = 'connected';
        this.reconnectAttempts = 0;
        this.isReconnectingFlag = false;
        this.updateActivity();
        // todo: Remove this once testing is done
        //toast.success('Real-time updates connected');
      };
      
      // Handle reconnection
      newEventSource.onerror = (error) => {
        const readyState = (error.target as EventSource)?.readyState;
        console.log('EventSource error:', error, 'readyState:', readyState);
        
        // Check for "No activity" error which is a special case from the polyfill
        const errorMessage = error.toString();
        const isNoActivityError = errorMessage.includes && errorMessage.includes('No activity within');
        
        if (isNoActivityError) {
          console.log('No activity error detected from polyfill. This should be fixed by increasing heartbeatTimeout.');
          
          // Don't treat this as a fatal error, as our longer heartbeatTimeout should prevent it
          this.connectionStatus = 'connecting';
          
          // Force a heartbeat from client side to reset the activity timer
          if (this.eventSource) {
            console.log('Dispatching fake heartbeat to keep connection alive');
            const fakeEvent = new CustomEvent('sse-heartbeat', { 
              detail: { 
                timestamp: Date.now(),
                formattedTime: new Date().toLocaleTimeString(),
                message: "Client-side heartbeat",
                sequence: "client",
                sessionId: this.sessionId,
                receivedAt: new Date().toLocaleTimeString(),
                source: "client-heartbeat"
              } 
            });
            window.dispatchEvent(fakeEvent);
          }
          
          return;
        }
        
        if (readyState === EventSource.CLOSED) {
          console.log('EventSource connection closed - handling reconnection');
          this.connectionStatus = 'error';
          
          // Manage reconnection with backoff
          if (this.reconnectAttempts < this.maxReconnectAttempts && !this.isReconnectingFlag) {
            this.isReconnectingFlag = true;
            const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 10000); // Reduced backoff, max 10s
            
            console.log(`Will attempt to reconnect in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
            
            if (this.reconnectTimer) {
              clearTimeout(this.reconnectTimer);
            }
            
            this.reconnectTimer = setTimeout(() => {
              this.reconnectAttempts++;
              
              // Close the EventSource if it's still open
              if (this.eventSource) {
                this.eventSource.close();
                this.eventSource = null;
              }
              
              console.log(`Attempting reconnection #${this.reconnectAttempts} for session ${this.sessionId}`);
              
              // Reconnect with the same session ID
              if (this.sessionId) {
                this.connect(this.sessionId);
              }
            }, delay);
          } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log('Maximum reconnection attempts reached');
            toast.error('Could not establish a stable connection. Please refresh the page.');
          }
        } else {
          console.log('EventSource error but connection not closed, status:', readyState);
          this.connectionStatus = 'connecting';
        }
      };
      
      // Register standard SSE event handlers for all subscribed event types
      for (const [eventType, handlers] of this.messageHandlers.entries()) {
        newEventSource.addEventListener(eventType, ((event) => {
          this.updateActivity();
          try {
            // Use type assertion here to tell TypeScript that this event has a data property
            const data = JSON.parse((event as MessageEvent).data);
            
            // Call all handlers for this event type
            handlers.forEach(handler => {
              try {
                handler(data);
              } catch (error) {
                console.error(`Error in ${eventType} event handler:`, error);
              }
            });
          } catch (error) {
            console.error(`Error parsing ${eventType} data:`, error);
          }
        }));
      }
      
      // Set up handler for ping events
      newEventSource.addEventListener('ping', () => {
        this.updateActivity();
        // Silent ping handling
      });
      
      // Set up handler for heartbeat events
      newEventSource.addEventListener('heartbeat', ((event) => {
        this.updateActivity();
        try {
          // Use type assertion here to tell TypeScript that this event has a data property
          const data = JSON.parse((event as MessageEvent).data);
          
          // Create a local timestamp for received time (browser time)
          const localTime = new Date().toLocaleTimeString();
          
          // Improved logging for heartbeats
          console.log(`❤️ Heartbeat received at ${localTime} - server timestamp: ${data.timestamp || 'unknown'}, sequence: ${data.sequence || 'unknown'}`);
          
          // Dispatch a custom event for heartbeat visualization
          const heartbeatEvent = new CustomEvent('sse-heartbeat', { 
            detail: { 
              timestamp: data.timestamp, 
              formattedTime: data.formatted_time || localTime,
              message: data.message || "Server heartbeat",
              sequence: data.sequence || "unknown",
              sessionId: this.sessionId,
              receivedAt: localTime,
              source: "heartbeat-handler"
            } 
          });
          window.dispatchEvent(heartbeatEvent);
        } catch (error) {
          console.error('Error parsing heartbeat data:', error);
        }
      }));
      
      // Set up handler for welcome events
      newEventSource.addEventListener('welcome', () => {
        this.updateActivity();
        console.log('Received welcome message - connection established');
      });
      
      // Set up handler for connection events
      newEventSource.addEventListener('connection', () => {
        this.updateActivity();
        // Silent connection handling
      });
      
      // Set up a generic message handler for any other event types
      newEventSource.onmessage = (event) => {
        this.updateActivity();
        
        // Log the raw event for debugging (only log beginning of data to avoid huge logs)
        console.log('Default message event received:', { 
          type: event.type,
          data: typeof event.data === 'string' ? event.data.substring(0, 100) : event.data
        });
        
        try {
          // Parse the JSON data
          const parsedData = JSON.parse(event.data);
          
          // Find any handlers registered for 'message' event type
          const handlers = this.messageHandlers.get('message') || [];
          
          if (handlers.length > 0) {
            handlers.forEach(handler => {
              try {
                handler(parsedData);
              } catch (error) {
                console.error('Error executing message handler:', error);
              }
            });
          }
        } catch (error) {
          console.error('Error parsing message event data:', error);
        }
      };
      
      // Assign the EventSource
      this.eventSource = newEventSource;
      
      // Log successful connection
      console.log(`SSE connection established to session ${sessionId}`);
    } catch (error) {
      console.error('Error creating EventSource:', error);
      this.connectionStatus = 'error';
      toast.error('Failed to connect to real-time updates');
    }
  }
  
  incrementConnection(): void {
    this.activeConnections++;
    console.log(`Active connections: ${this.activeConnections}`);
  }

  decrementConnection(): boolean {
    if (this.activeConnections > 0) {
      this.activeConnections--;
    }
    console.log(`Active connections: ${this.activeConnections}`);
    return this.activeConnections === 0;
  }

  disconnect(force: boolean = false): void {
    console.log(`Disconnect called. Force: ${force}, active connections: ${this.activeConnections}`);
    
    // Only actually disconnect if forced or if no more active components need the connection
    if (force || this.activeConnections <= 0) {
      if (this.reconnectTimer) {
        console.log('Clearing reconnect timer');
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      
      this.isReconnectingFlag = false;
      this.reconnectAttempts = 0;
      
      // Close the EventSource connection
      if (this.eventSource) {
        console.log('Closing EventSource connection');
        this.eventSource.close();
        this.eventSource = null;
        this.connectionStatus = 'disconnected';
      } else {
        console.log('No EventSource connection to close');
      }
      
      // Reset state
      this.sessionId = null;
      
      console.log('EventSource connection fully closed and cleaned up');
    } else {
      console.log(`Not disconnecting - ${this.activeConnections} components still using the connection`);
    }
  }
  
  on(eventType: string, handler: MessageHandler): UnsubscribeFunction {
    // Get existing handlers or create a new array
    const handlers = this.messageHandlers.get(eventType) || [];
    
    // Add the new handler
    handlers.push(handler);
    this.messageHandlers.set(eventType, handlers);
    
    // If we already have an active connection, add the event listener to the EventSource
    if (this.eventSource && this.connectionStatus === 'connected') {
      // For standard SSE, the event name in the "event:" field corresponds to the event listener name
      this.eventSource.addEventListener(eventType, (event) => {
        this.updateActivity();
        try {
          // Parse the JSON data in the "data:" field
          const data = JSON.parse(event.data);
          handler(data);
        } catch (error) {
          console.error(`Error handling ${eventType} event:`, error);
        }
      });
    }
    
    // Return unsubscribe function
    return () => {
      const currentHandlers = this.messageHandlers.get(eventType) || [];
      const index = currentHandlers.indexOf(handler);
      if (index !== -1) {
        currentHandlers.splice(index, 1);
        this.messageHandlers.set(eventType, currentHandlers);
      }
    };
  }
  
  isConnected(): boolean {
    return this.connectionStatus === 'connected';
  }

  // Function to reconnect with a fresh token
  reconnectWithFreshToken(sessionId: string): void {
    console.log('Attempting to reconnect with a fresh token');
    
    // Close existing connection if there is one
    if (this.eventSource) {
      console.log('Closing existing EventSource connection before refreshing token');
      if (this.eventSource.readyState !== EventSource.CLOSED) {
        this.eventSource.close();
      }
      this.eventSource = null;
    }
    
    // Set status to connecting
    this.connectionStatus = 'connecting';
    
    // Connect again with the same session ID (which will get a fresh token)
    this.connect(sessionId);
  }
}

// Create a singleton instance (unused but kept for reference)
// const eventSourceService = new EventSourceService();

// Custom hook for using EventSource - simplified for single page use case
export function useRealTimeUpdates(sessionId: string | null) {
  const service = useRef(new EventSourceService()).current;
  
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
      console.log('useRealTimeUpdates unmounting, decrementing connection count');
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
        console.log('Token changed in storage, reconnecting EventSource');
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