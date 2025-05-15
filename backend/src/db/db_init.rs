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

    Ok(())
}

#[allow(clippy::all)]
async fn seed_default_data(db: &Database) -> Result<(), Error> {
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
        let password_hash = hash("changeme123#", DEFAULT_COST)
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

    // Define default nightlords
    let default_nightlords = vec![
        ("Tricephalos", "Nightlords are the guardians of the realm, they are the ones who protect the realm from the darkness."),
        ("Gaping Jaw", "Gaping Jaw is the Nightlord of the Pact, he is the one who protects the realm from the darkness."),
        ("Sentient Pest", "Sentient Pest is the Nightlord of the Pact, he is the one who protects the realm from the darkness."),
        ("Augur", "Augur is the Nightlord of the Pact, he is the one who protects the realm from the darkness."),
        ("Equilibrious Beast", "Equilibrious Beast is the Nightlord of the Pact, he is the one who protects the realm from the darkness."),
        ("Darkdrift Knight", "Darkdrift Knight is the Nightlord of the Pact, he is the one who protects the realm from the darkness."),
        ("Fissure in the Fog", "Fissure in the Fog is the Nightlord of the Pact, he is the one who protects the realm from the darkness."),
    ];

    // Seed nightlords collection
    seed_collection(db, "nightlords", default_nightlords).await?;

    // Define default nightfarers
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

    // Seed nightfarers collection
    seed_collection(db, "nightfarers", default_nightfarers).await?;

    let default_platforms = vec![
        ("PlayStation", "PlayStation is a gaming console."),
        ("Xbox", "Xbox is a gaming console."),
        ("PC", "PC is a gaming console."),
    ];

    // Seed platforms collection
    seed_collection(db, "platforms", default_platforms).await?;

    let default_regions = vec![
        ("NA", "North America"),
        ("EU", "Europe"),
        ("AS", "Asia"),
        ("OC", "Oceania"),
        ("SA", "South America"),
        ("AF", "Africa"),
        ("ME", "Middle East"),
    ];

    // Seed regions collection
    seed_collection(db, "regions", default_regions).await?;

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

    // Seed covenants collection
    seed_collection(db, "covenants", default_covenants).await?;

    let default_experiences = vec![
        ("Beginner", "Newly risen from the embers, seeking purpose."),
        ("Mid", "Tempered by trials, unshaken in the storm."),
        (
            "Veteran",
            "A relic of countless battles, a legend in flesh.",
        ),
    ];

    // Seed experiences collection
    seed_collection(db, "experiences", default_experiences).await?;

    // Seed feature flags
    seed_feature_flags(db).await?;

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
