import amqp from "amqplib";

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
      console.log("✅ RabbitMQ connected and queue asserted");
    }
  } catch (error) {
    console.error("❌ Failed to connect to RabbitMQ", error);
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
    throw new Error("RabbitMQ channel is not available.");
  }
  channel.sendToQueue(RENDER_QUEUE, Buffer.from(JSON.stringify(job)), {
    persistent: true, // Ensure message survives broker restart
  });
  console.log(`Sent job ${job.jobId} to queue`);
};
