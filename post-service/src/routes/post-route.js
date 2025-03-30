const { authenticateRequest } = require("../middlewares/auth-middleware");
const { createPost } = require("../controllers/post-controller");
const router = require("express").Router();

// middleware -

router.use(authenticateRequest);

router.post("/create", createPost);

module.exports = router;
