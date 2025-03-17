import { useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

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
    
    // If we're already connected to this same session, just update activity
    if (this.sessionId === sessionId && this.eventSource && 
        (this.connectionStatus === 'connected' || this.connectionStatus === 'connecting')) {
      this.updateActivity();
      return;
    }
    
    // Close existing connection if there is one
    if (this.eventSource) {
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
    
    // Get the token from localStorage
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No authentication token found');
      this.connectionStatus = 'error';
      toast.error('Authentication token not found');
      return;
    }
    
    try {
      // Create a new EventSource connection with the correct endpoint
      const url = `${apiBaseUrl}/api/v1/sessions/${sessionId}/events?token=${encodeURIComponent(token)}`;
      
      // Check for debug mode via URL
      const isDebugMode = typeof window !== 'undefined' && 
                          window.location.search.includes('debug=eventsource');
      
      // Create the EventSource instance
      const newEventSource = new EventSource(url);
      
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
        toast.success('Real-time updates connected');
      };
      
      // Handle reconnection
      newEventSource.onerror = (error) => {
        const readyState = (error.target as EventSource)?.readyState;
        
        if (readyState === EventSource.CLOSED) {
          console.log('EventSource connection closed - handling reconnection');
          this.connectionStatus = 'error';
          
          // Manage reconnection with backoff
          if (this.reconnectAttempts < this.maxReconnectAttempts && !this.isReconnectingFlag) {
            this.isReconnectingFlag = true;
            const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // Exponential backoff, max 30s
            
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
          this.connectionStatus = 'connecting';
        }
      };
      
      // Pre-register event handlers for all registered event types
      for (const [eventType, handlers] of this.messageHandlers.entries()) {
        newEventSource.addEventListener(eventType, (event) => {
          this.updateActivity();
          try {
            const data = JSON.parse(event.data);
            
            // Call all handlers for this event type
            handlers.forEach(handler => {
              try {
                // If data has a 'data' field, use that, otherwise use the whole data object
                const handlerData = data.data !== undefined ? data.data : data;
                handler(handlerData);
              } catch (error) {
                console.error(`Error in ${eventType} event handler:`, error);
              }
            });
          } catch (error) {
            console.error(`Error parsing ${eventType} data:`, error);
          }
        });
      }
      
      // Set up handler for ping events
      newEventSource.addEventListener('ping', () => {
        this.updateActivity();
        // Silent ping handling
      });
      
      // Set up handler for heartbeat events
      newEventSource.addEventListener('heartbeat', (event) => {
        this.updateActivity();
        try {
          const data = JSON.parse(event.data);
          
          // Create a local timestamp for received time (browser time)
          const localTime = new Date().toLocaleTimeString();
          
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
      });
      
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
        
        // DEBUG: Log all raw events to help diagnose routing issues
        console.log('RAW EVENT received in onmessage:', { 
          type: event.type,
          data: event.data.substring(0, 100), // Limit data length for readability
          eventSource: 'onmessage handler' 
        });
        
        try {
          const data = JSON.parse(event.data);
          
          // DEBUG: Log parsed data structure
          console.log('Parsed event data structure:', {
            hasMessageType: data && typeof data === 'object' && 'message_type' in data,
            messageType: data?.message_type,
            hasData: data && typeof data === 'object' && 'data' in data,
            hasJoinIndicators: data && typeof data === 'object' && 
              ('username' in data || (data.data && 'username' in data.data)),
            rawData: JSON.stringify(data).substring(0, 100) // Limit data length for readability
          });
          
          // Check if this might be a heartbeat that wasn't caught by the heartbeat event listener
          if (data && (data.message_type === 'heartbeat' || 
              (data.data && (data.data.message === '❤️ Server heartbeat pulse' || 
               data.data.message?.includes('heartbeat'))))) {
            
            // Handle as heartbeat
            const heartbeatData = data.data || data;
            
            // Create a local timestamp for received time (browser time)
            const localTime = new Date().toLocaleTimeString();
            
            // Dispatch the heartbeat event
            const heartbeatEvent = new CustomEvent('sse-heartbeat', { 
              detail: { 
                timestamp: heartbeatData.timestamp, 
                formattedTime: heartbeatData.formatted_time || localTime,
                message: heartbeatData.message || "Server heartbeat",
                sequence: heartbeatData.sequence || "unknown",
                sessionId: this.sessionId,
                receivedAt: localTime,
                source: "generic-handler"
              } 
            });
            window.dispatchEvent(heartbeatEvent);
          }
          
          // SPECIAL HANDLING FOR JOIN EVENTS:
          // Check if this might be a join event that wasn't routed correctly
          if (data && (
              data.message_type === 'join' || 
              (data.username && data.nightfarer) ||
              (data.userId && data.username && data.nightfarer)
          )) {
            console.log('Detected join event in onmessage handler:', data);
            
            // Find any registered join handlers
            const joinHandlers = this.messageHandlers.get('join') || [];
            
            if (joinHandlers.length > 0) {
              console.log(`Found ${joinHandlers.length} join handlers, calling them with join data`);
              joinHandlers.forEach(handler => {
                try {
                  handler(data);
                  console.log('Successfully called join handler with data');
                } catch (error) {
                  console.error('Error executing join handler:', error);
                }
              });
            } else {
              console.log('Received join event but no join handlers are registered');
            }
            
            // Don't continue with generic handler processing
            return;
          }
          
          // Handle event based on message_type if available
          const eventType = data.message_type || event.type || 'message';
          const handlers = this.messageHandlers.get(eventType) || [];
          
          if (handlers.length > 0) {
            console.log(`Found ${handlers.length} handlers for event type '${eventType}'`);
            handlers.forEach(handler => {
              try {
                handler(data.data || data);
              } catch (error) {
                console.error(`Error in ${eventType} event handler:`, error);
              }
            });
          }
        } catch (error) {
          console.error('Error parsing event data:', error);
        }
      };
      
      // Assign the EventSource
      this.eventSource = newEventSource;
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
    if (!force && this.activeConnections > 0) {
      console.log(`Not disconnecting - still has ${this.activeConnections} active connections`);
      return;
    }

    if (this.eventSource) {
      console.log('Closing EventSource connection');
      this.eventSource.close();
      this.eventSource = null;
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    // Clear message handlers only if forced or no active connections
    if (force) {
      this.messageHandlers.clear();
    }
    
    this.reconnectAttempts = 0;
    this.connectionStatus = 'disconnected';
    this.sessionId = null;
    this.isReconnectingFlag = false;
  }
  
  on(eventType: string, handler: MessageHandler): UnsubscribeFunction {
    // Get existing handlers or create a new array
    const handlers = this.messageHandlers.get(eventType) || [];
    
    // Add the new handler
    handlers.push(handler);
    this.messageHandlers.set(eventType, handlers);
    
    // If we already have an active connection, set up the event listener
    if (this.eventSource && this.connectionStatus === 'connected') {
      // Add a specific event listener for this event type
      this.eventSource.addEventListener(eventType, (event) => {
        this.updateActivity();
        try {
          const data = JSON.parse(event.data);
          
          try {
            handler(data);
          } catch (error) {
            console.error(`Error executing handler for ${eventType}:`, error);
          }
        } catch (error) {
          console.error(`Error parsing ${eventType} data:`, error);
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
}

// Create a singleton instance
const eventSourceService = new EventSourceService();

// Custom hook for using EventSource - simplified for single page use case
export function useRealTimeUpdates(sessionId: string | null, options = {
  inactivityTimeout: 30 * 60 * 1000, // 30 minutes by default
}) {
  // Store the current session ID
  const currentSessionIdRef = useRef<string | null>(sessionId);
  
  // Update the ref when sessionId changes
  useEffect(() => {
    currentSessionIdRef.current = sessionId;
  }, [sessionId]);
  
  // Set up inactivity checker - only disconnect after long periods of inactivity
  useEffect(() => {
    if (!sessionId || !options.inactivityTimeout) return;
    
    const inactivityCheck = setInterval(() => {
      const inactiveTime = eventSourceService.getInactiveTime();
      
      if (inactiveTime * 1000 > options.inactivityTimeout && 
          eventSourceService.isConnected()) {
        console.log(`Disconnecting EventSource due to inactivity (${Math.round(inactiveTime)} seconds)`);
        eventSourceService.disconnect(true);
      }
    }, 60000); // Check every minute
    
    return () => {
      clearInterval(inactivityCheck);
    };
  }, [sessionId, options.inactivityTimeout]);
  
  // Connect to EventSource on mount and disconnect on unmount
  useEffect(() => {
    if (!sessionId) return;
    
    // Increment connection counter
    eventSourceService.incrementConnection();
    
    // Connect to the EventSource
    eventSourceService.connect(sessionId);
    
    // Return a cleanup function that decrements counter and conditionally disconnects
    return () => {
      console.log('Component unmounted, checking if we should disconnect EventSource');
      const shouldDisconnect = eventSourceService.decrementConnection();
      if (shouldDisconnect) {
        console.log('No more active connections, disconnecting EventSource');
        eventSourceService.disconnect();
      }
    };
  }, [sessionId]);
  
  // Subscribe to events
  const subscribe = useCallback((eventType: string, handler: MessageHandler): UnsubscribeFunction => {
    if (!eventType || !handler) {
      return () => {}; // Return empty function if invalid params
    }
    
    return eventSourceService.on(eventType, handler);
  }, []);
  
  // Check connection status
  const isConnected = useCallback((): boolean => {
    return eventSourceService.isConnected();
  }, []);
  
  // Add an explicit disconnect method the consumer can call when truly done
  const disconnect = useCallback(() => {
    eventSourceService.disconnect(true);
  }, []);
  
  // Return the API
  return {
    subscribe,
    isConnected,
    disconnect
  };
} 