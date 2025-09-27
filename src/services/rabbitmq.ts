import amqp from "amqplib";
import logger from "../utils/logger.js";

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost";
const RENDER_QUEUE = "render_jobs";

let connection: any;
let channel: any;

export const connectRabbitMQ = async () => {
  try {
    if (!connection) {
      connection = await amqp.connect(RABBITMQ_URL);
      channel = await connection.createChannel();
      await channel.assertQueue(RENDER_QUEUE, { durable: true });
      logger.info("RabbitMQ connected and queue asserted", "RABBITMQ", {
        queue: RENDER_QUEUE,
      });
    }
  } catch (error) {
    logger.error("Failed to connect to RabbitMQ", "RABBITMQ", error, {
      url: RABBITMQ_URL,
    });
    // Implement retry logic if needed
    setTimeout(connectRabbitMQ, 5000);
  }
};

export const publishRenderJob = (job: {
  jobId: string;
  assetPath: string;
  projectId: string;
}) => {
  if (!channel) {
    const error = new Error("RabbitMQ channel is not available.");
    logger.error(
      "Failed to publish job - channel not available",
      "RABBITMQ",
      error,
      { jobId: job.jobId }
    );
    throw error;
  }

  try {
    channel.sendToQueue(RENDER_QUEUE, Buffer.from(JSON.stringify(job)), {
      persistent: true, // Ensure message survives broker restart
    });
    logger.info("Job published to queue successfully", "RABBITMQ", {
      jobId: job.jobId,
      projectId: job.projectId,
      queue: RENDER_QUEUE,
    });
  } catch (error) {
    logger.error("Failed to publish job to queue", "RABBITMQ", error, {
      jobId: job.jobId,
      projectId: job.projectId,
    });
    throw error;
  }
};
