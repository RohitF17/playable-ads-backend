import { Request, Response } from "express";
import { getJob } from "../models/job.js";

// GET /jobs/:id
export const getJobStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const job = await getJob(id);

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }
    res.status(200).json({
      id: job.id,
      status: job.status,
      outputUrl: job.outputUrl,
      error: job.error,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching job status", error });
  }
};
