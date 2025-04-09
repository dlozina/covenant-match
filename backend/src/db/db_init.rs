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
    //update_schemas(db).await?;

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
    let index = IndexModel::builder()
        .keys(doc! { "username": 1 })
        .options(IndexOptions::builder().unique(true).build())
        .build();

    db.collection::<Document>("users")
        .create_index(index)
        .await?;

    Ok(())
}

async fn seed_default_data(db: &Database) -> Result<(), Error> {
    // Ensure admin user exists
    let users: Collection<Document> = db.collection("users");
    let admin_filter = doc! { "username": "admin" };

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
                "username": "admin",
                "email": "akri@gmail.com",
                "password_hash": password_hash,
                "display_name": "Akri",
                "region": "Europe",
                "auto_region": true,
                "platform": "PlayStation",
                "role": "admin",
                "covenant_name": "Warriors of Sunlight",
                "created_at": now,
                "updated_at": now
            })
            .await?;
        info!("Created default admin user");
    }

    // Define default nightlords
    let default_nightlords = vec![
        ("Tricephalos", "Nightlords are the guardians of the realm, they are the ones who protect the realm from the darkness."),
        ("PCR", "PCR is the Covenant of the Pact, they are the ones who protect the realm from the darkness."),
        ("Malenia, Blade of Miquella", "PCR is the Covenant of the Pact, they are the ones who protect the realm from the darkness."),
        ("Maliketh", "Maliketh is the Nightlord of the Pact, he is the one who protects the realm from the darkness."),
        ("Mohg", "Mohg is the Nightlord of the Pact, he is the one who protects the realm from the darkness."),
        ("Midra", "Midra is the Nightlord of the Pact, he is the one who protects the realm from the darkness."),
        ("Bayle", "Bayle is the Nightlord of the Pact, he is the one who protects the realm from the darkness."),
        ("Messmer", "Messmer is the Nightlord of the Pact, he is the one who protects the realm from the darkness."),
    ];

    // Seed nightlords collection
    seed_collection(db, "nightlords", default_nightlords).await?;

    // Define default nightfarers
    let default_nightfarers = vec![
        ("Wylder", "Wylder is the nightfarer of the Pact, he is the one who protects the realm from the darkness."),
        ("Guardian", "Guardian is the nightfarer of the Pact, he is the one who protects the realm from the darkness."),
        ("Recluse", "Recluse is the nightfarer of the Pact, he is the one who protects the realm from the darkness."),
        ("Duchess", "Recluse is the nightfarer of the Pact, he is the one who protects the realm from the darkness."),
        ("Ironeye", "Ironeye is the nightfarer of the Pact, he is the one who protects the realm from the darkness."),
        ("Jolan", "Jolan is the nightfarer of the Pact, he is the one who protects the realm from the darkness."),
        ("Igon", "Midra is the nightfarer of the Pact, he is the one who protects the realm from the darkness."),
        ("Alexander", "Alexander is the nightfarer of the Pact, he is the one who protects the realm from the darkness."),
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
// async fn update_schemas(db: &Database) -> Result<(), Error> {
//     let settings: Collection<Document> = db.collection("settings");

//     // Update from v1 to v2 (adding new fields)
//     settings
//         .update_many(
//             doc! { "schema_version": 1 },
//             doc! {
//                 "$set": {
//                     "new_feature_flag": false,
//                     "analytics_enabled": true,
//                     "schema_version": 2  // Bump version
//                 }
//             },
//         )
//         .await?;

//     Ok(())
// }
