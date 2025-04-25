import express from "express";
import dotenv from "dotenv";
import getFriendRouter from "./src/routers/get_friends";
import getPostRouter from "./src/routers/get_posts";
import spotifyRouter from "./src/routers/spotify";

dotenv.config();

const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json());

// Đăng ký các router
app.use("/", getFriendRouter);
app.use("/", getPostRouter);
app.use("/", spotifyRouter);

// Khởi động server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
