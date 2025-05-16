// MongoDB User and Session Generator for MongoDB Shell (mongosh)
// Save this as generate-data.js and run with: mongosh mongodb://localhost:27017/your_database_name generate-data.js

// Configuration - adjust these values as needed
const CONFIG = {
  numUsers: 4000,              // Number of users to generate
  numSessions: 10000,           // Number of sessions to generate
  openSessionPercentage: 50,   // Percentage of sessions that should be "Open" (1-2 players)
  fullSessionPercentage: 15,   // Percentage of sessions that should be "Full" (3 players)
  inProgressPercentage: 20,    // Percentage of sessions that should be "InProgress"
  completedPercentage: 10,     // Percentage of sessions that should be "Completed"
  cancelledPercentage: 5,      // Percentage of sessions that should be "Cancelled"
  batchSize: 100,              // How many documents to insert at once
  clearExistingData: false,    // Set to false to preserve existing data
  maxPlayersPerSession: 3,     // Maximum number of players in a session
  avgFriendsPerUser: 20,        // Average number of friends per user
  avgFriendRequestsPerUser: 20  // Average number of friend requests per user (includes both outgoing and incoming)
};

// Night Lord and Nightfarer names for variety
const nightLords = ['Tricephalos', 'Libra', 'Malenia', 'Maliketh', 'Mohg', 
                    'Midra', 'PCR', 'Messmer'];
                    
const nightfarers = ['Wylder', 'Guardian', 'Recluse', 'Duchess', 'Ironeye', 'Rider', 
                     'Executor', 'Revenant'];

// Arrays of possible values for random selection
const regions = ["North America", "Europe", "Asia", "Oceania", "South America", "Africa", "Middle East"];
const platforms = ["PlayStation", "Xbox", "PC"];
const experiences = ["Beginner", "Mid", "Veteran"];
const covenants = ["Warriors of Sunlight", "Way of White", "Princess Guard", "Way of the Blue", 
                  "Heirs of the Sun", "Spears of the Church", "Blades of the Darkmoon", "Pilgrims of Dark",
                  "Princess Guard", "Mound-Makers", "Blade of the Darkmoon", "Watchdogs of Farron"];
const results = ["Win", "Loss", "Disconnect"];
const ratings = [1, 2, 3, 4, 5];
const requestStatuses = ["Pending", "Accepted", "Rejected"];

// Random selection helper
const randomFromArray = arr => arr[Math.floor(Math.random() * arr.length)];

// Random date within range
const randomDate = (start, end) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

// Random time delta in milliseconds
const randomDelta = (minMinutes, maxMinutes) => {
  return Math.floor(Math.random() * (maxMinutes - minMinutes) * 60 * 1000) + (minMinutes * 60 * 1000);
};

// Session status weighted selection
const getSessionStatus = () => {
  const rand = Math.random() * 100;
  if (rand < CONFIG.openSessionPercentage) return "Open";
  if (rand < CONFIG.openSessionPercentage + CONFIG.fullSessionPercentage) return "Full";
  if (rand < CONFIG.openSessionPercentage + CONFIG.fullSessionPercentage + CONFIG.inProgressPercentage) return "InProgress";
  if (rand < CONFIG.openSessionPercentage + CONFIG.fullSessionPercentage + CONFIG.inProgressPercentage + CONFIG.completedPercentage) return "Completed";
  return "Cancelled";
};

// Generates a user document
const generateUser = (i) => {
  const timestamp = randomDate(new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), new Date());
  const updateTimestamp = new Date(timestamp.getTime() + randomDelta(10, 24 * 60));
  
  return {
    _id: new ObjectId(),
    username: `user${i + 1}`,
    email: `user${i + 1}@example.com`,
    password_hash: "$2b$12$0sPBoTszqZB4qvoy.BI2beguYEsDz7c5v.GgjKy6ODqMvICBwkz.G",
    display_name: `Player${i + 1}`,
    region: randomFromArray(regions),
    auto_region: Math.random() > 0.7,
    cm_region: Math.random() > 0.5 ? randomFromArray(regions) : "Unknown",
    cf_region: randomFromArray(regions),
    platform: randomFromArray(platforms),
    role: Math.random() > 0.98 ? "admin" : "user", // 2% are admins
    disabled: Math.random() > 0.95, // 5% disabled
    email_verified: Math.random() > 0.2, // 80% verified
    experience: randomFromArray(experiences),
    covenant_name: randomFromArray(covenants),
    created_at: timestamp,
    updated_at: updateTimestamp,
    avatar_url: Math.random() > 0.7 ? `https://example.com/avatars/avatar${Math.floor(Math.random() * 50)}.png` : null,
    preferred_nightfarer: Math.random() > 0.5 ? randomFromArray(nightfarers) : "",
    preferred_session_name: "",
    preferred_session_password: "",
    schema_version: 2
  };
};

