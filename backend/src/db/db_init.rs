use bcrypt::{hash, DEFAULT_COST};
use log::info;
use mongodb::{
    bson::{self, doc, oid::ObjectId, Document},
    error::Error,
    options::IndexOptions,
    Collection, Database, IndexModel,
};

pub async fn initialize_database(db: &Database) -> Result<(), Error> {
    // Check and create collections
    ensure_collections_exist(db).await?;

    // Create indexes
    create_indexes(db).await?;

    // Seed default data
    seed_default_data(db).await?;

    // Update schemas
    update_schemas(db).await?;

    Ok(())
}

async fn ensure_collections_exist(db: &Database) -> Result<(), Error> {
    // List of required collections
    let required_collections = vec![
        "users",
        "nightlords",
        "nightfarers",
        "platforms",
        "covenants",
        "regions",
        "feature_flags",
        "friendships",
        "news",
        "announcements",
    ];

    // Get existing collections
    let existing = db.list_collection_names().await?;

    // Create any missing collections
    for coll in required_collections {
        if !existing.contains(&coll.to_string()) {
            db.create_collection(coll).await?;
            info!("Created collection: {}", coll);
        }
    }

    Ok(())
}

async fn create_indexes(db: &Database) -> Result<(), Error> {
    // Creating an index is idempotent - won't error if it already exists

    // Username index for users collection
    let username_index = IndexModel::builder()
        .keys(doc! { "username": 1 })
        .options(IndexOptions::builder().unique(true).build())
        .build();

    db.collection::<Document>("users")
        .create_index(username_index)
        .await?;

    // Session ID index for sessions collection
    let session_id_index = IndexModel::builder().keys(doc! { "session_id": 1 }).build();

    db.collection::<Document>("sessions")
        .create_index(session_id_index)
        .await?;

    // User ID index for sessions collection
    let user_id_index = IndexModel::builder().keys(doc! { "user_id": 1 }).build();

    db.collection::<Document>("sessions")
        .create_index(user_id_index)
        .await?;

    // Host ID index for sessions collection
    let host_id_index = IndexModel::builder().keys(doc! { "host_id": 1 }).build();

    db.collection::<Document>("sessions")
        .create_index(host_id_index)
        .await?;

    // Joined players user_id index for sessions collection
    let joined_players_user_id_index = IndexModel::builder()
        .keys(doc! { "joined_players.user_id": 1 })
        .build();

    db.collection::<Document>("sessions")
        .create_index(joined_players_user_id_index)
        .await?;

    // Joined players userId index for sessions collection (looks like we have both formats)
    let joined_players_user_id_index = IndexModel::builder()
        .keys(doc! { "joined_players.user_id": 1 })
        .build();

    db.collection::<Document>("sessions")
        .create_index(joined_players_user_id_index)
        .await?;

    // Compound index for common session queries
    let search_sessions_index = IndexModel::builder()
        .keys(doc! { "region": 1, "platform": 1, "status": 1, "is_private": 1, "is_friends_only": 1, "host_experience": 1 , "night_lord":1})
        .build();

    db.collection::<Document>("sessions")
        .create_index(search_sessions_index)
        .await?;

    // Session ID index for messages collection
    let messages_session_id_index = IndexModel::builder().keys(doc! { "session_id": 1 }).build();

    db.collection::<Document>("messages")
        .create_index(messages_session_id_index)
        .await?;

    // Indexes for friendships collection
    let friendship_user_id_index = IndexModel::builder().keys(doc! { "user_id": 1 }).build();

    db.collection::<Document>("friendships")
        .create_index(friendship_user_id_index)
        .await?;

    let friendship_friend_id_index = IndexModel::builder().keys(doc! { "friend_id": 1 }).build();

    db.collection::<Document>("friendships")
        .create_index(friendship_friend_id_index)
        .await?;

    // Index for news collection by published status and date
    let news_index = IndexModel::builder()
        .keys(doc! { "published": 1, "created_at": -1 })
        .build();

    db.collection::<Document>("news")
        .create_index(news_index)
        .await?;

    // Index for announcements collection by active status
    let announcements_index = IndexModel::builder().keys(doc! { "active": 1 }).build();

    db.collection::<Document>("announcements")
        .create_index(announcements_index)
        .await?;

    Ok(())
}

