import express, { Request, Response } from "express";
import morgan from "morgan";
import swaggerSpec from "./swagger.js";
import healthRouter from "./routes/health.js";
import swaggerUi from "swagger-ui-express";
import authRouter from "./routes/auth.js";
import projectRouter from "./routes/project.js";
import jobRouter from "./routes/job.js";
import analyticsRouter from "./routes/analytics.js";
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
// Routes
app.use("/health", healthRouter);
app.use("/auth", authRouter);
app.use("/projects", projectRouter);
app.use("/job", jobRouter);
app.use("/analytics", analyticsRouter);

app.get("/", (req: Request, res: Response) => {
  res.json({ name: "playable-ads-backend", status: "ok" });
});

export default app;
