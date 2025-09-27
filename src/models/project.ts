import prisma from "../utils/prisma-client.js";
import logger from "../utils/logger.js";

export async function postProject(
  title: string,
  description: string,
  userId: string
) {
  try {
    const project = await prisma.project.create({
      data: { title, description, userId },
    });
    logger.info("Project created successfully", "DATABASE", {
      projectId: project.id,
      userId,
      title,
    });
    return project;
  } catch (error) {
    logger.error("Error creating project", "DATABASE", error, {
      userId,
      title,
    });
    throw error;
  }
}