// Generate friendship relations and requests
const generateFriendshipsAndRequests = (users) => {
  const friendships = [];
  const friendRequests = [];
  
  // Set to track existing friendships to avoid duplicates
  const existingFriendships = new Set();
  const existingRequests = new Set();
  
  for (const user of users) {
    if (user.disabled) continue; // Skip disabled users
    
    // Determine number of friendships for this user
    const targetFriendCount = Math.max(0, Math.floor(Math.random() * CONFIG.avgFriendsPerUser * 2));
    let currentFriendCount = 0;
    
    // Determine number of friend requests for this user
    const targetRequestCount = Math.max(0, Math.floor(Math.random() * CONFIG.avgFriendRequestsPerUser * 2));
    let currentRequestCount = 0;
    
    // Try to add friendships until we reach target or run out of candidates
    let attempts = 0;
    while (currentFriendCount < targetFriendCount && attempts < users.length * 2) {
      attempts++;
      
      // Find a potential friend
      const friend = users[Math.floor(Math.random() * users.length)];
      if (friend._id.toString() === user._id.toString() || friend.disabled) continue;
      
      // Check if this friendship already exists
      const friendshipKey = [user._id.toString(), friend._id.toString()].sort().join('-');
      if (existingFriendships.has(friendshipKey)) continue;
      
      // Create timestamp for friendship creation
      const timestamp = randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date());
      
      // Create bi-directional friendship records
      friendships.push({
        _id: new ObjectId(),
        user_id: user._id,
        friend_id: friend._id,
        created_at: timestamp
      });
      
      friendships.push({
        _id: new ObjectId(),
        user_id: friend._id,
        friend_id: user._id,
        created_at: new Date(timestamp.getTime() + 5) // Small delay for the reciprocal relationship
      });
      
      existingFriendships.add(friendshipKey);
      currentFriendCount++;
    }
    
    // Generate friend requests
    attempts = 0;
    while (currentRequestCount < targetRequestCount && attempts < users.length * 2) {
      attempts++;
      
      // Determine if user is sender or receiver
      const isSender = Math.random() > 0.5;
      
      // Find a potential request partner
      const otherUser = users[Math.floor(Math.random() * users.length)];
      if (otherUser._id.toString() === user._id.toString() || otherUser.disabled) continue;
      
      // Check if this users already have a friendship
      const friendshipKey = [user._id.toString(), otherUser._id.toString()].sort().join('-');
      if (existingFriendships.has(friendshipKey)) continue;
      
      // Check if there's already a request between these users
      const requestKey = isSender ? 
        `${user._id.toString()}-${otherUser._id.toString()}` : 
        `${otherUser._id.toString()}-${user._id.toString()}`;
        
      if (existingRequests.has(requestKey)) continue;
      
      // Create timestamp for request creation
      const createdAt = randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date());
      
      // Determine request status - 60% Accepted, 20% Rejected, 20% Pending
      const rand = Math.random();
      const status = rand < 0.6 ? "Accepted" : (rand < 0.8 ? "Rejected" : "Pending");
      
      // Calculate update timestamp based on status
      const updatedAt = status !== "Pending" ? 
        new Date(createdAt.getTime() + randomDelta(5, 1440)) : // 5 min to 24 hours for responses
        createdAt; // No update for pending requests
      
      // Create friend request
      const request = {
        _id: new ObjectId(),
        sender_id: isSender ? user._id : otherUser._id,
        receiver_id: isSender ? otherUser._id : user._id,
        status: status,
        created_at: createdAt,
        updated_at: updatedAt
      };
      
      friendRequests.push(request);
      existingRequests.add(requestKey);
      currentRequestCount++;
      
      // If the request was accepted, also create a friendship
      if (status === "Accepted" && !existingFriendships.has(friendshipKey)) {
        // Create friendship entries only if they don't already exist
        friendships.push({
          _id: new ObjectId(),
          user_id: request.sender_id,
          friend_id: request.receiver_id,
          created_at: updatedAt
        });
        
        friendships.push({
          _id: new ObjectId(),
          user_id: request.receiver_id,
          friend_id: request.sender_id,
          created_at: new Date(updatedAt.getTime() + 5) // Small delay for the reciprocal relationship
        });
        
        existingFriendships.add(friendshipKey);
      }
    }
  }
  
  return { friendships, friendRequests };
};

