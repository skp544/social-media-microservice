require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Redis = require('ioredis');
const helmet = require('helmet');
const {rateLimit} = require("express-rate-limit")
const {RedisStore} = require("rate-limit-redis")
const  logger = require("./utils/logger")
const  proxy = require("express-http-proxy")
const errorHandler = require("./middlewares/error-handler");


const app = express();
const PORT = process.env.PORT || 3000;

const redisClient = new Redis(process.env.REDIS_URL)

app.use(helmet());
app.use(cors());
app.use(express.json());

const rateLimitOptions = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 100,
	standardHeaders: true,
	legacyHeaders: false,
	handler: (req, res) => {
		logger.warn(`Sensitive endpoint rate limit exceeded for IP: ${req.ip}`);
		res.status(429).json({
			success: false,
			message: "Too many requests, please try again later.",
		});
	},
	store: new RedisStore({sendCommand: (...args) => redisClient.call(...args),
	}),
});


app.use(rateLimitOptions)

app.use((req, res, next) => {
	logger.info(`Received ${req.method} request to ${req.url}`);
	logger.info(`Request body: ${JSON.stringify(req.body)}`);
	next();
});

const proxyOptions = {
	proxyReqPathResolver: (req) => {
		return req.originalUrl.replace(/^\/v1/, "/api");
		
	},
	proxyErrorHandler : (err, res, next) => {
		logger.error(`Proxy error: ${err.message}`);
		res.status(500).json({
			success: false,
			message: "Internal Server Error",
			error: err.message,
		})
	}
}

// setings up proxy for all identity service

app.use("/v1/auth",proxy(process.env.IDENTITY_SERVER_URL, {
	...proxyOptions,
	proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
		proxyReqOpts.headers["Content-Type"] = "application/json";
		return proxyReqOpts;
	},
	userResDecorator:  (proxyRes, proxyResData, userReq, userRes) => {
		logger.info(`Response received from Identity service: ${proxyRes.statusCode}`);
		return proxyResData
	}
}))

app.use(errorHandler);

app.listen(PORT, () => {
	logger.info(`API Gateway is running on port ${PORT}`);
	logger.info(`Identity service is running on  ${process.env.IDENTITY_SERVER_URL}`);
	logger.info(`Redis URL is running ${process.env.REDIS_URL}`);
	
})





