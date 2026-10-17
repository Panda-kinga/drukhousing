const { MongoClient } = require("mongodb");
let client;
let database;
let connecting;
async function connectMongo() {
  if (database) return database;
  if (!connecting) {
    client = new MongoClient(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    connecting = client
      .connect()
      .then(() => {
        database = client.db("drukhousing_feedback");
        return database;
      })
      .catch(async (error) => {
        await client.close();
        connecting = null;
        throw error;
      });
  }
  return connecting;
}
function getMongo() {
  if (!database) throw new Error("MongoDB has not connected.");
  return database;
}
async function closeMongo() {
  if (client) await client.close();
  database = null;
  connecting = null;
}
module.exports = { connectMongo, getMongo, closeMongo };
