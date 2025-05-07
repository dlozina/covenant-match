# Friendship Matrix Documentation

## Overview

The friendship matrix feature allows us to track friend relationships between players in a session. This information is used to display the correct UI for adding friends (only showing "Add Friend" buttons for players that the current user hasn't already added as friends).

## How It Works

1. The backend provides a friendship matrix API endpoint that returns information about which players are friends with each other:
   ```
   GET /api/v1/sessions/{sessionId}/friendship-matrix
   ```

2. The response contains a list of players with their IDs, usernames, and an array of user IDs that they have added as friends:
   ```json
   {
     "players": [
       {
         "id": "6815cfe601b427d3eecbb852",
         "username": "admin",
         "isFriendsWith": []
       },
       {
         "id": "681722af659dd1d63f3651af",
         "username": "boris",
         "isFriendsWith": [
           "6815cfe601b427d3eecbb852"
         ]
       },
       {
         "id": "68167b8e4b8da0559221104a",
         "username": "dino",
         "isFriendsWith": []
       }
     ]
   }
   ```

3. In this example, Boris has added Admin as a friend, but Admin has not added Boris as a friend.
   - When Boris is looking at the session, the Add Friend button for Admin will not be shown or will be disabled.
   - When Admin is looking at the session, the Add Friend button for Boris will be shown and enabled.

4. The frontend uses React Query to fetch and manage this data through the `useFriendshipMatrix` hook.

## Important Note on Friendship Relationships

Friendships are one-way relationships in this system. Each user decides who they add as a friend.

- If User A adds User B as a friend, User A will see User B as a friend.
- But User B will not automatically see User A as a friend unless User B also adds User A.
- This allows each user to maintain their own friend list independently.

## React Query Implementation

We've implemented the friendship matrix feature using React Query, a powerful data fetching and caching library. This approach provides several advantages:

### 1. `useFriendshipMatrix` Query Hook

The hook is defined in `useSessionQueries.ts` and fetches friendship data for a session:

```typescript
export function useFriendshipMatrix(sessionId: string | null) {
  const { fetchWithAuth } = useAuth();
  
  return useQuery({
    queryKey: sessionKeys.friendship(sessionId || 'unknown'),
    queryFn: async (): Promise<FriendshipMatrix> => {
      if (!sessionId) {
        throw new Error('Invalid session ID');
      }
      
      const response: FriendshipResponse = await fetchWithAuth(`/api/v1/sessions/${sessionId}/friendship-matrix`);
      
      // Transform the API response into a matrix format
      const matrix: FriendshipMatrix = {};
      
      // Initialize the matrix
      response.players.forEach(player => {
        matrix[player.id] = {};
        
        // Initialize all relationships as false
        response.players.forEach(otherPlayer => {
          if (player.id !== otherPlayer.id) {
            matrix[player.id][otherPlayer.id] = false;
          }
        });
      });
      
      // Set true for actual friendships
      response.players.forEach(player => {
        player.isFriendsWith.forEach(friendId => {
          if (matrix[player.id]) {
            matrix[player.id][friendId] = true;
          }
        });
      });
      
      return matrix;
    },
    enabled: !!sessionId,
    staleTime: 60 * 1000, // Consider data fresh for 1 minute
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
  });
}
```

### 2. Data Transformation

The API returns a different format than what our UI components expect, so we perform a transformation:

- **API Format**: A list of players, each with an array of friend IDs
- **Transformed Format**: A matrix where `matrix[userA][userB] = true` means userA has added userB as a friend

This transformation happens in the query function and creates a consistent data structure for our components.

### 3. `FriendButton` Component

The FriendButton component uses the friendship matrix data directly:

```tsx
const FriendButtonComponent = ({ playerId, sessionId, currentUserId }: FriendButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();
  
  // Get friendship data from query
  const { data: friendshipMatrix, isLoading: isMatrixLoading } = useFriendshipMatrix(sessionId);
  
  // Determine if the player is a friend based on the matrix
  const isFriend = Boolean(friendshipMatrix?.[currentUserId]?.[playerId]);

  const handleAddFriend = async () => {
    if (isFriend || isLoading) return;
    
    setIsLoading(true);
    try {
      await UserService.addFriend(playerId);
      
      // Invalidate friendship matrix query to refresh data
      queryClient.invalidateQueries({ 
        queryKey: ['sessions', 'friendships', sessionId]
      });
    } catch (error) {
      console.error('Error adding friend:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Render button based on friendship status
  // ...
};
```

## Advantages of the React Query Approach

1. **Centralized Data Fetching**: All data fetching logic is centralized in query hooks, making components cleaner.

2. **Automatic Caching**: React Query automatically caches the friendship data, reducing unnecessary network requests.

3. **Stale-While-Revalidate**: Components can immediately use cached data while fresh data is being fetched in the background.

4. **Automatic Refetching**: Data is automatically refreshed when needed (window focus, reconnection, etc.).

5. **Consistent Data Updates**: Using `invalidateQueries` ensures all components using the data are updated when a friend is added.

6. **Loading and Error States**: React Query provides built-in loading and error states that components can easily access.

7. **Decoupled Components**: Components don't need to manage complex state or data fetching logic.

## Usage Example

In the PlayerSection component:

```tsx
<PlayerSection 
  sessionState={sessionState}
  sessionData={sessionData}
  currentUserId={userData?.id}
  isHostView={true}
  onKickPlayer={handleKickPlayerClick}
/>
```

In the PlayerRow component, the FriendButton is rendered with:

```tsx
<FriendButton 
  playerId={player.userId}
  sessionId={sessionData.id}
  currentUserId={currentUserId}
/>
```

## Adding to New Components

To use friendship data in a new component:

1. Import the hook:
   ```tsx
   import { useFriendshipMatrix } from '@/hooks/queries/useSessionQueries';
   ```

2. Use the hook in your component:
   ```tsx
   const { data: friendshipMatrix, isLoading } = useFriendshipMatrix(sessionId);
   ```

3. Check friend status using the matrix:
   ```tsx
   const isFriend = Boolean(friendshipMatrix?.[currentUserId]?.[playerId]);
   ```

4. When adding a friend, invalidate the query to refresh the data:
   ```tsx
   const queryClient = useQueryClient();
   queryClient.invalidateQueries({ 
     queryKey: ['sessions', 'friendships', sessionId]
   });
   ```

## Components

### 1. `useFriendshipMatrix` Hook

The hook fetches friendship data for a session and provides utility functions:

```typescript
// Example usage
const { 
  friendshipMatrix, 
  isLoading, 
  error, 
  isFriendWith, 
  refreshMatrix 
} = useFriendshipMatrix(sessionId);
```

The `isFriendWith` function checks if the current user has added another player as a friend:

```typescript
// Only returns true if currentUserId has added playerId as a friend
const isAlreadyFriend = isFriendWith(playerId, currentUserId);
```

### 2. `FriendButton` Component

The FriendButton component has been updated to accept a `sessionId` prop and refresh the friendship matrix after adding a friend:

```tsx
<FriendButton 
  playerId={player.userId} 
  isFriend={friendState[player.userId]} 
  onAddFriend={addFriend} 
  sessionId={sessionData?.id}
/>
```

### 3. `PlayerSection` Component

The PlayerSection component integrates with the friendship matrix to determine which players the current user has added as friends:

```tsx
const { friendshipMatrix, refreshMatrix } = useFriendshipMatrix(sessionData?.id);

// Using the matrix to check friend status
const isFriendWithPlayer = (playerId: string): boolean => {
  // Implementation that checks if current user has added this player as a friend
};
```

## API Service

The `SessionService` class has a `getFriendshipMatrix` static method that fetches the friendship matrix from the API:

```typescript
static async getFriendshipMatrix(sessionId: string): Promise<{
  players: Array<{
    id: string;
    username: string;
    isFriendsWith: string[];
  }>
}> {
  // ... implementation
}
```

## UI Behavior

- If the current user has already added a player as a friend, the FriendButton will show in green with a checkmark
- If the current user has not added a player as a friend, the FriendButton will show a plus sign
- After adding a friend, the button updates immediately and the friendship matrix is refreshed 

# Friend Button Implementation

## Overview

The friend button functionality allows users to add other players from a session as friends. The button displays different states based on whether the player has already been added as a friend.

## Implementation

The implementation is straightforward:

1. When displaying players in a session, we show an "Add Friend" button next to each player.
2. The button's appearance changes based on whether the player is already a friend.
3. When clicked, the button calls the `UserService.addFriend()` method and updates the UI.

## Components

### FriendButton Component

The FriendButton is a simple component that:

1. Takes the player's ID, friendship status, and callback function as props
2. Manages its own loading state when adding a friend
3. Shows different UI based on friend status (plus sign for non-friends, checkmark for friends)

```tsx
<FriendButton 
  playerId={player.userId} 
  isFriend={friendState[player.userId]} 
  onAddFriend={addFriend} 
/>
```

## Data Flow

1. The parent component (like SessionPage or SessionHost) maintains a `friendState` object mapping player IDs to boolean friendship status.
2. This state is passed to the PlayerSection component, which renders the friend buttons for each player.
3. When a friend is added, the callback updates the parent's state.

## API Calls

The `UserService.addFriend()` method makes a POST request to add a friend:

```typescript
static async addFriend(friendId: string): Promise<void> {
  try {
    await httpClient.post<void>('/api/v1/friends', { friendId }, true);
  } catch (error) {
    throw error;
  }
}
```

## UI States

- **Default State**: Blue button with a plus icon
- **Friend Added**: Green button with a checkmark
- **Loading**: Grey button, disabled during the API call

## Determining Friend Status

The parent component is responsible for determining which players are already friends, typically by:

1. Fetching the user's friend list when the component loads
2. Creating a mapping of player IDs to friendship status
3. Passing this information to the FriendButton component

## Usage Example

```tsx
// In a parent component
const [friendState, setFriendState] = useState<{[playerId: string]: boolean}>({});

// Fetch friend status
useEffect(() => {
  async function fetchFriendStatus() {
    const friends = await UserService.getFriendList();
    const newFriendState = {};
    
    friends.forEach(friend => {
      newFriendState[friend.id] = true;
    });
    
    setFriendState(newFriendState);
  }
  
  fetchFriendStatus();
}, []);

// Handle adding friend
const handleAddFriend = (playerId: string) => {
  setFriendState(prev => ({
    ...prev,
    [playerId]: true
  }));
};

// Then in JSX:
<PlayerSection
  friendState={friendState}
  addFriend={handleAddFriend}
  // ... other props
/>
``` 