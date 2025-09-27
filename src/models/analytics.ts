import prisma from "../utils/prisma-client.js";
import { EventType } from "@prisma/client";
import logger from "../utils/logger.js";
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
    logger.info("Analytics event created successfully", "DATABASE", {
      eventId: analytics.id,
      projectId: data.projectId,
      eventType: data.eventType,
    });
    return analytics;
  } catch (error) {
    logger.error("Error creating analytics event", "DATABASE", error, {
      projectId: data.projectId,
      eventType: data.eventType,
    });
    throw error;
  }
}
