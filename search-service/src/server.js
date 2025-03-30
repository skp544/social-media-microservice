require("dotenv").config();
const express = require("express");
const connectDB = require("./config/database");
const logger = require("./utils/logger");
const helmet = require("helmet");
const cors = require("cors");
const errorHandler = require("./middlewares/error-handler");
const Redis = require("ioredis");
const { connectRabbitMQ, consumeEvent } = require("./utils/rabbitmq");
const searchRoute = require("./routes/search-route");
const {
  handlePostCreated,
  handlePostDeleted,
} = require("./eventHandlers/search-event-handler");

const app = express();
const PORT = process.env.PORT || 3004;

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

app.use("/api/search", searchRoute);

app.use(errorHandler);

async function startServer() {
  try {
    await connectRabbitMQ();
    await consumeEvent("post.created", handlePostCreated);
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
