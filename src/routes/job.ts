import { Router } from "express";
import { getJobStatus } from "../controllers/job.js";
import { protect } from "../middleware/auth.js";

const router = Router();

/**
 * @swagger
 * /jobs/{id}:
 *   get:
 *     summary: Get job status by ID
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Job ID
 *         example: "123e4567-e89b-12d3-a456-426614174003"
 *     responses:
 *       200:
 *         description: Job status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   example: "123e4567-e89b-12d3-a456-426614174003"
 *                   description: Job ID
 *                 status:
 *                   type: string
 *                   enum: [PENDING, PROCESSING, COMPLETED, FAILED]
 *                   example: COMPLETED
 *                   description: Current job status
 *                 outputUrl:
 *                   type: string
 *                   example: "https://s3.amazonaws.com/bucket/rendered-video.mp4"
 *                   description: URL of the rendered output (if completed)
 *                 error:
 *                   type: string
 *                   example: "Rendering failed due to invalid asset format"
 *                   description: Error message (if failed)
 *       404:
 *         description: Job not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Job not found
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Error fetching job status
 *                 error:
 *                   type: object
 */
router.get("/:id", protect, getJobStatus); // Protected to ensure users only check their own jobs (add extra logic for that)

export default router;
