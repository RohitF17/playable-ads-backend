import { Request, Response } from "express";
import bcrypt from "bcrypt";
import prisma from "../utils/prisma-client.js";
import { signToken } from "../utils/jwt.js";

export async function register(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    console.log({ email, password });

    if (!email || !password) {
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
    res.status(201).json({ token });
  } catch (error) {
    // Handle potential unique constraint violation for email
    console.error("Error", error);
    res.status(500).json({ message: "Error creating user", error });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      console.error("Password invalid");
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = signToken({ id: user.id });
    res.status(200).json({ token });
  } catch (error) {
    console.error("error logging in ");
    res.status(500).json({ message: "Error logging in", error });
  }
}
