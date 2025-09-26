import prisma from "../utils/prisma-client.js";
import { EventType } from "@prisma/client";
interface createAnalyticsData {
  projectId: string;
  eventType: EventType;
  payload: {};
}
export async function createAnalytics(data: createAnalyticsData) {
  try {
    const analytics = await prisma.analyticsEvent.create({
      data: {
        projectId: data.projectId,
        eventType: data.eventType,
        payload: data.payload || {},
      },
    });
  } catch (error) {
    throw error;
  }
}
