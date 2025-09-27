import amqp from "amqplib";
import prisma from "./utils/prisma-client.js";
import { exec } from "child_process";
import path from "path";
import fs from "fs/promises";
import { v4 as uuidv4 } from "uuid";
import { setJobStatus } from "./models/job.js";
import logger from "./utils/logger.js";

import { downloadFromS3, uploadBufferToS3 } from "./services/s3.js";
import { JobStatus } from "@prisma/client";

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost";
const RENDER_QUEUE = "render_jobs";
const TEMP_DIR = path.join(process.cwd(), "temp");

const ensureTempDir = async () => {
  try {
    await fs.mkdir(TEMP_DIR, { recursive: true });
    logger.info(`Temp directory created at: ${TEMP_DIR}`, "WORKER");
  } catch (error) {
    logger.error("Failed to create temp directory", "WORKER", error, {
      tempDir: TEMP_DIR,
    });
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
      const fontPath = process.env.FFMPEG_FONT_PATH;
      logger.info(`Font path: ${fontPath}`, "WORKER");

      const drawtextFilter = `drawtext=text='rohit-copy':x=w-tw-10:y=h-th-10:fontsize=30:fontcolor=black@0.7:fontfile=${fontPath}`;
      const command = `ffmpeg -i ${localInputPath} -vf "${drawtextFilter}" -y -vcodec libx264 -crf 28 ${localOutputPath}`;

      logger.info(`Starting FFmpeg processing`, "WORKER", { jobId, command });
      exec(command, (error, stdout, stderr) => {
        if (error) {
          logger.error(`FFmpeg processing failed`, "WORKER", error, {
            jobId,
            stderr,
          });
          return reject(new Error(stderr));
        }
        logger.info(`FFmpeg processing completed successfully`, "WORKER", {
          jobId,
        });
        resolve();
      });
    } catch (error) {
      logger.error("FFmpeg execution error", "WORKER", error, { jobId });
      reject(error);
    }
  });
};

const startWorker = async () => {
  logger.info("Worker is starting...", "WORKER");
  await ensureTempDir();

  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();
    await channel.assertQueue(RENDER_QUEUE, { durable: true });
    channel.prefetch(1);

    logger.info("Worker connected to RabbitMQ, waiting for jobs", "WORKER", {
      queue: RENDER_QUEUE,
    });

    channel.consume(
      RENDER_QUEUE,
      async (msg) => {
        if (msg === null) return;

        let localInputPath: string | null = null;
        let localOutputPath: string | null = null;

        const { jobId, assetPath } = JSON.parse(msg.content.toString());
        logger.info(`Received render job`, "WORKER", { jobId, assetPath });

        try {
          await setJobStatus(jobId, {
            status: JobStatus.PROCESSING,
            attempts: { increment: 1 },
          });

          const fileExtension = path.extname(assetPath);
          const baseName = path.basename(assetPath, fileExtension);

          localInputPath = path.join(
            TEMP_DIR,
            `${baseName}_${uuidv4()}_input${fileExtension}`
          );
          localOutputPath = path.join(
            TEMP_DIR,
            `${baseName}_${uuidv4()}_output.mp4`
          );

          logger.info(`Downloading asset from S3`, "WORKER", {
            jobId,
            assetPath,
          });
          const inputBuffer = await downloadFromS3(assetPath);
          await fs.writeFile(localInputPath, inputBuffer);
          logger.info(`Asset saved locally`, "WORKER", {
            jobId,
            localInputPath,
          });

          await executeFfmpegRender(localInputPath, localOutputPath, jobId);

          // --- S3 UPLOAD AND DB UPDATE ---
          const outputBuffer = await fs.readFile(localOutputPath);
          const outputS3Key = `projects/rendered/${jobId}_compressed_output.mp4`;

          logger.info(`Uploading result to S3`, "WORKER", {
            jobId,
            outputS3Key,
          });
          const { s3Url: outputUrl } = await uploadBufferToS3(
            outputBuffer,
            outputS3Key,
            "video/mp4" // Set content type for MP4
          );

          await setJobStatus(jobId, {
            status: JobStatus.DONE,
            outputUrl: outputUrl,
          });

          logger.info(`Job completed successfully`, "WORKER", {
            jobId,
            outputUrl,
          });
        } catch (error: any) {
          await setJobStatus(
            jobId,
            { status: JobStatus.FAILED },
            error.message
          );
          logger.error(`Job failed`, "WORKER", error, { jobId });
        } finally {
          // --- CLEANUP ---
          if (localInputPath) {
            await fs.unlink(localInputPath).catch((err) =>
              logger.warn(`Could not delete input temp file`, "WORKER", {
                jobId,
                localInputPath,
                error: err.message,
              })
            );
          }
          if (localOutputPath) {
            await fs.unlink(localOutputPath).catch((err) =>
              logger.warn(`Could not delete output temp file`, "WORKER", {
                jobId,
                localOutputPath,
                error: err.message,
              })
            );
          }
          logger.info(`Local files cleaned up`, "WORKER", { jobId });

          channel.ack(msg);
          logger.info(`Message acknowledged`, "WORKER", { jobId });
        }
      },
      { noAck: false }
    );
  } catch (error) {
    logger.error(
      "Worker failed to start or connect to RabbitMQ",
      "WORKER",
      error
    );
    setTimeout(startWorker, 5000);
  }
};

startWorker();
