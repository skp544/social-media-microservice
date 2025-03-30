require("dotenv").config();
const connectDB = require("./config/database");
const logger = require("./utils/logger");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { RateLimiterRedis } = require("rate-limiter-flexible");
const Redis = require("ioredis");
const { rateLimit } = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const identityRoutes = require("./routes/identity-service");
const errorHandler = require("./middlewares/error-handler");

const app = express();
connectDB();

const redisClient = new Redis(process.env.REDIS_URL);

// middlrwarews
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  logger.info(`Received ${req.method} request to ${req.url}`);
  logger.info(`Request body: ${JSON.stringify(req.body)}`);
  next();
});

//DDOS protection

const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: "middleware",
  points: 10,
  duration: 1,
});

app.use((req, res, next) => {
  rateLimiter
    .consume(req.ip)
    .then(() => next())
    .catch(() => {
      logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
      res.status(429).json({
        success: false,
        message: "Too many requests, please try again later.",
      });
    });
});

/// IP based rate limiting for sensitive endpoints

const sensitiveRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Sensitive endpoint rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: "Too many requests, please try again later.",
    });
  },
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
});

// Sensitive endpoints

app.use("/api/auth/register", sensitiveRateLimiter);

app.use("/api/auth", identityRoutes);

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  logger.info(`Identity service is running on port ${PORT}`);
});

// unhandled promise

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "Reason:", reason);
  // Application specific logging, throwing an error, or other logic here
  process.exit(1); // Exit process with failure
});
