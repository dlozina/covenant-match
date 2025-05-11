# How to run generate-data-cli.js

mongosh mongodb://localhost:27018/covenant-match generate-data-cli.js

```bash
const CONFIG = {
    numUsers: 2000,              // Number of users to generate
    numSessions: 5000,           // Number of sessions to generate
    openSessionPercentage: 70,   // Percentage of sessions that should be "Open"
    inProgressPercentage: 15,    // Percentage of sessions that should be "In Progress"
    completedPercentage: 10,     // Percentage of sessions that should be "Completed"
    abandonedPercentage: 5,      // Percentage of sessions that should be "Abandoned"
    batchSize: 100,              // How many documents to insert at once
    clearExistingData: false,     // Whether to clear existing data before generating new data
  };
```
Why Preserve Existing Users?

Maintain Real User Data: If you have real users in your database (like admin accounts you've created), deleting them would force you to recreate them manually.
Preserve User Relationships: If you've established friend relationships or other important connections between users, keeping them intact maintains the integrity of your data model.
Test with Realistic Data: Your real users likely have more realistic data patterns than generated ones, which is valuable for testing.
Consistency Across Testing Sessions: By keeping the same base users, you can run the script multiple times and still maintain continuity in your testing.

Why We're Still Clearing Sessions:

Sessions are Transient: Sessions typically represent temporary activity, so clearing and regenerating them makes sense for testing.
Fresh Test Data: Each time you run the script, you'll get fresh sessions with different statuses and configurations for testing.
Reference Integrity: The new sessions will reference your existing users, maintaining data integrity.

How This Script Works Now:

It preserves all existing users in your database
It only clears existing sessions
It uses your existing users to generate new sessions
It then adds new generated users (if the CONFIG.numUsers is greater than your existing count)

If you want to run the script multiple times, this approach lets you:

Keep accumulating users (if desired)
Always have fresh session data for testing
Maintain your important user accounts

The script is now configured with clearExistingData: false by default, which will preserve your existing users (including the admin account in your example).