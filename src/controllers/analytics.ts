import { Request, Response } from "express";
import { createAnalytics } from "../models/analytics.js";
import logger from "../utils/logger.js";

// POST /analytics
export const logEvent = async (req: Request, res: Response) => {
  try {
    const { projectId, eventType, payload } = req.body;

    if (!projectId || !eventType) {
      logger.warn("Missing required fields for analytics event", "ANALYTICS", {
        projectId: !!projectId,
        eventType: !!eventType,
      });
      return res
        .status(400)
        .json({ message: "Project ID and event type are required" });
    }

    let data = {
      projectId,
      eventType,
      payload,
    };

    await createAnalytics(data);
    logger.info("Analytics event logged successfully", "ANALYTICS", {
      projectId,
      eventType,
    });

    res.sendStatus(202); // Accepted
  } catch (error) {
    logger.error("Error logging analytics event", "ANALYTICS", error, {
      projectId: req.body?.projectId,
      eventType: req.body?.eventType,
    });
    res.status(500).json({
      message: "Error logging event",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