async fn seed_default_data(db: &Database) -> Result<(), Error> {
    // Seed admin users
    seed_admin_users(db).await?;

    // Seed nightlords collection
    seed_nightlords(db).await?;

    // Seed nightfarers collection
    seed_nightfarers(db).await?;

    // Seed platforms collection
    seed_platforms(db).await?;

    // Seed regions collection
    seed_regions(db).await?;

    // Seed covenants collection
    seed_covenants(db).await?;

    // Seed experiences collection
    seed_experiences(db).await?;

    // Seed feature flags
    seed_feature_flags(db).await?;

    // Seed news articles
    seed_news(db).await?;

    // Seed announcements
    seed_announcements(db).await?;

    Ok(())
}

// Helper function to seed a collection with name-description pairs
async fn seed_collection(
    db: &Database,
    collection_name: &str,
    items: Vec<(&str, &str)>,
) -> Result<(), Error> {
    let collection: Collection<Document> = db.collection(collection_name);

    for (name, description) in items {
        // Use MongoDB datetime directly
        let now_bson = bson::DateTime::now();

        // Check if document already exists
        let filter = doc! { "name": name };
        let count = collection.count_documents(filter.clone()).await?;

        // Only insert if it doesn't exist
        if count == 0 {
            let doc = doc! {
                "name": name,
                "description": description,
                "created_at": now_bson,
                "updated_at": now_bson,
                "schema_version": 1
            };

            collection.insert_one(doc).await?;
        }
    }

    info!("Seeded collection: {}", collection_name);
    Ok(())
}

// Example of how to update schemas
async fn update_schemas(db: &Database) -> Result<(), Error> {
    // Update users collection schema
    let users: Collection<Document> = db.collection("users");

    // Update users who don't have required fields from the latest schema
    users
        .update_many(
            doc! {
                "$or": [
                    { "auto_region": { "$exists": false } },
                    { "cm_region": { "$exists": false } },
                    { "cf_region": { "$exists": false } },
                    { "avatar_url": { "$exists": false } },
                    { "preferred_session_name": { "$exists": false } },
                    { "preferred_session_password": { "$exists": false } },
                    { "preferred_nightfarer": { "$exists": false } },
                    { "schema_version": { "$exists": false } }
                ]
            },
            doc! {
                "$set": {
                    "auto_region": true,
                    "cm_region": "Europe",
                    "cf_region": "Europe",
                    "avatar_url": null,
                    "preferred_session_name": null,
                    "preferred_session_password": null,
                    "preferred_nightfarer": null,
                    "schema_version": 2  // Bump version
                }
            },
        )
        .await?;

    info!("Updated user schemas to version 2");

    // Ensure login_attempts collection exists
    if !db
        .list_collection_names()
        .await?
        .contains(&"login_attempts".to_string())
    {
        db.create_collection("login_attempts").await?;
        info!("Created login_attempts collection");
    }

    // Create TTL index on login_attempts to automatically delete old records
    let login_attempts_index = IndexModel::builder()
        .keys(doc! { "created_at": 1 })
        .options(
            IndexOptions::builder()
                .expire_after(std::time::Duration::from_secs(60 * 60 * 24 * 7)) // 7 days
                .build(),
        )
        .build();

    db.collection::<Document>("login_attempts")
        .create_index(login_attempts_index)
        .await?;

    info!("Created TTL index on login_attempts collection");

    // Create TTL index on tokens collection if it exists
    if db
        .list_collection_names()
        .await?
        .contains(&"tokens".to_string())
    {
        // TTL index for tokens collection - auto expiration
        let tokens_index = IndexModel::builder()
            .keys(doc! { "expires_at": 1 })
            .options(
                IndexOptions::builder()
                    .expire_after(std::time::Duration::from_secs(0)) // 0 seconds means delete when expires_at is reached
                    .build(),
            )
            .build();

        db.collection::<Document>("tokens")
            .create_index(tokens_index)
            .await?;

        info!("Created TTL index on tokens collection");
    }

    Ok(())
}

