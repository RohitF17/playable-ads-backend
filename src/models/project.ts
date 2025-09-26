import prisma from "../utils/prisma-client.js";

export async function postProject(
  title: string,
  description: string,
  userId: string
) {
  try {
    const project = await prisma.project.create({
      data: { title, description, userId },
    });
    return project;
  } catch (error) {
    console.error("error", error);
  }
}
