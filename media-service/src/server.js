require("dotenv").config();
const express = require("express");
const cors = require("cors");
const logger = require("./utils/logger");
const errorHandler = require("./middlewares/error-handler");
const Redis = require("ioredis");
const connectDB = require("./config/database");
const helmet = require("helmet");
const mediaRoutes = require("./routes/media-route");
const { connectRabbitMQ, consumeEvent } = require("./utils/rabbitmq");
const { handlePostDeleted } = require("./eventHandlers/media-event-handlers");

const app = express();
const PORT = process.env.PORT || 3003;

connectDB();

const redisClient = new Redis(process.env.REDIS_URL);

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  logger.info(`Received request: ${req.method} request to  ${req.url}`);
  logger.info(`Request body: ${JSON.stringify(req.body)}`);
  next();
});

// implement

app.use("/api/media", mediaRoutes);

app.use(errorHandler);

async function startServer() {
  try {
    await connectRabbitMQ();
    await consumeEvent("post.deleted", handlePostDeleted);
    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
      logger.info(`Redis URL: ${process.env.REDIS_URL}`);
      logger.info(`MongoDB URL: ${process.env.MONGODB_URI}`);
    });
  } catch (e) {
    logger.error("Failed to connect to server");
    process.exit(1);
  }
}

startServer();

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "Reason:", reason);
  // Application specific logging, throwing an error, or other logic here
  process.exit(1); // Exit process with failure
});