// Helper function to seed feature flags
async fn seed_feature_flags(db: &Database) -> Result<(), Error> {
    let collection: Collection<Document> = db.collection("feature_flags");

    let default_flags = vec![(
        "disable_auto_redirect",
        "Disable Auto Redirect",
        "Controls whether users are automatically redirected to newly created sessions",
        true, // enabled
        true, // default_value
    )];

    for (key, name, description, enabled, default_value) in default_flags {
        let now = bson::DateTime::now();

        // Check if flag already exists
        let filter = doc! { "key": key };
        let count = collection.count_documents(filter.clone()).await?;

        // Only insert if it doesn't exist
        if count == 0 {
            let doc = doc! {
                "key": key,
                "name": name,
                "description": description,
                "enabled": enabled,
                "default_value": default_value,
                "created_at": now,
                "updated_at": now
            };

            collection.insert_one(doc).await?;
            info!("Created feature flag: {}", key);
        }
    }

    info!("Seeded feature flags collection");
    Ok(())
}

// Helper function to seed news articles
#[allow(clippy::too_many_lines)]
async fn seed_news(db: &Database) -> Result<(), Error> {
    let collection: Collection<Document> = db.collection("news");

    // Check if we already have news articles
    let count = collection.count_documents(doc! {}).await?;

    // Only seed if the collection is empty
    if count == 0 {
        // Insert the first news article
        let news_content_origin = "<p>Hi everyone,<br>\nFirst of all, thank you for visiting the Covenant Match page.</p>\n<p>I'd like to share a bit about why this project exists and the story behind it.</p>\n<p>It's hard to fully express just how much I appreciate FromSoftware and Hidetaka Miyazaki for creating so many masterpieces over the years. I truly see their games as works of art.</p>\n<p>When I heard that a new Elden Ring expansion was coming, I was beyond excited. But then I found out—it would be a multiplayer experience. At first, I was skeptical. I rarely play multiplayer games, and none of my friends are into the Souls series.</p>\n<p>Then came the network test...</p>\n<p>Initially, the fast pace felt a bit overwhelming. But because I already loved Elden Ring so much, I adapted quickly. The combat still felt incredible. Some teams were hit or miss, but when things clicked, the experience was unforgettable.</p>\n<p>I still remember one match vividly—me and two others, both Wylders and a Duchess. Everything just worked. From the subtle communication using pins to the final fight against the Night Lord, it was a flawless run. When it ended, I desperately wanted to connect with those players. But after a few final gestures, the screen faded to black—and they were gone.</p>\n<p>That moment made me realize: I didn't want to lose track of great teammates who had my back, revived me, and made the game better. So I created Covenant Match—for others and myself who want to stay connected with good teammates and relive those epic moments.</p>\n";

        // Get akri's ObjectId or create a new one if not found
        let users: Collection<Document> = db.collection("users");
        let akri_filter = doc! { "username": "akri" };

        let akri_doc = users.find_one(akri_filter.clone()).await?;
        let akri_id = match akri_doc {
            Some(doc) => doc
                .get_object_id("_id")
                .map_err(|e| Error::custom(format!("Failed to get akri's ObjectId: {e}")))?,
            None => ObjectId::new(), // Fallback if somehow akri doesn't exist
        };

        // Create a specific date for the news article
        let created_date = bson::DateTime::from_millis(1_747_262_292_891); // 2025-05-15

        collection
            .insert_one(doc! {
                "_id": ObjectId::new(),
                "title": "Covenant Match - Origin Story",
                "content": news_content_origin,
                "summary": "Why did I spend my time building this?",
                "image_url": null,
                "author_id": akri_id.to_string(),
                "author_username": "akri",
                "updated_by_id": akri_id.to_string(),
                "updated_by_username": "akri",
                "published": true,
                "created_at": created_date,
                "updated_at": created_date,
            })
            .await?;

        let news_content_release = "<p>Hi all,<br>\nI'm planning to release the full version of the page on June 1st.</p>\n<p>Before then, I’d like to double-check, once the game is out, will there be any major changes I should implement for Covenant Match.</p>\n<p>The best way to support the project is by signing up.</p>\n<p>See you all in Limveld!</p>";
        
        collection
        .insert_one(doc! {
            "_id": ObjectId::new(),
            "title": "Release date - June 1",
            "content": news_content_release,
            "summary": "Covenant Match Release Date",
            "image_url": null,
            "author_id": akri_id.to_string(),
            "author_username": "akri",
            "updated_by_id": akri_id.to_string(),
            "updated_by_username": "akri",
            "published": true,
            "created_at": created_date,
            "updated_at": created_date,
        })
        .await?;

        info!("Seeded news collection with origin story article");
    }

    Ok(())
}

