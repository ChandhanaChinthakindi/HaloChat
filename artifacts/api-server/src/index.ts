import app from "./app";
import { logger } from "./lib/logger";
import { startCheckinJob } from "./jobs/checkin";

const requiredEnv = [
  "OPENAI_API_KEY",
  "JWT_SECRET",
  "JWT_REFRESH_SECRET",
  "DATABASE_URL",
] as const;

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`${key} is required but was not set. Server will not start without it.`);
  }
}

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

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  startCheckinJob();
});
