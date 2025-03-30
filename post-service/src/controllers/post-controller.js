const logger = require("../utils/logger");
const Post = require("../models/post-model");
const { validateCreatePost } = require("../utils/validation");

exports.createPost = async (req, res) => {
  logger.info("Create post endpoint hit");
  try {
    const { error } = validateCreatePost(req.body);

    if (error) {
      logger.warn("Validation error", error.details[0].message);
      return res
        .status(400)
        .json({ message: error.details[0].message, success: false });
    }

    const { content, mediaIds } = req.body;

    const newCreatedPost = new Post({
      user: req.user.userId,
      content,
      mediaIds: mediaIds || [],
    });

    await newCreatedPost.save();

    logger.info("Post created successfully", newCreatedPost);
    res.status(201).json({
      success: true,
      message: "Post successfully created",
    });
  } catch (e) {
    logger.error("Create post error", e);
    return res.status(500).json({
      message: "Internal Server Error",
      success: false,
    });
  }
};

exports.getAllPosts = async (req, res) => {
  try {
  } catch (e) {
    logger.error("Get All post error", e);
    return res.status(500).json({
      message: "Internal Server Error",
      success: false,
    });
  }
};

exports.getSinglePosts = async (req, res) => {
  try {
  } catch (e) {
    logger.error("Get single  post error", e);
    return res.status(500).json({
      message: "Internal Server Error",
      success: false,
    });
  }
};

exports.deletePost = async (req, res) => {
  try {
  } catch (e) {
    logger.error("Delete post error", e);
    return res.status(500).json({
      message: "Internal Server Error",
      success: false,
    });
  }
};
