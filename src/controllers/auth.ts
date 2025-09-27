import { Request, Response } from "express";
import bcrypt from "bcrypt";
import prisma from "../utils/prisma-client.js";
import { signToken } from "../utils/jwt.js";
import logger from "../utils/logger.js";

export async function register(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      logger.warn("Missing email or password for registration", "AUTH", {
        email: !!email,
      });
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
      },
    });

    const token = signToken({ id: user.id });
    logger.info("User registered successfully", "AUTH", {
      userId: user.id,
      email,
    });
    res.status(201).json({ token });
  } catch (error: any) {
    // Handle potential unique constraint violation for email
    if (error.code === "P2002" && error.meta?.target?.includes("email")) {
      logger.warn("Registration failed - email already exists", "AUTH", {
        email: req.body?.email,
      });
      return res.status(409).json({ message: "Email already exists" });
    }

    logger.error("Error creating user", "AUTH", error, {
      email: req.body?.email,
    });
    res.status(500).json({
      message: "Error creating user",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      logger.warn("Missing email or password for login", "AUTH", {
        email: !!email,
      });
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      logger.warn("Login attempt with non-existent email", "AUTH", { email });
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      logger.warn("Login attempt with invalid password", "AUTH", {
        email,
        userId: user.id,
      });
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = signToken({ id: user.id });
    logger.info("User logged in successfully", "AUTH", {
      userId: user.id,
      email,
    });
    res.status(200).json({ token });
  } catch (error) {
    logger.error("Error during login", "AUTH", error, {
      email: req.body?.email,
    });
    res.status(500).json({
      message: "Error logging in",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
