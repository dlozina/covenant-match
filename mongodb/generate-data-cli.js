// MongoDB User and Session Generator for MongoDB Shell (mongosh)
// Save this as generate-data.js and run with: mongosh mongodb://localhost:27017/your_database_name generate-data.js

// Configuration - adjust these values as needed
const CONFIG = {
  numUsers: 0,              // Number of users to generate
  numSessions: 5000,           // Number of sessions to generate
  openSessionPercentage: 40,   // Percentage of sessions that should be "Open" (1-2 players)
  fullSessionPercentage: 15,   // Percentage of sessions that should be "Full" (3 players)
  inProgressPercentage: 20,    // Percentage of sessions that should be "InProgress"
  completedPercentage: 20,     // Percentage of sessions that should be "Completed"
  cancelledPercentage: 5,      // Percentage of sessions that should be "Cancelled"
  batchSize: 100,              // How many documents to insert at once
  clearExistingData: false,    // Set to false to preserve existing data
  maxPlayersPerSession: 3      // Maximum number of players in a session
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
    friend_list: [], // Will be populated later
    avatar_url: Math.random() > 0.7 ? `https://example.com/avatars/avatar${Math.floor(Math.random() * 50)}.png` : null,
    preferred_nightfarer: Math.random() > 0.5 ? randomFromArray(nightfarers) : "",
    preferred_session_name: "",
    preferred_session_password: "",
    schema_version: 2
  };
};

// Create friends relationships (bidirectional)
const createFriendRelationships = (users, averageFriends = 5) => {
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    // Number of friends for this user (random around the average)
    const friendCount = Math.max(0, Math.floor(Math.random() * averageFriends * 2));
    
    for (let j = 0; j < friendCount; j++) {
      // Find a random user to befriend
      const friendIndex = Math.floor(Math.random() * users.length);
      if (friendIndex !== i && !user.friend_list.some(id => id.toString() === users[friendIndex]._id.toString())) {
        // Add friend to user's friend list
        user.friend_list.push(users[friendIndex]._id);
        // Add user to friend's friend list
        users[friendIndex].friend_list.push(user._id);
      }
    }
  }
  return users;
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
  } else {
    print('Preserving existing data - will only clear sessions');
    db.sessions.deleteMany({}); // Clear only sessions, keep users
    print('Existing sessions cleared, but users are preserved');
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
  
  // Step 3: Create friend relationships
  print('Creating friend relationships...');
  const allUsers = db.users.find({}).toArray();
  const usersWithFriends = createFriendRelationships(allUsers);
  
  // Update users with friend lists
  usersWithFriends.forEach(user => {
    db.users.updateOne(
      { _id: user._id },
      { $set: { friend_list: user.friend_list } }
    );
  });
  print('Updated friend relationships');
  
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
  print(`Generated ${allUsers.length} users and ${CONFIG.numSessions} sessions`);
}

// Execute the generator
generateData();
print('Script completed successfully!');