import swaggerJsdoc from "swagger-jsdoc";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

// Recreate __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Detect if running from TS or compiled JS
const isTs = __filename.endsWith(".ts");

const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Playable Ads Backend API",
      version: "1.0.0",
      description:
        "API documentation for the Playable Ads Backend service. This API handles user authentication, project management, asset uploads, rendering jobs, and analytics tracking.",
    },
    servers: [
      {
        url: "/",
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description:
            "JWT token obtained from /auth/login or /auth/register endpoints",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [
    // If running TS (dev), point to src/*.ts, else point to dist/*.js
    path.join(__dirname, isTs ? "./routes/*.ts" : "./routes/*.js"),
  ],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

export default swaggerSpec;