// Generate a session with players from our existing users
const generateSession = (users, index, maxPlayersPerSession = 3) => {
  // Select random host from active users
  const activeUsers = users.filter(u => !u.disabled);
  const hostIndex = Math.floor(Math.random() * activeUsers.length);
  const host = activeUsers[hostIndex];
  
  // Determine session status
  const status = getSessionStatus();
  
  // Session creation time (within last 30 days)
  const createdAt = randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date());
  
  // Determine number of players based on status
  let numPlayers;
  switch(status) {
    case "Open":
      numPlayers = Math.random() < 0.7 ? 1 : 2; // 70% have 1 player, 30% have 2 players
      break;
    case "Full":
      numPlayers = CONFIG.maxPlayersPerSession; // Full sessions always have max players (3)
      break;
    case "InProgress":
      numPlayers = CONFIG.maxPlayersPerSession; // InProgress sessions always have max players (3)
      break;
    case "Completed":
      numPlayers = CONFIG.maxPlayersPerSession; // Completed sessions always have max players (3)
      break;
    case "Cancelled":
      numPlayers = Math.floor(Math.random() * (CONFIG.maxPlayersPerSession - 1)) + 1; // 1-2 players
      break;
    default:
      numPlayers = 1;
  }
  
  // Select players (including host)
  const joinedPlayers = [];
  const playerIndices = new Set([hostIndex]);
  
  // Add host first
  joinedPlayers.push({
    user_id: host._id.toString(),
    username: host.username,
    nightfarer: host.preferred_nightfarer || randomFromArray(nightfarers),
    covenant_name: host.covenant_name,
    region: host.region,
    platform: host.platform,
    experience: host.experience,
    joined_at: createdAt
  });
  
  // Add other players if needed
  while (joinedPlayers.length < numPlayers && joinedPlayers.length < maxPlayersPerSession) {
    // Try to find a player that matches region/platform when possible
    let matchingUsers = activeUsers.filter((u, idx) => 
      !playerIndices.has(idx) && 
      u.region === host.region && 
      u.platform === host.platform
    );
    
    // If no matching users, fall back to any user
    if (matchingUsers.length === 0) {
      matchingUsers = activeUsers.filter((u, idx) => !playerIndices.has(idx));
    }
    
    if (matchingUsers.length === 0) break; // No more eligible users
    
    const playerIndex = Math.floor(Math.random() * matchingUsers.length);
    const playerUser = matchingUsers[playerIndex];
    const originalIndex = activeUsers.findIndex(u => u._id.toString() === playerUser._id.toString());
    playerIndices.add(originalIndex);
    
    joinedPlayers.push({
      user_id: playerUser._id.toString(),
      username: playerUser.username,
      nightfarer: playerUser.preferred_nightfarer || randomFromArray(nightfarers),
      covenant_name: playerUser.covenant_name,
      region: playerUser.region,
      platform: playerUser.platform,
      experience: playerUser.experience,
      joined_at: new Date(createdAt.getTime() + randomDelta(1, 10))
    });
  }
  
  // Initialize session data
  const sessionData = {
    _id: new ObjectId(),
    name: `session${index + 1}`,
    host_id: host._id.toString(),
    host_experience: host.experience,
    region: host.region,
    platform: host.platform,
    password: Math.random() > 0.5 ? `pass${index + 1}` : "",
    is_private: Math.random() > 0.7, // 30% private
    is_friends_only: Math.random() > 0.8, // 20% friends only
    night_lord: randomFromArray(nightLords),
    status: status,
    joined_players: joinedPlayers,
    results: [],
    ratings: [],
    created_at: createdAt,
    updated_at: createdAt, // Will be updated based on status
    started_at: null,
    completed_at: null,
    stats_updated: false,
    new_session_created: false,
    new_session_created_id: null
  };
  
  // Adjust timestamps and data based on status
  if (status === "InProgress" || status === "Completed" || status === "Cancelled") {
    sessionData.started_at = new Date(createdAt.getTime() + randomDelta(2, 15));
    sessionData.updated_at = sessionData.started_at;
    
    if (status === "Completed" || status === "Cancelled") {
      sessionData.completed_at = new Date(sessionData.started_at.getTime() + randomDelta(20, 120));
      sessionData.updated_at = sessionData.completed_at;
      sessionData.stats_updated = status === "Completed" ? Math.random() > 0.1 : false; // 90% of Completed have stats updated
      
      // Add results for completed sessions
      if (status === "Completed") {
        // Everyone submits results
        sessionData.results = joinedPlayers.map(player => {
          return {
            user_id: player.user_id,
            result: randomFromArray(results),
            rating: randomFromArray(ratings),
            feedback: Math.random() > 0.7 ? "Great session!" : "",
            submitted_at: new Date(sessionData.completed_at.getTime() + randomDelta(1, 20))
          };
        });
        
        // Update the last updated time to match the last result submission
        if (sessionData.results.length > 0) {
          const lastSubmission = sessionData.results.reduce((latest, current) => 
            current.submitted_at > latest.submitted_at ? current : latest
          );
          sessionData.updated_at = lastSubmission.submitted_at;
        }
      }
    }
  }
  
  return sessionData;
};

