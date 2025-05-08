import express from "express";
import dotenv from "dotenv";
import { Server } from "socket.io";
import http from "http";

import getFriendRouter from "./src/routers/get_friends";
import getPostRouter from "./src/routers/get_posts";
import spotifyRouter from "./src/routers/spotify";
import getMessageRouter from "./src/routers/get_message";
import { setupSocket } from "./src/socket";

dotenv.config();

const PORT = process.env.PORT || 3000;

const app = express();
app.set("trust proxy", true);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

setupSocket(io);
app.use(express.json());
//lấy địa chỉ ipv4 và path request
app.use((req, res, next) => {
  const ip = req.headers["x-forwarded-for"] || req.ip;
  const path = req.path;
  console.log("\n====== INCOMING REQUEST ======");
  console.log(`Request from ${ip} to ${path}`);
  next();
});

io.use((socket, next) => {
  const ip =
    socket.handshake.headers["x-forwarded-for"] || socket.handshake.address;
  console.log(`Socket connection from ${ip}`);
  next();
});

// Đăng ký các router
app.use("/", getFriendRouter);
app.use("/", getPostRouter);
app.use("/", spotifyRouter);
app.use("/", getMessageRouter);

// Khởi động server
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
