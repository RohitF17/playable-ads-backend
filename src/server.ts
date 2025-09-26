import app from "./app.js";
// import { initPrisma } from "./utils/prisma-client.js";
import { connectRabbitMQ } from "./services/rabbitmq.js";

const PORT = process.env.PORT || 8000;

async function start() {
  await connectRabbitMQ();
  // await initPrisma();
  app.listen(PORT, () => {
    console.log(`🚀 Server listening at http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server", err);
  process.exit(1);
});
