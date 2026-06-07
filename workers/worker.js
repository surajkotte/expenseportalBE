import { Worker } from "bullmq";
import { v4 as uuidv4 } from "uuid";
import { redisConnection } from "../configurations/redisconnection.js";
import SQLFile from "../Database/SQLFile.js";
import { activeConnections } from "../utils/globalmap.js";
const extractionWorker = new Worker(
  "ExpensesExtractionQueue",
  async (job) => {
    console.log("in extraction worker");
    const response = await SQLFile.upload_to_ai(
      job.data.filename,
      job.data.contentType,
      job.data.filedata,
    );
    return {
      sessionId: job.data.sessionid, // We need this for routing!
      extracted_data: response,
    };
  },
  {
    connection: redisConnection,
    concurrency: 1,
  },
);
extractionWorker.on("completed", (job) => {
  console.log("in completed event");
  const returnValue = job.returnvalue;
  console.log(job.returnvalue);
  const userConnection = activeConnections.get(returnValue.sessionId);
  userConnection.write(
    `data: ${JSON.stringify(returnValue.extracted_data)}\n\n`,
  );
});

extractionWorker.on("failed", (job, err) => {
  console.log(`Extraction Job ${job.id} has failed with ${err.message}`);
});

export default extractionWorker;
