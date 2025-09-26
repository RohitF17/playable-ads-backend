import { Router } from "express";
import { logEvent } from "../controllers/analytics.js";

const router = Router();

/**
 * @swagger
 * /analytics:
 *   post:
 *     summary: Log an analytics event
 *     tags: [Analytics]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - projectId
 *               - eventType
 *             properties:
 *               projectId:
 *                 type: string
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *                 description: ID of the project this event belongs to
 *               eventType:
 *                 type: string
 *                 example: "playable_started"
 *                 description: Type of analytics event
 *                 enum: [playable_started, playable_completed, playable_abandoned, click_through, conversion]
 *               payload:
 *                 type: object
 *                 example: {"duration": 15.5, "score": 85, "level": 3}
 *                 description: Additional event data
 *                 properties:
 *                   duration:
 *                     type: number
 *                     example: 15.5
 *                     description: Duration in seconds
 *                   score:
 *                     type: integer
 *                     example: 85
 *                     description: User score
 *                   level:
 *                     type: integer
 *                     example: 3
 *                     description: Level reached
 *     responses:
 *       202:
 *         description: Event logged successfully
 *       400:
 *         description: Bad request - missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Missing required fields
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Error logging event
 *                 error:
 *                   type: object
 */
router.post("/", logEvent);

export default router;