// Helper function to seed admin users
#[allow(clippy::too_many_lines)]
async fn seed_admin_users(db: &Database) -> Result<(), Error> {
    // Ensure admin user exists
    let users: Collection<Document> = db.collection("users");
    let admin_filter = doc! { "username": "akri" };

    let admin_count = users.count_documents(admin_filter.clone()).await?;

    if admin_count == 0 {
        // Use MongoDB datetime
        let now = bson::DateTime::now();

        // Use object ID for admin user
        let admin_id = ObjectId::new();

        // Hash the password
        let password_hash = hash("Justbuild22#", DEFAULT_COST)
            .map_err(|e| Error::custom(format!("Failed to hash password: {e}")))?;

        users
            .insert_one(doc! {
                "_id": admin_id,
                "username": "akri",
                "email": "akri@covenant-match.com",
                "password_hash": password_hash.clone(),
                "region": "Europe",
                "auto_region": true,
                "cm_region": "Europe",
                "cf_region": "Europe",
                "platform": "PlayStation",
                "role": "admin",
                "disabled": false,
                "email_verified": true,
                "experience": "Veteran",
                "covenant_name": "Warriors of Sunlight",
                "created_at": now,
                "updated_at": now,
                "friend_list": []
            })
            .await?;
        info!("Created default akri user");

        let dino_id = ObjectId::new();

        users
            .insert_one(doc! {
                "_id": dino_id,
                "username": "dino",
                "email": "dino@covenant-match.com",
                "password_hash": password_hash.clone(),
                "region": "Europe",
                "auto_region": false,
                "cm_region": "Europe",
                "cf_region": "Europe",
                "platform": "PlayStation",
                "role": "admin",
                "disabled": false,
                "email_verified": true,
                "experience": "Veteran",
                "covenant_name": "Warriors of Sunlight",
                "created_at": now,
                "updated_at": now,
                "friend_list": []
            })
            .await?;
        info!("Created default dino user");

        let boris_id = ObjectId::new();

        users
            .insert_one(doc! {
                "_id": boris_id,
                "username": "boris",
                "email": "boris@covenant-match.com",
                "password_hash": password_hash,
                "region": "Europe",
                "auto_region": false,
                "cm_region": "Europe",
                "cf_region": "Europe",
                "platform": "PlayStation",
                "role": "admin",
                "disabled": false,
                "email_verified": true,
                "experience": "Veteran",
                "covenant_name": "Warriors of Sunlight",
                "created_at": now,
                "updated_at": now,
                "friend_list": []
            })
            .await?;
        info!("Created default boris user");
    }

    Ok(())
}

// Helper function to seed nightlords collection
async fn seed_nightlords(db: &Database) -> Result<(), Error> {
    let default_nightlords = vec![
        ("Tricephalos", "Nightlords are the guardians of the realm, they are the ones who protect the realm from the darkness."),
        ("Gaping Jaw", "Gaping Jaw is the Nightlord of the Pact, he is the one who protects the realm from the darkness."),
        ("Sentient Pest", "Sentient Pest is the Nightlord of the Pact, he is the one who protects the realm from the darkness."),
        ("Augur", "Augur is the Nightlord of the Pact, he is the one who protects the realm from the darkness."),
        ("Equilibrious Beast", "Equilibrious Beast is the Nightlord of the Pact, he is the one who protects the realm from the darkness."),
        ("Darkdrift Knight", "Darkdrift Knight is the Nightlord of the Pact, he is the one who protects the realm from the darkness."),
        ("Fissure in the Fog", "Fissure in the Fog is the Nightlord of the Pact, he is the one who protects the realm from the darkness."),
    ];

    seed_collection(db, "nightlords", default_nightlords).await
}

