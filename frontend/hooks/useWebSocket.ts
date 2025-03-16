import { useEffect, useCallback } from 'react';
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
  
  connect(sessionId: string): void {
    if (this.socket) {
      this.disconnect();
    }
    
    this.sessionId = sessionId;
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No authentication token found');
      toast.error('Authentication token not found');
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
    
    const wsUrl = `${wsProtocol}//${wsHost}/ws/${sessionId}?token=${token}`;
    console.log('Connecting to WebSocket:', wsUrl);
    
    try {
      this.socket = new WebSocket(wsUrl);
      
      this.socket.onopen = () => {
        console.log('WebSocket connected successfully');
        toast.success('WebSocket connected');
        this.reconnectAttempts = 0; // Reset reconnect attempts on successful connection
      };
      
      this.socket.onmessage = (event) => {
        try {
          console.log('WebSocket message received:', event.data);
          const message: WebSocketMessage = JSON.parse(event.data);
          const handlers = this.messageHandlers.get(message.type) || [];
          handlers.forEach(handler => handler(message.data));
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      this.socket.onclose = (event) => {
        console.log('WebSocket disconnected with code:', event.code, 'reason:', event.reason);
        this.socket = null;
        
        // Attempt to reconnect if not a normal closure
        if (event.code !== 1000 && event.code !== 1001) {
          this.scheduleReconnect();
        }
      };
      
      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        toast.error('WebSocket connection error');
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
    
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;
    
    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
    
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
}

// Create a singleton instance
const websocketService = new WebSocketService();

// Custom hook for using WebSockets
export function useWebSocket(sessionId: string | null) {
  useEffect(() => {
    if (!sessionId) {
      console.log('No session ID provided, not connecting to WebSocket');
      return;
    }
    
    console.log('useWebSocket hook initializing with session ID:', sessionId);
    
    // Connect to WebSocket
    websocketService.connect(sessionId);
    
    // Cleanup on unmount
    return () => {
      console.log('useWebSocket hook cleaning up');
      websocketService.disconnect();
    };
  }, [sessionId]);
  
  const subscribe = useCallback((messageType: string, handler: MessageHandler): UnsubscribeFunction => {
    if (!messageType || !handler) {
      console.warn('Invalid parameters for subscribe');
      return () => {}; // Return empty function if invalid params
    }
    console.log(`Subscribing to message type: ${messageType}`);
    return websocketService.on(messageType, handler);
  }, []);
  
  const send = useCallback((type: string, data: MessageData): void => {
    console.log(`Sending message of type: ${type}`);
    websocketService.send(type, data);
  }, []);
  
  return { subscribe, send };
} 