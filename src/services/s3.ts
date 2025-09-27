import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  ObjectCannedACL,
} from "@aws-sdk/client-s3";
// import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import logger from "../utils/logger.js";

// Configure AWS SDK v3
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || "playable-ads-assets";

export interface S3UploadResult {
  s3Path: string;
  s3Url: string;
  key: string;
}

export async function uploadToS3(
  file: Express.Multer.File,
  projectId: string
): Promise<S3UploadResult> {
  try {
    if (!file.path) {
      const error = new Error(
        `Upload aborted: File '${file.originalname}' is missing path.`
      );
      logger.error("File upload failed - missing path", "S3", error, {
        filename: file.originalname,
        projectId,
      });
      throw error;
    }

    const fileExtension = path.extname(file.originalname);
    const uniqueFilename = `${uuidv4()}${fileExtension}`;

    const s3Key = `projects/${projectId}/assets/${uniqueFilename}`;

    const fileStream = fs.createReadStream(file.path);
    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: fileStream,
      ContentLength: file.size, // 💡 BEST PRACTICE: Explicitly set ContentLength
      ContentType: file.mimetype,
      ACL: ObjectCannedACL.public_read,
      Metadata: {
        "original-name": file.originalname,
        "project-id": projectId,
        "upload-timestamp": new Date().toISOString(),
      },
    };

    const command = new PutObjectCommand(uploadParams);
    await s3Client.send(command);
    fs.unlinkSync(file.path);
    const s3Url = `https://${BUCKET_NAME}.s3.${
      process.env.AWS_REGION || "us-east-1"
    }.amazonaws.com/${s3Key}`;

    logger.info("File uploaded to S3 successfully", "S3", {
      s3Key,
      projectId,
      filename: file.originalname,
      size: file.size,
    });

    return {
      s3Path: s3Key,
      s3Url: s3Url,
      key: s3Key,
    };
  } catch (error) {
    logger.error("Error uploading to S3", "S3", error, {
      projectId,
      filename: file.originalname,
    });
    throw new Error(
      `Failed to upload file to S3: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

function streamToBuffer(stream: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

export async function downloadFromS3(s3Key: string): Promise<Buffer> {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
    });

    const response = await s3Client.send(command);

    if (response.Body) {
      // Use the helper to convert the ReadableStream to a Buffer
      const buffer = await streamToBuffer(response.Body);
      logger.info("File downloaded from S3 successfully", "S3", {
        s3Key,
        size: buffer.length,
      });
      return buffer;
    }

    const error = new Error("S3 GetObject response body was null.");
    logger.error("S3 download failed - null response body", "S3", error, {
      s3Key,
    });
    throw error;
  } catch (error) {
    logger.error("Error downloading from S3", "S3", error, { s3Key });
    throw new Error(
      `Failed to download file from S3: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

export async function uploadBufferToS3(
  fileBuffer: Buffer,
  s3Key: string,
  contentType: string
): Promise<{ s3Path: string; s3Url: string }> {
  try {
    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: fileBuffer,
      ContentType: contentType,
      ACL: ObjectCannedACL.public_read,
    };

    const command = new PutObjectCommand(uploadParams);
    await s3Client.send(command);

    const s3Url = `https://${BUCKET_NAME}.s3.${
      process.env.AWS_REGION || "us-east-1"
    }.amazonaws.com/${s3Key}`;

    logger.info("Buffer uploaded to S3 successfully", "S3", {
      s3Key,
      contentType,
      size: fileBuffer.length,
    });

    return {
      s3Path: s3Key,
      s3Url: s3Url,
    };
  } catch (error) {
    logger.error("Error uploading buffer to S3", "S3", error, {
      s3Key,
      contentType,
    });
    throw new Error(
      `Failed to upload buffer to S3: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
