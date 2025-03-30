const { authenticateRequest } = require("../middlewares/auth-middleware");
const { searchPost } = require("../controllers/search-controller");
const router = require("express").Router();

router.use(authenticateRequest);

router.get("/posts", searchPost);

module.exports = router;
