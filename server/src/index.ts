import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDB } from "./db/connection.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { tweetRoutes } from "./modules/tweet/tweet.routes.js";
import { errorHandler } from "./middleware/error-handler.js";

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;

async function main(): Promise<void> {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use("/api/auth", authRoutes);
  app.use("/api/tweets", tweetRoutes);

  app.use(errorHandler);

  await connectDB();

  app.listen(PORT, (): void => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
