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
  // Add a unique clientId for optimistic updates
  clientId?: string;
  // Add a flag to mark pending messages
  isPending?: boolean;
}

// Interface for chat history response from API
interface ChatHistoryMessage {
  sender_id: string;
  sender_name: string;
  message: string;
  timestamp: number;
  client_id?: string; // Add client_id field
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
  // Add a set to track message IDs being processed to prevent duplication
  const [processedIds, setProcessedIds] = useState<Set<string>>(new Set());
  
  const sessionId = sessionData?.id || null;
  
  // Fetch chat history from the server - wrapped in useCallback
  const fetchChatHistory = useCallback(async () => {
    if (!sessionId || !userData || isLoadingHistory) return;
    
    try {
      setIsLoadingHistory(true);
      console.log("SessionChat - Fetching chat history for session", sessionId);
      
      // Create the request with the full URL
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
      // Only fetch the last 9 messages
      const url = `${apiBaseUrl}/api/v1/chat/history?session_id=${sessionId}&limit=9`;
      
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
        // Prepare a new set of processed IDs
        const newProcessedIds = new Set<string>();
        
        // Convert to our message format
        const formattedMessages = historyMessages.map(msg => {
          // Add to processed IDs to prevent duplicates
          if (msg.client_id) {
            newProcessedIds.add(msg.client_id);
          }
          
          // Determine role from sender
          let role: 'host' | 'participant1' | 'participant2' | 'unknown' = 'unknown';
          
          // Check if this is the host
          if (sessionData?.hostId === msg.sender_id) {
            role = 'host';
          } else {
            // Sort participants by join time
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
            role,
            clientId: msg.client_id
          } as ChatMessage;
        });
        
        // Update the processed IDs
        setProcessedIds(newProcessedIds);
        
        // Replace messages with the last 9 messages from history
        setMessages(formattedMessages.sort((a, b) => {
          // Extract timestamps from client IDs
          const aTime = a.clientId ? getTimestampFromClientId(a.clientId) : a.timestamp;
          const bTime = b.clientId ? getTimestampFromClientId(b.clientId) : b.timestamp;
          
          // Sort by extracted time
          return aTime - bTime;
        }));
      }
    } catch (error) {
      console.error("Error fetching chat history:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [sessionId, userData, sessionData]);
  
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
  
  // Register for visibility changes using SessionContext
  useEffect(() => {
    if (sessionId && userData) {
      // Create a unique ID for this component
      const handlerId = `session_chat_${sessionId}`;
      
      // Register our handler with SessionContext to fetch history on visibility change
      registerVisibilityHandler(handlerId, fetchChatHistory);
      
      // Initial fetch when component mounts
      fetchChatHistory();
      
      return () => {
        // Clean up handler on unmount
        unregisterVisibilityHandler(handlerId);
      };
    }
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
    
    // Debug message ordering
    console.log("SessionChat - Current messages:", 
      messages.map(m => ({
        text: m.message,
        user: m.username,
        time: m.timestamp,
        pending: m.isPending
      }))
    );
  }, [messages]);
  
  // Function to extract timestamp from client ID
  const getTimestampFromClientId = (clientId?: string): number => {
    if (!clientId) return 0;
    
    // Client IDs follow pattern: userId-timestamp-randomString
    const parts = clientId.split('-');
    if (parts.length >= 2) {
      const timestamp = parseInt(parts[1], 10);
      return isNaN(timestamp) ? 0 : timestamp;
    }
    return 0;
  };

  // Add message to the message list
  const addMessage = (prevMessages: ChatMessage[], newMessage: ChatMessage) => {
    // Add the new message to the list
    const updatedMessages = [...prevMessages, newMessage];
    
    // Sort messages by client ID timestamp component first
    const sortedMessages = updatedMessages.sort((a, b) => {
      // Extract timestamps from client IDs
      const aTime = a.clientId ? getTimestampFromClientId(a.clientId) : a.timestamp;
      const bTime = b.clientId ? getTimestampFromClientId(b.clientId) : b.timestamp;
      
      // Sort by extracted time
      if (aTime !== bTime) {
        return aTime - bTime;
      }
      
      // If timestamps are the same, sort by message content
      return a.message.localeCompare(b.message);
    });
    
    // Only keep the last 9 messages
    if (sortedMessages.length > 9) {
      return sortedMessages.slice(sortedMessages.length - 9);
    }
    
    return sortedMessages;
  };

  // Handler for chat messages from other users
  const handleChatMessage = (data: unknown) => {
    // Only process messages when not loading history
    if (isLoadingHistory) {
      console.log("SessionChat - Skipping message while loading history");
      return;
    }
    
    console.log("SessionChat - Received chat message data:", data);
    
    if (!data || typeof data !== 'object') {
      console.warn("SessionChat - Invalid message data received");
      return;
    }
    
    const messageData = data as Record<string, unknown>;
    const userId = String(messageData.userId || '');
    const messageText = String(messageData.message || '');
    const timestamp = Number(messageData.timestamp || Date.now());
    const clientId = messageData.clientId as string | undefined;
    
    // Skip empty messages
    if (!messageText.trim()) {
      console.warn("SessionChat - Empty message received, skipping");
      return;
    }
    
    // Skip if we've already processed this message by ID
    if (clientId && processedIds.has(clientId)) {
      console.log(`SessionChat - Already processed message with ID ${clientId}, skipping`);
      return;
    }
    
    // Make sure we have userData
    if (!userData) {
      console.warn("SessionChat - No user data available, can't process message");
      return;
    }
    
    // For our own messages, just confirm them (remove pending state)
    if (userId === userData.id) {
      // Track this message ID if it has one
      if (clientId) {
        setProcessedIds(prev => new Set(prev).add(clientId));
      }
      
      // Immediately confirm our own pending messages
      setMessages(prevMessages => {
        return prevMessages.map(msg => {
          // If this is our pending message with matching clientId or content
          if (msg.isPending && 
              ((clientId && msg.clientId === clientId) || 
               (!clientId && msg.message === messageText && msg.userId === userId))) {
            return {
              ...msg,
              timestamp, // Use the server timestamp for reference
              isPending: false
            };
          }
          return msg;
        });
      });
      return;
    }
    
    // For other users' messages, process normally
    console.log(`SessionChat - Adding message from ${userId}: ${messageText}`);
    
    // Find the username and role
    let username = 'Unknown Player';
    let role: 'host' | 'participant1' | 'participant2' | 'unknown' = 'unknown';
    
    if (sessionData) {
      // Player lookup
      const player = sessionData.joinedPlayers.find(p => p.userId === userId);
      if (player) {
        username = player.username || 'Unknown Player';
      }
      
      // Role determination
      if (sessionData.hostId === userId) {
        role = 'host';
      } else {
        const participants = sessionData.joinedPlayers
          .filter(p => p.userId !== sessionData.hostId)
          .sort((a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime());
        
        if (participants.length > 0 && participants[0].userId === userId) {
          role = 'participant1';
        } else if (participants.length > 1 && participants[1].userId === userId) {
          role = 'participant2';
        }
      }
    }
    
    // Add the message with proper tracking
    setMessages(prevMessages => {
      // Simple duplicate check
      if (clientId && prevMessages.some(msg => msg.clientId === clientId)) {
        return prevMessages;
      }
      
      // Track this message ID
      if (clientId) {
        setProcessedIds(prev => new Set(prev).add(clientId));
      }
      
      // Create new message
      const newMessage = {
        userId,
        username,
        message: messageText,
        timestamp, // Keep server timestamp for reference
        role,
        clientId
      };
      
      // Use the common sort function
      return addMessage(prevMessages, newMessage);
    });
  };
  
  // Handle sending a message
  const handleSendMessage = () => {
    if (!inputValue.trim() || !sessionId || !isConnected() || !userData) return;
    
    const messageText = inputValue.trim();
    const currentTime = Date.now();
    
    // Create a unique client-side ID for this message
    const clientId = `${userData.id}-${currentTime}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Clear the input immediately for better UX
    setInputValue('');
    console.log(`SessionChat - Sending message as ${chatRole}: ${messageText}`);
    
    // Update processed IDs preemptively
    setProcessedIds(prev => new Set(prev).add(clientId));
    
    // Add message to local state immediately with pending flag
    setMessages(prevMessages => {
      // Create new message with pending flag
      const newMessage: ChatMessage = {
        userId: userData.id,
        username: userData.username || 'Unknown User',
        message: messageText,
        timestamp: currentTime, // Use current time for initial display
        role: chatRole,
        clientId, // The clientId contains the ordering information
        isPending: true
      };
      
      // Use the common sort function
      return addMessage(prevMessages, newMessage);
    });
    
    // Send the message via WebSocket
    sendMessage({
      message_type: 'chat',
      data: {
        message: messageText,
        userId: userData.id,
        username: userData.username || 'Unknown User',
        clientId
      }
    });
    
    // Focus back on input
    inputRef.current?.focus();
    
    // Set a timeout to automatically mark message as sent if we don't get confirmation
    setTimeout(() => {
      setMessages(prevMessages => {
        return prevMessages.map(msg => {
          if (msg.clientId === clientId && msg.isPending) {
            return {
              ...msg,
              isPending: false
            };
          }
          return msg;
        });
      });
    }, 1000);
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
  
  // Format username with appropriate emoji based on role
  const formatUsername = (username: string, role: string) => {
    switch (role) {
      case 'host':
        return `${username} ⚔️`;
      case 'participant1':
      case 'participant2':
        return `${username} 🛡️`;
      default:
        return username;
    }
  };
  
  // Add the missing subscription code
  // Subscribe to chat messages
  useEffect(() => {
    if (!sessionId || !userData?.id) return;
    
    console.log(`SessionChat - Setting up chat message subscription for ${chatRole} role`);
    
    // Subscribe to chat messages using the shared WebSocket connection
    const unsubscribe = subscribe('chat', handleChatMessage);
    
    return () => {
      console.log("SessionChat - Cleaning up chat subscription");
      unsubscribe();
    };
  }, [sessionId, userData?.id, sessionData, chatRole, subscribe, processedIds, isLoadingHistory]);
  
  return (
    <Card className="gothic-card p-3 mt-4">
      <h3 className="text-lg font-medium mb-2">Session Chat</h3>
      
      {/* Chat messages - fixed height, no scrollbar */}
      <div className="bg-accent/50 rounded-md p-2 flex flex-col h-auto mb-3">
        {isLoadingHistory ? (
          <p className="text-muted-foreground text-sm text-center py-4">
            Loading chat history...
          </p>
        ) : messages.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">
            No messages yet. Be the first to send a message!
          </p>
        ) : (
          // Display only the last 9 messages (already limited in state)
          messages.map((msg, index) => (
            <div 
              key={msg.clientId || `${msg.userId}-${msg.timestamp}-${index}`} 
              className="mb-1.5"
              data-timestamp={msg.timestamp}
              data-userid={msg.userId}
            >
              <span 
                className={`font-medium ${getRoleColor(msg.role, msg.userId === userData?.id)}`}
              >
                {formatUsername(msg.username, msg.role)}:
              </span>{' '}
              <span 
                className={`text-foreground ${msg.isPending ? 'italic opacity-70' : ''}`}
                title={new Date(msg.timestamp).toLocaleTimeString()}
              >
                {msg.message}
                {msg.isPending ? ' (sending...)' : ''}
              </span>
            </div>
          ))
        )}
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