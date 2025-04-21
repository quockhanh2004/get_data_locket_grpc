const express = require("express");
const router = express.Router();
const { handleGetPosts } = require("../controllers/postController");

router.post("/posts", handleGetPosts);

module.exports = router;