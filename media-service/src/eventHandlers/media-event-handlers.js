const logger = require("../utils/logger");
const Media = require("../models/media-model");
const { deleteMediaFromCloudinary } = require("../utils/cloudinary");

const handlePostDeleted = async (event) => {
  console.log("Received post deleted", event);
  const { postId, mediaIds } = event;
  try {
    const mediaToDelete = await Media.find({ _id: { $in: mediaIds } });

    for (const media of mediaToDelete) {
      await deleteMediaFromCloudinary(media.publicId);
      await Media.findByIdAndDelete(media._id);

      logger.info(`Deleted media ${media._id} associated with post ${postId}`);
    }
    logger.info(`Processed deletion of media for post id ${postId}`);
  } catch (e) {
    logger.error("Error deleting media from cloudinary", e);
  }
};

module.exports = { handlePostDeleted };
