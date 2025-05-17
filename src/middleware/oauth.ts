// middleware/checkBanned.ts
import { NextFunction, Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import axios from "axios";

//lấy domain từ env
const domain = process.env.DOMAIN_AUTH || "https://example.com";

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
    console.log("response", response.data);

    if (!id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    next();
  }
);
