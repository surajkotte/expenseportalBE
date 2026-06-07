import { Queue } from "bullmq";
import Redis from "ioredis";
import dotenv from "dotenv";
dotenv.config();
export const redisConnection = new Redis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: null,
});

export const extractionQueue = new Queue("ExpensesExtractionQueue", { connection: redisConnection });

// export const batchSweeperQueue = new Queue("BatchSweeperQueue", { connection: redisConnection });

// batchSweeperQueue.add(
//   "sweep-and-push",
//   {},
//   { repeat: { pattern: "*/1 * * * *" } } // Cron syntax for every 15 minutes
// );