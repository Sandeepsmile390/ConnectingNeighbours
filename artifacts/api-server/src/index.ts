import app from "./app.js";
import { logger } from "./lib/logger.js";
import { db, sql } from "@workspace/db";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Verify database connection before starting the server
try {
  logger.info("Verifying database connection...");
  await db.execute(sql`SELECT 1`);
  logger.info("Database connection verified successfully.");
} catch (err) {
  logger.error({ err }, "Database connection failed! Ensure DATABASE_URL is correct and accessible.");
  process.exit(1);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
