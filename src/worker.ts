import amqp from "amqplib";
import prisma from "./utils/prisma-client.js";
import { exec } from "child_process";
import path from "path";
import fs from "fs/promises";
import { v4 as uuidv4 } from "uuid";
import { setJobStatus } from "./models/job.js";

import { downloadFromS3, uploadBufferToS3 } from "./services/s3.js";
import { JobStatus } from "@prisma/client";

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost";
const RENDER_QUEUE = "render_jobs";
const TEMP_DIR = path.join(process.cwd(), "temp"); // Local temp directory

// Ensure the temporary directory exists upon worker startup
const ensureTempDir = async () => {
  try {
    await fs.mkdir(TEMP_DIR, { recursive: true });
    console.log(`Temp directory created at: ${TEMP_DIR}`);
  } catch (error) {
    console.error("Failed to create temp directory:", error);
    // Worker should not proceed without temp storage
    throw error;
  }
};

const executeFfmpegRender = (
  localInputPath: string,
  localOutputPath: string,
  jobId: string
): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      // Example FFmpeg command: compress the video
      const command = `ffmpeg -i ${localInputPath} -y -vcodec libx264 -crf 28 ${localOutputPath}`;

      //   command = ffmpeg -analyzeduration 2147483647 -probesize 2147483647 -i [INPUT_PATH] -y -vcodec libx264 -crf 28 [OUTPUT_PATH]

      console.log(`🎬 [${jobId}] Starting FFmpeg: ${command}`);
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`❌ [${jobId}] FFmpeg error:`, stderr);
          return reject(new Error(stderr));
        }
        console.log(`✅ [${jobId}] FFmpeg finished successfully.`);
        resolve();
      });
    } catch (error) {
      console.error("errors", error);
    }
  });
};

const startWorker = async () => {
  console.log("Worker is starting...");
  await ensureTempDir(); // Ensure temp storage exists

  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();
    await channel.assertQueue(RENDER_QUEUE, { durable: true });
    channel.prefetch(1);

    console.log("... waiting for jobs in queue:", RENDER_QUEUE);

    channel.consume(
      RENDER_QUEUE,
      async (msg) => {
        if (msg === null) return;

        // Use a flag to track if we need to clean up local files
        let localInputPath: string | null = null;
        let localOutputPath: string | null = null;

        const { jobId, assetPath } = JSON.parse(msg.content.toString());
        console.log(`\nRECEIVED job: ${jobId}`);

        try {
          // 1. Update status to PROCESSING
          await setJobStatus(jobId, {
            status: JobStatus.PROCESSING,
            attempts: { increment: 1 },
          });

          // --- S3 DOWNLOAD AND LOCAL PREP ---
          const fileExtension = path.extname(assetPath);
          const baseName = path.basename(assetPath, fileExtension);

          localInputPath = path.join(
            TEMP_DIR,
            `${baseName}_${uuidv4()}_input${fileExtension}`
          );
          localOutputPath = path.join(
            TEMP_DIR,
            `${baseName}_${uuidv4()}_output.mp4`
          ); // FFmpeg output format

          console.log(`[${jobId}] Downloading asset from S3: ${assetPath}`);
          const inputBuffer = await downloadFromS3(assetPath);
          await fs.writeFile(localInputPath, inputBuffer);
          console.log(`[${jobId}] Asset saved locally: ${localInputPath}`); // 2. Execute the render job using local paths

          await executeFfmpegRender(localInputPath, localOutputPath, jobId);

          // --- S3 UPLOAD AND DB UPDATE ---
          const outputBuffer = await fs.readFile(localOutputPath);
          const outputS3Key = `projects/rendered/${jobId}_compressed_output.mp4`; // New S3 key for the rendered output

          console.log(`[${jobId}] Uploading result to S3: ${outputS3Key}`);
          const { s3Url: outputUrl } = await uploadBufferToS3(
            outputBuffer,
            outputS3Key,
            "video/mp4" // Set content type for MP4
          );

          await setJobStatus(jobId, {
            status: JobStatus.DONE,
            outputUrl: outputUrl,
          });

          console.log(`✅ Job ${jobId} finished. Output URL: ${outputUrl}`);
        } catch (error: any) {
          await setJobStatus(
            jobId,
            { status: JobStatus.FAILED },
            error.message
          );
          console.error(`❌ Job ${jobId} failed. Error:`, error);
        } finally {
          // --- CLEANUP ---
          if (localInputPath) {
            await fs
              .unlink(localInputPath)
              .catch((err) =>
                console.warn(
                  `Could not delete input temp file ${localInputPath}: ${err.message}`
                )
              );
          }
          if (localOutputPath) {
            await fs
              .unlink(localOutputPath)
              .catch((err) =>
                console.warn(
                  `Could not delete output temp file ${localOutputPath}: ${err.message}`
                )
              );
          }
          console.log(`[${jobId}] Local files cleaned up.`); // 5. Acknowledge the message was processed

          channel.ack(msg);
          console.log(`[${jobId}] Message Acknowledged.`);
        }
      },
      { noAck: false }
    );
  } catch (error) {
    console.error("Worker failed to start or connect to RabbitMQ", error);
    setTimeout(startWorker, 5000);
  }
};

startWorker();
