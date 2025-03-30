const logger = require("../utils/logger");
const Search = require("../models/search-model");

exports.searchPost = async (req, res) => {
  logger.info("Search endpoint hit");
  try {
    const { query } = req.query;

    const results = await Search.find(
      {
        $text: { $search: query || "" },
      },
      {
        score: { $meta: "textScore" },
      },
    )
      .sort({ score: { $meta: "textScore" } })
      .limit(10);

    return res.status(200).json({
      success: true,
      message: "Search results",
      results,
    });
  } catch (e) {
    logger.error("Search Post error ", e);
    return res.status(500).json({
      message: "Internal Server Error",
      success: false,
    });
  }
};
