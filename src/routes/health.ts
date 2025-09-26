import { Router, Request, Response } from "express";

const router = Router();

router.get("/", (req: Request, response: Response) => {
  response.json({ status: "ok", time: new Date().toISOString() });
});

export default router;
