import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt.js";
import prisma from "../utils/prisma-client.js";
import logger from "../utils/logger.js";

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string };
    }
  }
}

export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const bearer = req.headers.authorization;

  if (!bearer || !bearer.startsWith("Bearer ")) {
    logger.warn("Authentication failed - no bearer token", "AUTH", {
      hasAuth: !!req.headers.authorization,
      ip: req.ip,
    });
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }

  const [, token] = bearer.split(" ");

  if (!token) {
    logger.warn("Authentication failed - invalid token format", "AUTH", {
      ip: req.ip,
    });
    return res
      .status(401)
      .json({ message: "Unauthorized: Invalid token format" });
  }

  try {
    const payload = verifyToken(token);
    if (!payload) {
      logger.warn("Authentication failed - token verification failed", "AUTH", {
        ip: req.ip,
      });
      return res.status(401).json({ message: "Unauthorized: Invalid token" });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { id: true, email: true },
    });

    if (!user) {
      logger.warn("Authentication failed - user not found", "AUTH", {
        userId: payload.id,
        ip: req.ip,
      });
      return res.status(401).json({ message: "Unauthorized: User not found" });
    }

    req.user = user;
    logger.debug("Authentication successful", "AUTH", {
      userId: user.id,
      email: user.email,
    });
    next();
  } catch (error) {
    logger.error(
      "Authentication error - token verification failed",
      "AUTH",
      error,
      { ip: req.ip }
    );
    return res
      .status(401)
      .json({ message: "Unauthorized: Token verification failed" });
  }
};
