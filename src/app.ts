import express, { Request, Response } from "express";
import morgan from "morgan";

import healthRouter from "./routes/health.js";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// Routes
app.use("/health", healthRouter);

app.get("/", (req: Request, res: Response) => {
  res.json({ name: "playable-ads-backend", status: "ok" });
});

export default app;
