# 📘 MongoDB CLI Cheat Sheet (Using `mongosh`)

This guide provides essential MongoDB CLI commands using `mongosh`.

---

Connect to the MongoDB container
```bash
docker exec -it covenant-match-mongodb-1 mongosh
```

## 🛠 Getting Started

### Start the Mongo Shell

```bash
mongosh
```

## Database Operations

### Show all databases

```bash
show dbs
```

### Connect to a Specific Database

```bash
use <database_name>
```

### Show the current database

```bash
db
```

## Collection Operations

### Show all collections in the current database

```bash
show collections
```

### Show the current collection

```bash
db.getCollection('collection_name')
```

### Show all documents in the current collection

```bash
db.getCollection('collection_name').find()
```

### Create a new collection

```bash
db.createCollection("users")
```

### Insert a new document into the collection

```bash
db.users.insertOne({ name: "John", age: 30 })
```

### Drop a collection

```bash
db.users.drop()
```

## CRUD Operations

### Insert a new document into the collection

```bash
db.users.insertOne({ name: "Alice", age: 25 })
```

### Insert multiple documents into the collection

```bash
db.users.insertMany([
  { name: "Bob", age: 30 },
  { name: "Carol", age: 27 }
])
```

### Find all documents in the collection

```bash
db.users.find()
```

### Find documents with a specific filter

```bash
db.users.find({ age: { $gt: 25 } })
```

### Pretty print the results

```bash
db.users.find().pretty()
```

### Find one document in the collection

```bash
db.users.findOne({ name: "Alice" })
```

### Update a document in the collection

```bash
db.users.updateOne(
  { name: "Alice" },
  { $set: { age: 28 } }
)
```

### Update multiple documents in the collection

```bash
db.users.updateMany(
  { age: { $lt: 30 } },
  { $inc: { age: 1 } }
)
```

### Delete a document from the collection

```bash
db.users.deleteOne({ name: "Alice" })
```

### Delete multiple documents from the collection

```bash
db.users.deleteMany({ age: { $gt: 30 } })
```

## Extras & Admin

### Count documents in the collection

```bash
db.users.countDocuments()
```

### Show collection statistics

```bash
db.stats()
db.users.stats()
```

### Drop the current database

```bash
db.dropDatabase()
```

### Aggregate data

```bash
db.users.aggregate([
  { $group: { _id: "$age", count: { $sum: 1 } } },
  { $sort: { count: -1 } }
])
```

# Useful commands

```bash
db.sessions.find({ _id: ObjectId('67e80906364825d8d6ec4004')})
```







