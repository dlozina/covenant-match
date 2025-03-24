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
    ];

    // Get existing collections
    let existing = db.list_collection_names(None).await?;

    // Create any missing collections
    for coll in required_collections {
        if !existing.contains(&coll.to_string()) {
            db.create_collection(coll, None).await?;
            info!("Created collection: {}", coll);
        }
    }

    Ok(())
}

async fn seed_default_data(db: &Database) -> Result<(), Error> {
    // Ensure admin user exists
    let users = db.collection("users");
    let admin_filter = doc! { "username": "admin" };

    let admin_count = users.count_documents(admin_filter.clone(), None).await?;

    if admin_count == 0 {
        users
            .insert_one(
                doc! {
                    "username": "admin",
                    "email": "akri@gmail.com",
                    "password": "admin",
                    "display_name": "Akri",
                    "region": "EU",
                    "auto_region": true,
                    "platform": "PlayStation",
                    "role": "admin",
                    "covenant_name": "Nightlords",
                    "created_at": Bson::DateTime(chrono::Utc::now()),
                    "updated_at": Bson::DateTime(chrono::Utc::now())
                },
                None,
            )
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

    // Prepare bulk operations for nightlords
    let nightlords = db.collection("nightlords");
    let mut bulk_operations = Vec::new();

    for (name, description) in default_nightlords {
        let filter = doc! { "name": name };
        let update = doc! {
            "$setOnInsert": {
                "name": name,
                "description": description,
                "created_at": Bson::DateTime(chrono::Utc::now()),
                "updated_at": Bson::DateTime(chrono::Utc::now()),
                "schema_version": 1
            }
        };

        bulk_operations.push(UpdateOne {
            filter,
            update,
            options: UpdateOptions::builder().upsert(true).build(),
        });
    }

    // Execute bulk operations
    if !bulk_operations.is_empty() {
        nightlords.bulk_write(bulk_operations, None).await?;
        info!("Seeded default nightlords");
    }

    // Define default nightfarers
    let default_nightfarers = vec![
        ("Wylder", "Wylder is the nightfarer of the Pact, he is the one who protects the realm from the darkness."),
        ("Guardian", "Guardian is the nightfarer of the Pact, he is the one who protects the realm from the darkness."),
        ("Recluse", "Recluse is the nightfarer of the Pact, he is the one who protects the realm from the darkness."),
        ("Duchess", "Recluse is the nightfarer of the Pact, he is the one who protects the realm from the darkness."),
        ("Patches", "Patches is the nightfarer of the Pact, he is the one who protects the realm from the darkness."),
        ("Jolan", "Jolan is the nightfarer of the Pact, he is the one who protects the realm from the darkness."),
        ("Igon", "Midra is the nightfarer of the Pact, he is the one who protects the realm from the darkness."),
        ("Alexander", "Alexander is the nightfarer of the Pact, he is the one who protects the realm from the darkness."),
    ];

    let default_platforms = vec![
        ("PlayStation", "PlayStation is a gaming console."),
        ("Xbox", "Xbox is a gaming console."),
        ("PC", "PC is a gaming console."),
    ];

    let default_regions = vec![
        ("NA", "North America"),
        ("EU", "Europe"),
        ("AS", "Asia"),
        ("OC", "Oceania"),
        ("SA", "South America"),
        ("AF", "Africa"),
        ("ME", "Middle East"),
    ];

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

    // Prepare bulk operations for nightfarers
    let nightfarers = db.collection("nightfarers");
    let mut nightfarer_operations = Vec::new();

    for (name, description) in default_nightfarers {
        let filter = doc! { "name": name };
        let update = doc! {
            "$setOnInsert": {
                "name": name,
                "description": description,
                "created_at": Bson::DateTime(chrono::Utc::now()),
                "updated_at": Bson::DateTime(chrono::Utc::now()),
                "schema_version": 1
            }
        };

        nightfarer_operations.push(UpdateOne {
            filter,
            update,
            options: UpdateOptions::builder().upsert(true).build(),
        });
    }

    // Execute bulk operations for nightfarers
    if !nightfarer_operations.is_empty() {
        nightfarers.bulk_write(nightfarer_operations, None).await?;
        info!("Seeded default nightfarers");
    }

    // Prepare bulk operations for platforms
    let platforms = db.collection("platforms");
    let mut platform_operations = Vec::new();

    for (name, description) in default_platforms {
        let filter = doc! { "name": name };
        let update = doc! {
            "$setOnInsert": {
                "name": name,
                "description": description,
                "created_at": Bson::DateTime(chrono::Utc::now()),
                "updated_at": Bson::DateTime(chrono::Utc::now()),
                "schema_version": 1
            }
        };

        platform_operations.push(UpdateOne {
            filter,
            update,
            options: UpdateOptions::builder().upsert(true).build(),
        });
    }

    // Execute bulk operations for platforms
    if !platform_operations.is_empty() {
        platforms.bulk_write(platform_operations, None).await?;
        info!("Seeded default platforms");
    }

    // Prepare bulk operations for regions
    let regions = db.collection("regions");
    let mut region_operations = Vec::new();

    for (name, description) in default_regions {
        let filter = doc! { "name": name };
        let update = doc! {
            "$setOnInsert": {
                "name": name,
                "description": description,
                "created_at": Bson::DateTime(chrono::Utc::now()),
                "updated_at": Bson::DateTime(chrono::Utc::now()),
                "schema_version": 1
            }
        };

        region_operations.push(UpdateOne {
            filter,
            update,
            options: UpdateOptions::builder().upsert(true).build(),
        });
    }

    // Execute bulk operations for regions
    if !region_operations.is_empty() {
        regions.bulk_write(region_operations, None).await?;
        info!("Seeded default regions");
    }

    // Prepare bulk operations for covenants
    let covenants = db.collection("covenants");
    let mut covenant_operations = Vec::new();

    for (name, description) in default_covenants {
        let filter = doc! { "name": name };
        let update = doc! {
            "$setOnInsert": {
                "name": name,
                "description": description,
                "created_at": Bson::DateTime(chrono::Utc::now()),
                "updated_at": Bson::DateTime(chrono::Utc::now()),
                "schema_version": 1
            }
        };

        covenant_operations.push(UpdateOne {
            filter,
            update,
            options: UpdateOptions::builder().upsert(true).build(),
        });
    }

    // Execute bulk operations for covenants
    if !covenant_operations.is_empty() {
        covenants.bulk_write(covenant_operations, None).await?;
        info!("Seeded default covenants");
    }

    Ok(())
}

// todo -> Example for updates
async fn update_schemas(db: &Database) -> Result<(), Error> {
    let settings = db.collection("settings");

    // Update from v1 to v2 (adding new fields)
    settings
        .update_many(
            doc! { "schema_version": 1 },
            doc! {
                "$set": {
                    "new_feature_flag": false,
                    "analytics_enabled": true,
                    "schema_version": 2  // Bump version
                }
            },
            None,
        )
        .await?;

    Ok(())
}
