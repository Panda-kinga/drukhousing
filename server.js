const app = require("./app");
const db = require("./config/db");
const { connectMongo, closeMongo } = require("./config/mongo");
const Feedback = require("./models/Feedback");

async function start() {
  for (const key of [
    "DB_HOST", "DB_NAME", "DB_USER", "DB_PASS", "MONGO_URI",
    "SESSION_SECRET", "GMAIL_USER", "GMAIL_APP_PASSWORD",
  ]) {
    if (!process.env[key] || process.env[key].startsWith("replace_"))
      throw new Error("Please set " + key + " in .env");
  }
  if (!process.env.BASE_URL)
    throw new Error("Please set BASE_URL in .env");
  await db.connect().then((connection) => connection.done());
  if (process.env.NODE_ENV !== "test") {
    await connectMongo();
    await Feedback.ensureIndexes();
  }
  return app.listen(process.env.PORT || 3000, "0.0.0.0", () =>
    console.log("DrukHousing: " + process.env.BASE_URL),
  );
}

if (require.main === module)
  start().catch(async (error) => {
    console.error("Startup failed:", error.message);
    await closeMongo();
    db.$pool.end();
    process.exitCode = 1;
  });

module.exports = { app, start };
