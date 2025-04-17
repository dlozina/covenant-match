'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSessionContext } from './context/SessionContext';
import { useAuth } from '@/lib/auth-context';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PaperAirplaneIcon } from '@heroicons/react/24/solid';

// Define the chat message structure for display
interface ChatMessage {
  userId: string;
  username: string;
  message: string;
  timestamp: number;
  role: 'host' | 'participant1' | 'participant2' | 'unknown';
}

// Interface for chat history response from API
interface ChatHistoryMessage {
  sender_id: string;
  sender_name: string;
  message: string;
  timestamp: number;
}

export function SessionChat() {
  // Use the shared WebSocket connection from SessionContext
  const { 
    sessionData,
    subscribe,
    isConnected,
    sendMessage,
    rtConnected,
    registerVisibilityHandler,
    unregisterVisibilityHandler
  } = useSessionContext();
  
  const { userData} = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [chatRole, setChatRole] = useState<'host' | 'participant1' | 'participant2' | 'unknown'>('unknown');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [lastHistoryFetch, setLastHistoryFetch] = useState<number>(0);
  
  const sessionId = sessionData?.id || null;
  
  // Fetch chat history from the server - wrapped in useCallback
  const fetchChatHistory = useCallback(async () => {
    if (!sessionId || !userData || isLoadingHistory) return;
    
    const now = Date.now();
    // Don't fetch if we've fetched in the last 5 seconds (prevents rapid refetching)
    if (now - lastHistoryFetch < 5000) return;
    
    try {
      setIsLoadingHistory(true);
      console.log("SessionChat - Fetching chat history for session", sessionId);
      
      // Create the request with the full URL
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
      const url = `${apiBaseUrl}/api/v1/chat/history?session_id=${sessionId}&limit=30`;
      
      // Get token from storage
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated');
      }
      
      // Make direct fetch call with proper typing
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch chat history: ${response.status}`);
      }
      
      const historyMessages: ChatHistoryMessage[] = await response.json();
      console.log("SessionChat - Received history messages:", historyMessages.length);
      
      if (historyMessages.length > 0) {
        // Convert to our message format and merge with existing messages
        const formattedMessages = historyMessages.map(msg => {
          // Determine role from sender
          let role: 'host' | 'participant1' | 'participant2' | 'unknown' = 'unknown';
          
          // Check if this is the host
          if (sessionData?.hostId === msg.sender_id) {
            role = 'host';
          } else {
            // Sort participants by join time (we'll simulate this since we don't have join order in history)
            const participants = sessionData?.joinedPlayers
              .filter(p => p.userId !== sessionData.hostId)
              .sort((a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime());
            
            if (participants && participants.length > 0) {
              // First participant
              if (participants[0].userId === msg.sender_id) {
                role = 'participant1';
              } 
              // Second participant
              else if (participants.length > 1 && participants[1].userId === msg.sender_id) {
                role = 'participant2';
              }
            }
          }
          
          return {
            userId: msg.sender_id,
            username: msg.sender_name,
            message: msg.message,
            timestamp: msg.timestamp,
            role
          } as ChatMessage;
        });
        
        // Merge historical messages with existing, avoiding duplicates
        setMessages(prevMessages => {
          // Create a map of existing message timestamps for quick lookup
          const existingTimestamps = new Map<string, boolean>();
          prevMessages.forEach(msg => {
            existingTimestamps.set(`${msg.userId}-${msg.timestamp}`, true);
          });
          
          // Filter out historical messages that already exist
          const newMessages = formattedMessages.filter(msg => {
            const key = `${msg.userId}-${msg.timestamp}`;
            return !existingTimestamps.has(key);
          });
          
          // Combine and sort by timestamp
          const combinedMessages = [...prevMessages, ...newMessages]
            .sort((a, b) => a.timestamp - b.timestamp);
          
          // Limit to last 30 messages
          return combinedMessages.slice(Math.max(combinedMessages.length - 30, 0));
        });
      }
      
      setLastHistoryFetch(Date.now());
    } catch (error) {
      console.error("Error fetching chat history:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [sessionId, userData, sessionData, isLoadingHistory, lastHistoryFetch]);
  
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
  
  // Register for visibility changes instead of directly listening
  useEffect(() => {
    // Create a unique ID for this component
    const handlerId = `session_chat_${sessionId || 'unknown'}`;
    
    // Register our handler that will fetch chat history
    if (sessionId && userData) {
      console.log(`SessionChat - Registering visibility handler: ${handlerId}`);
      registerVisibilityHandler(handlerId, fetchChatHistory);
      
      // Initial fetch when component mounts - do it here instead of a separate useEffect
      fetchChatHistory();
    }
    
    // Clean up on unmount
    return () => {
      console.log(`SessionChat - Unregistering visibility handler: ${handlerId}`);
      unregisterVisibilityHandler(handlerId);
    };
  }, [sessionId, userData, registerVisibilityHandler, unregisterVisibilityHandler, fetchChatHistory]);
  
  // Debugging connection
  useEffect(() => {
    console.log("SessionChat - WebSocket connected:", isConnected());
    console.log("SessionChat - Session ID:", sessionId);
    console.log("SessionChat - User ID:", userData?.id);
    console.log("SessionChat - Role:", chatRole);
  }, [isConnected, sessionId, userData?.id, chatRole]);
  
  // Scroll to the bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    console.log("SessionChat - Current messages:", messages.length);
  }, [messages]);
  
  // Subscribe to chat messages
  useEffect(() => {
    if (!sessionId || !userData?.id) return;
    
    console.log(`SessionChat - Setting up chat message subscription for ${chatRole} role`);
    
    // Handler for chat messages
    const handleChatMessage = (data: unknown) => {
      console.log("SessionChat - Received chat message data:", data);
      
      if (!data || typeof data !== 'object') {
        console.warn("SessionChat - Invalid message data received");
        return;
      }
      
      const messageData = data as Record<string, unknown>;
      const userId = String(messageData.userId || '');
      const messageText = String(messageData.message || '');
      const timestamp = Number(messageData.timestamp || Date.now());
      
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
      
      // Add message to state, avoiding duplicates
      setMessages(prev => {
        // Create the new message
        const newMessage = {
          userId,
          username,
          message: messageText,
          timestamp,
          role
        };
        
        // Check if message already exists (by sender and timestamp)
        const messageExists = prev.some(msg => 
          msg.userId === userId && msg.timestamp === timestamp && msg.message === messageText
        );
        
        if (messageExists) {
          console.log("SessionChat - Message already exists, not adding again");
          return prev;
        }
        
        // Add new message and sort by timestamp
        const updatedMessages = [...prev, newMessage]
          .sort((a, b) => a.timestamp - b.timestamp);
        
        // Limit to last 30 messages
        if (updatedMessages.length > 30) {
          return updatedMessages.slice(updatedMessages.length - 30);
        }
        
        return updatedMessages;
      });
    };
    
    // Subscribe to chat messages using the shared WebSocket connection
    const unsubscribe = subscribe('chat', handleChatMessage);
    
    return () => {
      console.log("SessionChat - Cleaning up chat subscription");
      unsubscribe();
    };
  }, [sessionId, userData?.id, sessionData, chatRole, subscribe]);
  
  // Handle sending a message
  const handleSendMessage = () => {
    if (!inputValue.trim() || !sessionId || !isConnected() || !userData) return;
    
    const messageText = inputValue.trim();
    
    console.log(`SessionChat - Sending message as ${chatRole}: ${messageText}`);
    
    // Send the message via WebSocket
    sendMessage({
      message_type: 'chat',
      data: {
        message: messageText,
        userId: userData.id,
        username: userData.username || 'Unknown User'  // Include username in the message data
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
      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          ref={inputRef}
          className="gothic-input w-full"
          placeholder="Type your message..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyPress}
          disabled={!rtConnected}
        />
        <Button 
          onClick={handleSendMessage}
          disabled={!inputValue.trim() || !rtConnected || !userData}
          className="gothic-button w-full sm:w-auto sm:px-4"
          size="icon"
        >
          <PaperAirplaneIcon className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Connection status */}
      {!rtConnected && (
        <p className="text-red-400 text-xs mt-1">
          Not connected. Messages cannot be sent at this time.
        </p>
      )}
    </Card>
  );
} 