import { Request, Response } from "express";
import { publishRenderJob } from "../services/rabbitmq.js";
import { uploadToS3 } from "../services/s3.js";
import { postProject } from "../models/project.js";
import { createAsset, getAsset } from "../models/assets.js";
import { createJob } from "../models/job.js";
import { AssetType, JobStatus } from "@prisma/client";
// POST /projects
export const createProject = async (req: Request, res: Response) => {
  try {
    const { title, description } = req.body;
    const userId = req.user!.id; // Available from the 'protect' middleware

    const projectData = await postProject(title, description, userId);
    console.log("Sucessfully Created Project");
    res.status(201).json(projectData);
  } catch (error) {
    res.status(500).json({ message: "Error creating project", error });
  }
};

// POST /projects/:id/assets
export const uploadAsset = async (req: Request, res: Response) => {
  try {
    const { id: projectId } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Upload file to S3
    const s3Result = await uploadToS3(file, projectId);

    let data = {
      projectId,
      filename: file.originalname,
      mime: file.mimetype,
      size: file.size,
      type: file.mimetype.startsWith("video")
        ? AssetType.VIDEO
        : AssetType.IMAGE,
      s3Path: s3Result.s3Path, // Store the S3 key/path
    };

    const asset = await createAsset(data);
    console.log("Asset uploaded to S3:", s3Result.s3Url);

    // Return asset data with S3 URL
    res.status(201).json({ id: asset.id, s3Path: asset.s3Path }); // s3Url: s3Result.s3Url, // Include the public S3 URL in response);
  } catch (error) {
    console.error("Error uploading asset:", error);
    res.status(500).json({
      message: "Error uploading asset",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// POST /projects/:id/render
export const enqueueRender = async (req: Request, res: Response) => {
  try {
    const { id: projectId } = req.params;
    const { assetId } = req.body; // Assume we get the asset ID to render

    const asset = await getAsset(assetId);
    if (!asset || asset.projectId !== projectId) {
      return res
        .status(404)
        .json({ message: "Asset not found in this project" });
    }

    const job = await createJob({
      projectId,
      assetId,
      status: JobStatus.PENDING,
    });
    // Publish the job to RabbitMQ
    publishRenderJob({ jobId: job.id, assetPath: asset.s3Path, projectId });

    res.status(202).json({ message: "Render job enqueued", jobId: job.id });
  } catch (error) {
    res.status(500).json({ message: "Error enqueuing render job", error });
    console.error("error", error);
  }
};