// Helper function to seed nightfarers collection
async fn seed_nightfarers(db: &Database) -> Result<(), Error> {
    let default_nightfarers = vec![
        ("Wylder", "Quality build"),
        ("Guardian", "Tank build"),
        ("Recluse", "Sorcerer build"),
        ("Duchess", "Dexterity build"),
        ("Ironeye", "Dexterity build with long range"),
        ("Rider", "Strength build"),
        ("Executor", "Sekiro build"),
        ("Revenant", "Summoner build"),
    ];

    seed_collection(db, "nightfarers", default_nightfarers).await
}

// Helper function to seed platforms collection
async fn seed_platforms(db: &Database) -> Result<(), Error> {
    let default_platforms = vec![
        ("PlayStation", "PlayStation is a gaming console."),
        ("Xbox", "Xbox is a gaming console."),
        ("PC", "PC is a gaming console."),
    ];

    seed_collection(db, "platforms", default_platforms).await
}

// Helper function to seed regions collection
async fn seed_regions(db: &Database) -> Result<(), Error> {
    let default_regions = vec![
        ("NA", "North America"),
        ("EU", "Europe"),
        ("AS", "Asia"),
        ("OC", "Oceania"),
        ("SA", "South America"),
        ("AF", "Africa"),
        ("ME", "Middle East"),
    ];

    seed_collection(db, "regions", default_regions).await
}

// Helper function to seed covenants collection
async fn seed_covenants(db: &Database) -> Result<(), Error> {
    let default_covenants = vec![
        ("Warriors of Sunlight", "Nightlords are the guardians of the realm, they are the ones who protect the realm from the darkness."),
        ("Way of White", "Pact is the Covenant of the Pact, they are the ones who protect the realm from the darkness."),
        ("Princess Guard", "Pact is the Covenant of the Pact, they are the ones who protect the realm from the darkness."),
        ("Way of the Blue", "Pact is the Covenant of the Pact, they are the ones who protect the realm from the darkness."),
        ("Heirs of the Sun", "Pact is the Covenant of the Pact, they are the ones who protect the realm from the darkness."),
        ("Spears of the Church", "Pact is the Covenant of the Pact, they are the ones who protect the realm from the darkness."),
        ("Blades of the Darkmoon", "Pact is the Covenant of the Pact, they are the ones who protect the realm from the darkness."),
        ("Watchdogs of Farron", "Pact is the Covenant of the Pact, they are the ones who protect the realm from the darkness."),   
    ];

    seed_collection(db, "covenants", default_covenants).await
}

// Helper function to seed experiences collection
async fn seed_experiences(db: &Database) -> Result<(), Error> {
    let default_experiences = vec![
        ("Beginner", "Newly risen from the embers, seeking purpose."),
        ("Mid", "Tempered by trials, unshaken in the storm."),
        (
            "Veteran",
            "A relic of countless battles, a legend in flesh.",
        ),
    ];

    seed_collection(db, "experiences", default_experiences).await
}

// Helper function to seed announcements
async fn seed_announcements(db: &Database) -> Result<(), Error> {
    let collection: Collection<Document> = db.collection("announcements");

    // Get akri's ObjectId or create a new one if not found
    let users: Collection<Document> = db.collection("users");
    let akri_filter = doc! { "username": "akri" };

    let akri_doc = users.find_one(akri_filter.clone()).await?;
    let akri_id = match akri_doc {
        Some(doc) => doc
            .get_object_id("_id")
            .map_err(|e| Error::custom(format!("Failed to get akri's ObjectId: {e}")))?,
        None => ObjectId::new(), // Fallback if somehow akri doesn't exist
    };

    // Check if we already have announcements
    let count = collection.count_documents(doc! {}).await?;

    // Only seed if the collection is empty
    if count == 0 {
        // Create the welcome announcement with a specific ID and date
        let created_date = bson::DateTime::from_millis(1_747_204_107_597); // 2025-05-15T10:28:27.597Z

        collection
            .insert_one(doc! {
                "_id": ObjectId::new(),
                "active": true,
                "content": "Welcome to the preview of Covenant Match! The official release is scheduled for June 1st.",
                "updated_by_id": akri_id.to_string(),
                "updated_by_username": "akri",
                "updated_at": created_date,
            })
            .await?;

        info!("Seeded announcements collection with welcome message");
    }

    Ok(())
}
