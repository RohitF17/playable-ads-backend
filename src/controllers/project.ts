import { Request, Response } from "express";
import { publishRenderJob } from "../services/rabbitmq.js";
import { uploadToS3 } from "../services/s3.js";
import { postProject } from "../models/project.js";
import { createAsset, getAsset } from "../models/assets.js";
import { createJob } from "../models/job.js";
import { AssetType, JobStatus } from "@prisma/client";
import logger from "../utils/logger.js";
// POST /projects
export const createProject = async (req: Request, res: Response) => {
  try {
    const { title, description } = req.body;
    const userId = req.user!.id; // Available from the 'protect' middleware

    if (!title || !description) {
      logger.warn("Missing required fields for project creation", "PROJECT", {
        title,
        description,
        userId,
      });
      return res
        .status(400)
        .json({ message: "Title and description are required" });
    }

    const projectData = await postProject(title, description, userId);
    if (!projectData) {
      logger.error(
        "Project creation returned undefined",
        "PROJECT",
        new Error("Project creation failed"),
        { userId, title }
      );
      return res.status(500).json({ message: "Error creating project" });
    }
    logger.info("Project created successfully", "PROJECT", {
      projectId: projectData.id,
      userId,
      title,
    });
    res.status(201).json(projectData);
  } catch (error) {
    logger.error("Error creating project", "PROJECT", error, {
      userId: req.user?.id,
      title: req.body?.title,
    });
    res.status(500).json({
      message: "Error creating project",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// POST /projects/:id/assets
export const uploadAsset = async (req: Request, res: Response) => {
  try {
    const { id: projectId } = req.params;
    const file = req.file;

    if (!file) {
      logger.warn("No file uploaded", "ASSET", { projectId });
      return res.status(400).json({ message: "No file uploaded" });
    }

    if (!projectId) {
      logger.warn("Missing project ID for asset upload", "ASSET");
      return res.status(400).json({ message: "Project ID is required" });
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
      s3Path: s3Result.s3Url, // Store the S3 key/path
    };

    const asset = await createAsset(data);
    logger.info("Asset uploaded to S3 successfully", "ASSET", {
      assetId: asset.id,
      projectId,
      filename: file.originalname,
      size: file.size,
      s3Path: s3Result.s3Url,
    });

    // Return asset data with S3 URL
    res.status(201).json({ id: asset.id, s3Path: asset.s3Path });
  } catch (error) {
    logger.error("Error uploading asset", "ASSET", error, {
      projectId: req.params.id,
      filename: req.file?.originalname,
    });
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

    if (!assetId) {
      logger.warn("Missing asset ID for render job", "RENDER", { projectId });
      return res.status(400).json({ message: "Asset ID is required" });
    }

    const asset = await getAsset(assetId);
    if (!asset || asset.projectId !== projectId) {
      logger.warn("Asset not found or doesn't belong to project", "RENDER", {
        assetId,
        projectId,
        assetProjectId: asset?.projectId,
      });
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

    logger.info("Render job enqueued successfully", "RENDER", {
      jobId: job.id,
      projectId,
      assetId,
      assetPath: asset.s3Path,
    });

    res.status(202).json({ message: "Render job enqueued", jobId: job.id });
  } catch (error) {
    logger.error("Error enqueuing render job", "RENDER", error, {
      projectId: req.params.id,
      assetId: req.body?.assetId,
    });
    res.status(500).json({
      message: "Error enqueuing render job",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
