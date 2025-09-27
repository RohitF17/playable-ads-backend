import app from "./app.js";
// import { initPrisma } from "./utils/prisma-client.js";
import { connectRabbitMQ } from "./services/rabbitmq.js";
import logger from "./utils/logger.js";

const PORT = process.env.PORT || 8000;

async function start() {
  await connectRabbitMQ();
  // await initPrisma();
  app.listen(PORT, () => {
    logger.info(`🚀 Server listening at http://localhost:${PORT}`, "SERVER");
  });
}

start().catch((err) => {
  logger.error("Failed to start server", "SERVER", err);
  process.exit(1);
});
