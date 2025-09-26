import { Request, Response } from "express";
import { createAnalytics } from "../models/analytics.js";

// POST /analytics
export const logEvent = async (req: Request, res: Response) => {
  try {
    const { projectId, eventType, payload } = req.body;
    // await prisma.analyticsEvent.create({
    //   data: {
    //     projectId,
    //     eventType,
    //     payload: payload || {},
    //   },
    // });
    let data = {
      projectId,
      eventType,
      payload,
    };
    await createAnalytics(data);
    res.sendStatus(202); // Accepted
  } catch (error) {
    res.status(500).json({ message: "Error logging event", error });
  }
};
