'use client';

import { useState, useEffect, useRef } from 'react';
import { useSessionContext } from './context/SessionContext';
import { useAuth } from '@/lib/auth-context';
import { useWebSocketUpdates } from '@/hooks/useWebSocket';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PaperAirplaneIcon } from '@heroicons/react/24/solid';
import realtimeConfig from '@/config/realtimeConfig';

// Define the chat message structure for display
interface ChatMessage {
  userId: string;
  username: string;
  message: string;
  timestamp: number;
  role: 'host' | 'participant1' | 'participant2' | 'unknown';
}

export function SessionChat() {
  const { sessionData } = useSessionContext();
  const { userData } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [chatRole, setChatRole] = useState<'host' | 'participant1' | 'participant2' | 'unknown'>('unknown');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const wsRef = useRef<{
    isConnected: () => boolean;
    sendMessage: (message: { message_type: string; data: Record<string, unknown> }) => boolean;
    subscribe: (eventType: string, handler: (data: Record<string, unknown>) => void) => () => void;
    disconnect: (force?: boolean) => void;
    reconnectWithFreshToken: (sid?: string) => void;
  } | null>(null);
  
  const sessionId = sessionData?.id || null;
  
  // Get the WebSocket connection
  const { isConnected, sendMessage, subscribe, disconnect, reconnectWithFreshToken } = useWebSocketUpdates(
    realtimeConfig.useWebSockets ? sessionId : null
  );
  
  // Store connection reference to use in effects
  wsRef.current = { isConnected, sendMessage, subscribe, disconnect, reconnectWithFreshToken };
  
  // Determine player role in this session
  useEffect(() => {
    if (!sessionData || !userData) return;
    
    // First identify the host
    if (sessionData.hostId === userData.id) {
      setChatRole('host');
      console.log("SessionChat - User role: HOST");
      return;
    }
    
    // Then identify participants by join order
    const participants = sessionData.joinedPlayers
      .filter(p => p.userId !== sessionData.hostId)
      .sort((a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime());
    
    if (participants.length >= 1 && participants[0].userId === userData.id) {
      setChatRole('participant1');
      console.log("SessionChat - User role: PARTICIPANT 1");
    } else if (participants.length >= 2 && participants[1].userId === userData.id) {
      setChatRole('participant2');
      console.log("SessionChat - User role: PARTICIPANT 2");
    } else {
      setChatRole('unknown');
      console.log("SessionChat - User role: UNKNOWN");
    }
  }, [sessionData, userData]);
  
  // Debugging connection
  useEffect(() => {
    console.log("SessionChat - WebSocket connected:", isConnected());
    console.log("SessionChat - Session ID:", sessionId);
    console.log("SessionChat - User ID:", userData?.id);
    console.log("SessionChat - Role:", chatRole);
    
    // Ensure connection is active
    if (sessionId && !isConnected()) {
      console.log("SessionChat - Attempting to reconnect WebSocket...");
      reconnectWithFreshToken();
    }
  }, [isConnected, sessionId, userData?.id, chatRole, reconnectWithFreshToken]);
  
  // Scroll to the bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    console.log("SessionChat - Current messages:", messages.length);
  }, [messages]);
  
  // Subscribe to chat messages
  useEffect(() => {
    if (!sessionId || !userData?.id) return;
    
    console.log(`SessionChat - Setting up chat message subscription for ${chatRole} role`);
    
    // Force reconnect if needed
    if (!isConnected()) {
      console.log("SessionChat - Reconnecting WebSocket for chat subscription");
      reconnectWithFreshToken();
    }
    
    // Handler for chat messages
    const handleChatMessage = (data: Record<string, unknown>) => {
      console.log("SessionChat - Received chat message data:", data);
      
      if (!data || typeof data !== 'object') {
        console.warn("SessionChat - Invalid message data received");
        return;
      }
      
      const userId = String(data.userId || '');
      const messageText = String(data.message || '');
      const timestamp = Number(data.timestamp || Date.now());
      
      // Skip empty messages
      if (!messageText.trim()) {
        console.warn("SessionChat - Empty message received, skipping");
        return;
      }
      
      console.log(`SessionChat - Parsed message: userId=${userId}, message=${messageText}`);
      
      // Find the username and role from session data
      let username = 'New Player 🌟';
      let role: 'host' | 'participant1' | 'participant2' | 'unknown' = 'unknown';
      
      // Check if this is the host
      if (sessionData?.hostId === userId) {
        const hostPlayer = sessionData.joinedPlayers.find(p => p.userId === userId);
        username = `${hostPlayer?.username} ⚔️` || 'Host ⚔️';
        role = 'host';
      } else {
        // Sort participants by join time
        const participants = sessionData?.joinedPlayers
          .filter(p => p.userId !== sessionData.hostId)
          .sort((a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime());
        
        if (participants && participants.length > 0) {
          // First participant
          if (participants[0].userId === userId) {
            username = `${participants[0].username} 🛡️`;
            role = 'participant1';
          } 
          // Second participant
          else if (participants.length > 1 && participants[1].userId === userId) {
            username = `${participants[1].username} 🛡️`;
            role = 'participant2';
          } 
          // Fallback to finding by ID
          else {
            const player = sessionData?.joinedPlayers.find(p => p.userId === userId);
            if (player) {
              username = player.username;
              role = 'unknown';
            }
          }
        }
      }
      
      console.log(`SessionChat - Found username: ${username} with role: ${role}`);
      
      // Add message to state
      setMessages(prev => {
        // Create the new message
        const newMessage = {
          userId,
          username,
          message: messageText,
          timestamp,
          role
        };
        
        // Limit to last 12 messages
        const updatedMessages = [...prev, newMessage];
        if (updatedMessages.length > 12) {
          return updatedMessages.slice(updatedMessages.length - 12);
        }
        
        return updatedMessages;
      });
    };
    
    // Subscribe to chat messages
    const unsubscribe = subscribe('chat', handleChatMessage);
    
    // Re-subscribe when connection state changes
    const handleConnectionChange = () => {
      if (wsRef.current && wsRef.current.isConnected && wsRef.current.isConnected()) {
        console.log("SessionChat - WebSocket reconnected, resubscribing to chat events");
        unsubscribe(); // Clean up previous subscription
        wsRef.current.subscribe('chat', handleChatMessage);
      }
    };
    
    // Listen for connection changes
    window.addEventListener('websocket-reconnected', handleConnectionChange);
    
    return () => {
      console.log("SessionChat - Cleaning up chat subscription");
      unsubscribe();
      window.removeEventListener('websocket-reconnected', handleConnectionChange);
    };
  }, [sessionId, userData?.id, sessionData, chatRole, isConnected, subscribe, reconnectWithFreshToken]);
  
  // Handle sending a message
  const handleSendMessage = () => {
    if (!inputValue.trim() || !sessionId || !isConnected() || !userData) return;
    
    const messageText = inputValue.trim();
    
    console.log(`SessionChat - Sending message as ${chatRole}: ${messageText}`);
    
    // Send the message via WebSocket
    sendMessage({
      message_type: 'chat',
      data: {
        message: messageText
      }
    });
    
    // Clear the input
    setInputValue('');
    // Focus back on input
    inputRef.current?.focus();
  };
  
  // Handle key press (Enter to send)
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };
  
  // Get appropriate color for each role
  const getRoleColor = (role: string, isCurrentUser: boolean) => {
    if (isCurrentUser) return 'text-purple-400';
    
    switch (role) {
      case 'host':
        return 'text-red-400';
      case 'participant1':
        return 'text-blue-400';
      case 'participant2':
        return 'text-green-400';
      default:
        return 'text-gray-400';
    }
  };
  
  return (
    <Card className="gothic-card p-3 mt-4">
      <h3 className="text-lg font-medium mb-2">Session Chat</h3>
      
      {/* Chat messages */}
      <div className="bg-accent/50 rounded-md p-2 h-48 overflow-y-auto mb-3">
        {messages.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">
            No messages yet. Be the first to send a message!
          </p>
        ) : (
          messages.map((msg, index) => (
            <div key={index} className="mb-1.5">
              <span 
                className={`font-medium ${getRoleColor(msg.role, msg.userId === userData?.id)}`}
              >
                {msg.username}:
              </span>{' '}
              <span className="text-foreground">{msg.message}</span>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Chat input */}
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          className="gothic-input"
          placeholder="Type your message..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyPress}
          disabled={!isConnected()}
        />
        <Button 
          onClick={handleSendMessage}
          disabled={!inputValue.trim() || !isConnected() || !userData}
          className="gothic-button"
          size="icon"
        >
          <PaperAirplaneIcon className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Connection status */}
      {!isConnected() && (
        <p className="text-red-400 text-xs mt-1">
          Not connected. Messages cannot be sent at this time.
        </p>
      )}
    </Card>
  );
} 