// Main function to generate data
function generateData() {
  print('Starting data generation...');
  
  // Step 1: Check if we need to clear existing data
  if (CONFIG.clearExistingData) {
    print('Clearing existing data...');
    db.users.deleteMany({});
    db.sessions.deleteMany({});
    db.friendships.deleteMany({});
    db.friend_requests.deleteMany({});
  } else {
    print('Preserving existing data - will only clear sessions, friendships, and friend requests');
    db.sessions.deleteMany({}); // Clear only sessions, keep users
    db.friendships.deleteMany({}); // Clear friendships
    db.friend_requests.deleteMany({}); // Clear friend requests
    print('Existing sessions, friendships, and friend requests cleared, but users are preserved');
  }
  
  // Step 2: Generate users
  print(`Generating ${CONFIG.numUsers} users...`);
  const users = [];
  for (let i = 0; i < CONFIG.numUsers; i++) {
    users.push(generateUser(i));
    
    // Insert in batches to avoid memory issues
    if ((i + 1) % CONFIG.batchSize === 0 || i === CONFIG.numUsers - 1) {
      db.users.insertMany(users);
      print(`Inserted users ${i - users.length + 1} to ${i + 1}`);
      users.length = 0; // Clear array after insertion
    }
  }
  
  // Step 3: Create friendships and friend requests
  print('Creating friendships and friend requests...');
  const allUsers = db.users.find({}).toArray();
  const { friendships, friendRequests } = generateFriendshipsAndRequests(allUsers);
  
  // Insert friendships in batches
  for (let i = 0; i < friendships.length; i += CONFIG.batchSize) {
    const batch = friendships.slice(i, i + CONFIG.batchSize);
    if (batch.length > 0) {
      db.friendships.insertMany(batch);
      print(`Inserted ${batch.length} friendships (${i + 1} to ${i + batch.length})`);
    }
  }
  
  // Insert friend requests in batches
  for (let i = 0; i < friendRequests.length; i += CONFIG.batchSize) {
    const batch = friendRequests.slice(i, i + CONFIG.batchSize);
    if (batch.length > 0) {
      db.friend_requests.insertMany(batch);
      print(`Inserted ${batch.length} friend requests (${i + 1} to ${i + batch.length})`);
    }
  }
  
  // Step 4: Generate sessions
  print(`Generating ${CONFIG.numSessions} sessions...`);
  for (let i = 0; i < CONFIG.numSessions; i++) {
    const batch = [];
    const batchSize = CONFIG.batchSize / 2; // Smaller batches for sessions
    
    for (let j = 0; j < batchSize && i + j < CONFIG.numSessions; j++) {
      batch.push(generateSession(allUsers, i + j));
    }
    
    db.sessions.insertMany(batch);
    print(`Inserted sessions ${i + 1} to ${i + batch.length}`);
    i += batch.length - 1; // Adjust counter for the batch
  }
  
  print('Data generation complete!');
  print(`Generated ${allUsers.length} users, ${friendships.length} friendships, ${friendRequests.length} friend requests, and ${CONFIG.numSessions} sessions`);
}

// Execute the generator
generateData();
print('Script completed successfully!');