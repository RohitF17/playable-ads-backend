import prisma from "../utils/prisma-client.js";
import { Job, JobStatus } from "@prisma/client";

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
    return job;
  } catch (error) {
    console.error("Error");
    throw error;
  }
}

export async function getJob(jobId: string) {
  try {
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    return job;
  } catch (error) {
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
  } catch (dbError: any) {
    // 4. Log the database update failure (separate from the job failure)
    console.error(
      `❌ Failed to update job status for ID ${jobId} in DB:`,
      dbError
    );
    // Log the original job status data for context, if available
    if (error) {
      console.error("Original job error (if any):", error.message || error);
    }
    throw dbError; // Re-throw the database error to halt the worker process
  }
}
