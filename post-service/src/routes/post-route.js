const { authenticateRequest } = require("../middlewares/auth-middleware");
const {
  createPost,
  getAllPosts,
  getSinglePosts,
} = require("../controllers/post-controller");
const router = require("express").Router();

// middleware -

router.use(authenticateRequest);

router.post("/create", createPost);
router.get("/all-posts", getAllPosts);
router.get("/single-post/:id", getSinglePosts);

module.exports = router;
