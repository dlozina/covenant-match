db = db.getSiblingDB('covenant-match');

// Create collections
db.createCollection('users');
db.createCollection('sessions');
db.createCollection('statistics');

// Create indexes
db.users.createIndex({ "username": 1 }, { unique: true });
db.users.createIndex({ "email": 1 }, { unique: true });
db.sessions.createIndex({ "host_id": 1 });
db.sessions.createIndex({ "status": 1 });
db.sessions.createIndex({ "created_at": 1 });
db.statistics.createIndex({ "user_id": 1 });
db.statistics.createIndex({ "character": 1 });

print('MongoDB initialization completed');
