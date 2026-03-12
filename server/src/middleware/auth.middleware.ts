import type { Request, Response, NextFunction } from "express";
import { userRepository } from "../repositories.js";

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const userId: string | undefined = req.headers["x-user-id"] as
    | string
    | undefined;

  if (!userId) {
    res.status(401).json({ error: "Missing X-User-Id header" });
    return;
  }

  const user = await userRepository.findById(userId);
  if (!user) {
    res.status(401).json({ error: "Invalid user" });
    return;
  }

  req.userId = userId;
  next();
}

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}
