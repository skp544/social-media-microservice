const logger = require("../utils/logger");
const Post = require("../models/post-model");
const { validateCreatePost } = require("../utils/validation");
const { publishEvent } = require("../utils/rabbitmq");

async function invalidatePostCache(req, input) {
  const keys = await req.redisClient.keys("posts:*");

  if (keys.length > 0) {
    await req.redisClient.del(keys);
  }
}

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

    await publishEvent("post.created", {
      postId: newCreatedPost._id.toString(),
      userId: req.user.userId,
      content: newCreatedPost.content,
      createdAt: newCreatedPost.createdAt,
    });

    await invalidatePostCache(req, newCreatedPost._id.toString());

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
  logger.info("Get all posts endpoint hit");
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;

    const cacheKey = `posts:${page}:${limit}`;

    const cachedPosts = await req.redisClient.get(cacheKey);
    console.log(cachedPosts);

    if (cachedPosts) {
      console.log("Cached data");
      return res.status(200).json({
        success: true,
        message: "Post successfully successfully",
        result: JSON.parse(cachedPosts),
      });
    }

    const posts = await Post.find({})
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);

    const totalNoOfPosts = await Post.countDocuments();

    const result = {
      posts,
      currentPage: page,
      totalPages: Math.ceil(totalNoOfPosts / limit),
      totalPosts: totalNoOfPosts,
    };

    // save posts in redis client
    await req.redisClient.setex(cacheKey, 300, JSON.stringify(result));

    return res.status(200).json({
      success: true,
      message: "Post successfully successfully",
      result,
    });
  } catch (e) {
    logger.error("Get All post error", e);
    return res.status(500).json({
      message: "Internal Server Error",
      success: false,
    });
  }
};

exports.getSinglePosts = async (req, res) => {
  logger.info("Get Single Post endpoint hit");
  try {
    const postId = req.params.id;
    const cacheKey = `posts:${postId}`;

    const cachedPost = await req.redisClient.get(cacheKey);

    if (cachedPost) {
      return res.status(200).json({
        success: true,
        message: "Post successfully successfully",
        result: JSON.parse(cachedPost),
      });
    }

    const singlePostDetailsById = await Post.findById(postId);

    if (!singlePostDetailsById) {
      logger.warn("Post not found");
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    await req.redisClient.setex(
      cachedPost,
      3600,
      JSON.stringify(singlePostDetailsById)
    );

    return res.status(200).json({
      success: true,
      message: "Post successfully successfully",
      result: singlePostDetailsById,
    });
  } catch (e) {
    logger.error("Get single  post error", e);
    return res.status(500).json({
      message: "Internal Server Error",
      success: false,
    });
  }
};

exports.deletePost = async (req, res) => {
  logger.info("Delete post endpoint hit");
  try {
    const postId = req.params.id;

    const post = await Post.findOneAndDelete({
      _id: postId,
      user: req.user.userId,
    });

    if (!post) {
      logger.warn("Post not found");
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // publish post delete method
    await publishEvent("post.deleted", {
      postId: post._id.toString(),
      userId: req.user.userId,
      mediaIds: post.mediaIds,
    });

    await invalidatePostCache(req, postId);

    logger.info("Post deleted successfully");
    return res.status(200).json({
      success: true,
      message: "Post deleted successfully",
    });
  } catch (e) {
    logger.error("Delete post error", e);
    return res.status(500).json({
      message: "Internal Server Error",
      success: false,
    });
  }
};
