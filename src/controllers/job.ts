import { Request, Response } from "express";
import { getJob } from "../models/job.js";
import logger from "../utils/logger.js";

// GET /jobs/:id
export const getJobStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      logger.warn("Missing job ID in request", "JOB", { params: req.params });
      return res.status(400).json({ message: "Job ID is required" });
    }
    logger.info("job details",id)

    const job = await getJob(id);

    if (!job) {
      logger.warn("Job not found", "JOB", { jobId: id });
      return res.status(404).json({ message: "Job not found" });
    }

    logger.info("Job status retrieved successfully", "JOB", {
      jobId: job.id,
      status: job.status,
    });

    res.status(200).json({
      id: job.id,
      status: job.status,
      outputUrl: job.outputUrl,
      error: job.error,
    });
  } catch (error) {
    logger.error("Error fetching job status", "JOB", error, {
      jobId: req.params.id,
    });
    res.status(500).json({
      message: "Error fetching job status",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
