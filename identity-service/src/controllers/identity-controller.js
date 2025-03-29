const logger = require("../utils/logger");
const { validateRegistration, validateLogin } = require("../utils/validation");
const User = require("../models/user-model");
const generateTokens = require("../utils/generate-tokens");
const RefreshToken = require("../models/refresh-token-model");

// user registratiom

/**
 * @desc User registration
 * @body {username, email, password}
 * @returns {message, success, accessToken, refreshToken}
 */

exports.registerUser = async (req, res) => {
  logger.info("Registration endpoint hit");
  try {
    const { error } = validateRegistration(req.body);

    if (error) {
      logger.warn("Validation error", error.details[0].message);
      return res
        .status(400)
        .json({ message: error.details[0].message, success: false });
    }

    const { username, email, password } = req.body;

    let user = await User.findOne({ $or: [{ username }, { email }] });

    if (user) {
      logger.warn("User already exists");
      return res
        .status(400)
        .json({ message: "User already exists", success: false });
    }

    user = new User({
      username,
      email,
      password,
    });

    await user.save();

    logger.info("User registered successfully", user._id);

    const { accessToken, refreshToken } = await generateTokens(user);
    return res.status(201).json({
      message: "User registered successfully",
      success: true,
      accessToken,
      refreshToken,
    });
  } catch (e) {
    logger.error("Registration error", e);
    return res.status(500).json({
      message: "Internal Server Error",
      success: false,
    });
  }
};

// user login

/**
 * @desc User login
 * @body {email, password}
 * @returns {message, success, accessToken, refreshToken}
 */

exports.loginUser = async (req, res) => {
  logger.info("Login endpoint hit");
  try {
    const { error } = validateLogin(req.body);

    if (error) {
      logger.warn("Validation error", error.details[0].message);
      return res
        .status(400)
        .json({ message: error.details[0].message, success: false });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      logger.warn("Invalid User");

      return res.status(400).json({
        success: false,
        message: "Invalid User",
      });
    }

    const isValidPassword = await user.comparePassword(password);

    if (!isValidPassword) {
      logger.warn("Invalid Password");
      return res.status(400).json({
        success: false,
        message: "Invalid Password",
      });
    }

    const { accessToken, refreshToken } = await generateTokens(user);

    return res.status(200).json({
      message: "Login successful",
      success: true,
      accessToken,
      refreshToken,
      userId: user._id,
    });
  } catch (e) {
    logger.error("Login error", e);
    return res.status(500).json({
      message: "Internal Server Error",
      success: false,
    });
  }
};

// refresh token

/**
 * @desc Refresh token
 * @body {refreshToken}
 * @returns {message, success, accessToken, refreshToken}
 */

exports.refreshToken = async (req, res) => {
  logger.info("Refresh endpoint hit");
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      logger.warn("Refresh token not provided");
      return res.status(400).json({
        message: "Refresh token not provided",
        success: false,
      });
    }

    const storedToken = await RefreshToken.findOne({ token: refreshToken });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      logger.warn(`Invalid or expired refresh token`);

      return res.status(403).json({
        message: "Invalid or expired refresh token",
        success: false,
      });
    }

    // console.log("storedToken.userId", storedToken);

    const user = await User.findById(storedToken.user);

    if (!user) {
      logger.warn("User not found");

      return res.status(403).json({
        success: false,
        message: "User not found",
      });
    }

    const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
      await generateTokens(user);

    // delete the old refresh token
    await RefreshToken.deleteOne({ _id: storedToken._id });

    // create a new refresh token
    return res.status(200).json({
      success: true,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (e) {
    logger.error("Refresh token error occurred", e);
    return res.status(500).json({
      message: "Internal Server Error",
      success: false,
    });
  }
};

// logout

/**
 * @desc User logout
 * @body {refreshToken}
 * @returns {message, success}
 */

exports.logout = async (req, res) => {
  logger.info("Logout endpoint hit");
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      logger.warn("Refresh token not provided");
      return res.status(400).json({
        message: "Refresh token not provided",
        success: false,
      });
    }

    await RefreshToken.deleteOne({ token: refreshToken });
    logger.info("Refresh token deleted successfully");

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (e) {
    logger.error("Logout error", e);
    return res.status(500).json({
      message: "Internal Server Error",
      success: false,
    });
  }
};
