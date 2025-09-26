import { Router } from "express";
import multer from "multer";
import { protect } from "../middleware/auth.js";
import {
  createProject,
  uploadAsset,
  enqueueRender,
} from "../controllers/project.js";

// Configure Multer for file uploads
const upload = multer({ dest: "uploads/" });

const router = Router();

router.use(protect); // All project routes are protected

/**
 * @swagger
 * /projects:
 *   post:
 *     summary: Create a new project
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *                 example: My Playable Ad
 *                 description: Project title
 *               description:
 *                 type: string
 *                 example: A creative playable ad for mobile games
 *                 description: Project description
 *     responses:
 *       201:
 *         description: Project created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   example: "123e4567-e89b-12d3-a456-426614174000"
 *                 title:
 *                   type: string
 *                   example: My Playable Ad
 *                 description:
 *                   type: string
 *                   example: A creative playable ad for mobile games
 *                 userId:
 *                   type: string
 *                   example: "123e4567-e89b-12d3-a456-426614174001"
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                   example: "2023-01-01T00:00:00.000Z"
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       500:
 *         description: Internal server error
 */
router.post("/", createProject);

/**
 * @swagger
 * /projects/{id}/assets:
 *   post:
 *     summary: Upload an asset to a project
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - asset
 *             properties:
 *               asset:
 *                 type: string
 *                 format: binary
 *                 description: Asset file (image or video)
 *     responses:
 *       201:
 *         description: Asset uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   example: "123e4567-e89b-12d3-a456-426614174002"
 *                 filename:
 *                   type: string
 *                   example: "hero-video.mp4"
 *                 mime:
 *                   type: string
 *                   example: "video/mp4"
 *                 size:
 *                   type: integer
 *                   example: 1024000
 *                 type:
 *                   type: string
 *                   enum: [VIDEO, IMAGE]
 *                   example: VIDEO
 *                 s3Path:
 *                   type: string
 *                   example: "projects/123e4567-e89b-12d3-a456-426614174000/assets/abc123-def456.mp4"
 *                 s3Url:
 *                   type: string
 *                   example: "https://playable-ads-assets.s3.us-east-1.amazonaws.com/projects/123e4567-e89b-12d3-a456-426614174000/assets/abc123-def456.mp4"
 *                   description: Public URL to access the uploaded file
 *                 projectId:
 *                   type: string
 *                   example: "123e4567-e89b-12d3-a456-426614174000"
 *       400:
 *         description: Bad request - no file uploaded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: No file uploaded
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       500:
 *         description: Internal server error
 */
router.post("/:id/assets", upload.single("asset"), uploadAsset); // 'asset' is the field name in the form-data

/**
 * @swagger
 * /projects/{id}/render:
 *   post:
 *     summary: Enqueue a render job for a project asset
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - assetId
 *             properties:
 *               assetId:
 *                 type: string
 *                 example: "123e4567-e89b-12d3-a456-426614174002"
 *                 description: ID of the asset to render
 *     responses:
 *       202:
 *         description: Render job enqueued successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Render job enqueued
 *                 jobId:
 *                   type: string
 *                   example: "123e4567-e89b-12d3-a456-426614174003"
 *       404:
 *         description: Asset not found in this project
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Asset not found in this project
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       500:
 *         description: Internal server error
 */
router.post("/:id/render", enqueueRender);

export default router;
