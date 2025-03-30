const logger = require("../utils/logger");
const { uploadMediaToCloudinary } = require("../utils/cloudinary");
const Media = require("../models/media-model");

exports.uploadMedia = async (req, res) => {
  logger.info("upload media endpoint hit");

  try {
    if (!req.file) {
      logger.error("No file found, Please add a file and try again");

      return res.status(400).json({
        success: false,
        message: "No file found, Please add a file and try again",
      });
    }

    const { originalname: originalName, mimetype: mimeType, buffer } = req.file;
    const userId = req.user.userId;

    logger.info(
      `File details: name=${originalName}, type=${mimeType}, size=${buffer.length} bytes`,
    );

    logger.info("Uploading to cloudinary starting...");

    const cloudinaryUploadResult = await uploadMediaToCloudinary(req.file);

    logger.info(
      `Cloudinary upload successfull. Public Id - ${cloudinaryUploadResult.public_id}`,
    );

    const newlyCreatedMedia = new Media({
      publicId: cloudinaryUploadResult.public_id,
      originalName,
      mimeType,
      url: cloudinaryUploadResult.secure_url,
      userId,
    });

    await newlyCreatedMedia.save();

    logger.info("Media saved to database");

    return res.status(201).json({
      success: true,
      message: "File uploaded successfully",
      mediaId: newlyCreatedMedia._id,
      url: newlyCreatedMedia.url,
    });
  } catch (e) {
    logger.error("Upload Media error", e);
    return res.status(500).json({
      message: "Internal Server Error",
      success: false,
    });
  }
};
