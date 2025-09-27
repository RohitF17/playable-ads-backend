import prisma from "../utils/prisma-client.js";
import { Job, JobStatus } from "@prisma/client";
import logger from "../utils/logger.js";

interface createJobData {
  projectId: string;
  assetId: string;
  status: JobStatus;
}
interface setJobData {
  status: JobStatus;
  attempts?: any;
  outputUrl?: string;
}
export async function createJob(data: createJobData) {
  try {
    const job = await prisma.job.create({
      data: {
        projectId: data.projectId,
        assetId: data.assetId,
        status: data.status,
      },
    });
    logger.info("Job created successfully", "DATABASE", {
      jobId: job.id,
      projectId: data.projectId,
      assetId: data.assetId,
      status: data.status,
    });
    return job;
  } catch (error) {
    logger.error("Error creating job", "DATABASE", error, {
      projectId: data.projectId,
      assetId: data.assetId,
      status: data.status,
    });
    throw error;
  }
}

export async function getJob(jobId: string) {
  try {
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      logger.warn("Job not found", "DATABASE", { jobId });
    } else {
      logger.debug("Job retrieved successfully", "DATABASE", {
        jobId,
        status: job.status,
      });
    }
    return job;
  } catch (error) {
    logger.error("Error retrieving job", "DATABASE", error, { jobId });
    throw error;
  }
}

export async function setJobStatus(
  jobId: string,
  data: setJobData,
  error?: any // error is optional
) {
  // 1. Prepare the base data object for the Prisma update
  const updateData: any = {
    status: data.status,
    outputUrl: data.outputUrl,
    attempts: data.attempts,
    // Start with error set to null/undefined, will be overwritten if failing
    error: undefined,
  };

  // 2. Conditionally include the error message
  if (data.status === "FAILED" && error && error.message) {
    updateData.error = String(error.message);
  }

  try {
    // 3. Execute the update with the conditionally prepared data
    await prisma.job.update({
      where: { id: jobId },
      data: updateData,
    });
    logger.info("Job status updated successfully", "DATABASE", {
      jobId,
      status: data.status,
      outputUrl: data.outputUrl,
    });
  } catch (dbError: any) {
    // 4. Log the database update failure (separate from the job failure)
    logger.error(
      "Failed to update job status in database",
      "DATABASE",
      dbError,
      { jobId, status: data.status }
    );
    // Log the original job status data for context, if available
    if (error) {
      logger.error("Original job error (if any)", "DATABASE", error, { jobId });
    }
    throw dbError; // Re-throw the database error to halt the worker process
  }
}
