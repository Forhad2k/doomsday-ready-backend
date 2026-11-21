import "dotenv/config";

export const config = {
  port: parseInt(process.env["PORT"] || "5000", 10),
  nodeEnv: process.env["NODE_ENV"] || "development",
  databaseUrl:
    process.env["DATABASE_URL"] ||
    "postgresql://postgres:1234@localhost:5432/doomsday_ready?schema=public",
  frontendUrl: process.env["FRONTEND_URL"] || "http://localhost:3000",
};
