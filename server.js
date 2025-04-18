const express = require("express");
require("dotenv").config();

const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json());

const getFriendsRouter = require("./routers/get_friends");
const getPostsRouter = require("./routers/get_posts");

// Đăng ký các router
app.use("/", getFriendsRouter);
app.use("/", getPostsRouter);

// Khởi động server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
