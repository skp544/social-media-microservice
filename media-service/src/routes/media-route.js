const router = require("express").Router();
const multer = require("multer");
const logger = require("../utils/logger");
const { authenticateRequest } = require("../middlewares/auth-middleware");
const { uploadMedia, getAllMedia } = require("../controllers/media-controller");

// configure multer for file uploads

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
}).single("file");

router.post(
  "/upload",
  authenticateRequest,
  (req, res, next) => {
    upload(req, res, function (err) {
      if (err instanceof multer.MulterError) {
        logger.error("Multer error occurred when uploading file", err);
        return res.status(400).json({
          success: false,
          message: "Error occurred while uploading file",
          error: err.message,
          stack: err.stack,
        });
      } else if (err) {
        logger.error("Unknown error occurred when uploading file", err);
        return res.status(500).json({
          success: false,
          message: "Internal Server Error",
          error: err.message,
          stack: err.stack,
        });
      }
      if (!req.file) {
        logger.error("No file found, Please add a file and try again");
        return res.status(400).json({
          success: false,
          message: "No file found, Please add a file and try again",
        });
      }
      next();
    });
  },
  uploadMedia,
);

router.get("/get", authenticateRequest, getAllMedia);

module.exports = router;
