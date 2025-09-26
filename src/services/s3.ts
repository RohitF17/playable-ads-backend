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
      throw new Error(
        `Upload aborted: File '${file.originalname}' is missing path.`
      );
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

    return {
      s3Path: s3Key,
      s3Url: s3Url,
      key: s3Key,
    };
  } catch (error) {
    console.error("Error uploading to S3:", error);
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
      return streamToBuffer(response.Body);
    }

    throw new Error("S3 GetObject response body was null.");
  } catch (error) {
    console.error("Error downloading from S3:", error);
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

    return {
      s3Path: s3Key,
      s3Url: s3Url,
    };
  } catch (error) {
    console.error("Error uploading buffer to S3:", error);
    throw new Error(
      `Failed to upload buffer to S3: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

// /**
//  * Delete a file from Amazon S3
//  * @param s3Key - The S3 key (path) of the file to delete
//  * @returns Promise with deletion result
//  */
// export async function deleteFromS3(s3Key: string): Promise<boolean> {
//   try {
//     const deleteParams = {
//       Bucket: BUCKET_NAME,
//       Key: s3Key,
//     };

//     const command = new DeleteObjectCommand(deleteParams);
//     await s3Client.send(command);
//     return true;
//   } catch (error) {
//     console.error("Error deleting from S3:", error);
//     throw new Error(`Failed to delete file from S3: ${error.message}`);
//   }
// }

// /**
//  * Get a signed URL for private file access (if needed)
//  * @param s3Key - The S3 key (path) of the file
//  * @param expiresIn - URL expiration time in seconds (default: 1 hour)
//  * @returns Promise with signed URL
//  */
// export async function getSignedUrl(
//   s3Key: string,
//   expiresIn: number = 3600
// ): Promise<string> {
//   try {
//     const command = new GetObjectCommand({
//       Bucket: BUCKET_NAME,
//       Key: s3Key,
//     });

//     return await getSignedUrl(s3Client, command, { expiresIn });
//   } catch (error) {
//     console.error("Error generating signed URL:", error);
//     throw new Error(`Failed to generate signed URL: ${error.message}`);
//   }
// }
