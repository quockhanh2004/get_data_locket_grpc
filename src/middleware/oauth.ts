// middleware/checkBanned.ts
import { NextFunction, Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import axios from "axios";
import { checkEmailBanned, checkKey } from "../services/client.service";
import { compareVersions, decodeJwt } from "../utils/decode";
require('dotenv').config();

//lấy domain từ env
const domain = process.env.DOMAIN_AUTH || "https://example.com";
const currentVersion = process.env.APP_VERSION || "1.0.0";
console.log("Current Version:", process.env.APP_VERSION);

export const checkToken = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    //get token from request header
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const response = await axios.post(domain, {
      token,
    });
    const id = response.data?.id;
    if (!id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    next();
  }
);

export const checkKeyActivated = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    //get key from request header
    const key = req.headers["active-key"] as string;
    const appVersion = req.headers["app-version"] as string;
    if (!appVersion || compareVersions(currentVersion, appVersion) < 0) {
      console.log(appVersion, currentVersion);

      return res.status(401).json({
        error: "Vui lòng cập nhật ứng dụng lên phiên bản mới nhất",
      });
    }
    //get email from header authorization
    const token = req.headers.authorization?.split(" ")[1] || req.body?.token;
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const user = decodeJwt(token);
    const email = user?.email;
    const id = user?.user_id;
    console.log("User ID:", id);

    if (!key) {
      console.log("Key is missing");
      return res.status(401).json({ error: "Vui lòng nhập khóa kích hoạt" });
    }
    const findKey = await checkKey(key, email);
    const checkBan = await checkEmailBanned(email);
    if (checkBan) {
      return res.status(401).json({ error: "Email đã bị cấm truy cập" });
    }
    if (findKey.error) {
      return res.status(401).json({ error: findKey.error });
    }
    next();
  }
);
