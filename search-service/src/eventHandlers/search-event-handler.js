const logger = require("../utils/logger");
const Search = require("../models/search-model");

async function handlePostCreated(event) {
  try {
    const newSearchPost = new Search({
      postId: event.postId,
      userId: event.userId,
      content: event.content,
      createdAt: event.createdAt,
    });

    await newSearchPost.save();
    logger.info(
      `Post successfully created: ${event.postId}, ${newSearchPost._id}`,
    );
  } catch (e) {
    logger.error("Error handling post created event", e);
  }
}

async function handlePostDeleted(event) {
  try {
    await Search.findOneAndDelete({ postId: event.postId });

    logger.info(`Search Post successfully deleted: ${event.postId}`);
  } catch (e) {
    logger.error("Error handling post deleted", e);
  }
}

module.exports = { handlePostCreated, handlePostDeleted };
