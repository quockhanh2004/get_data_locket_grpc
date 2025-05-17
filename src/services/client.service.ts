import UserKey from "../models/mongodb/client";
import emailBanned from "../models/mongodb/emailBanned";
import { generateRandomString } from "../utils/genarateKey";

export const createRandomKey = async (email: string) => {
  try {
    let key: string = "";
    let exists = true;

    const isBanned = await checkEmailBanned(email);
    if (isBanned) {
      return {
        error: "Email is banned",
        note: isBanned.note,
      };
    }

    while (exists) {
      key = generateRandomString(12);
      exists = (await UserKey.exists({ key })) ? true : false;
    }

    const userKey = new UserKey({ key, email });
    await userKey.save();

    return { key, email };
  } catch (err) {
    return { error: "Database error" };
  }
};

export const checkKey = async (key: string, email: string) => {
  try {
    const findKey = await UserKey.findOne({ key, email });
    if (!findKey) return { error: "Key not found" };
    return { key: findKey.key, email: findKey.email };
  } catch (err) {
    return { error: "Database error" };
  }
};

export const deleteOneKey = async (key: string) => {
  try {
    const deleteKey = await UserKey.findOneAndDelete({ key });
    if (!deleteKey) {
      return {
        error: "Key not found",
      };
    }
    return {
      key: deleteKey.key,
      email: deleteKey.email,
    };
  } catch (err) {
    return { error: "Database error" };
  }
};

export const getAllKeysByEmail = async (email: string) => {
  try {
    const keys = await UserKey.find({ email });
    if (!keys || keys.length === 0) {
      return {
        error: "Email not registered",
      };
    }
    return keys;
  } catch (err) {
    return { error: "Database error" };
  }
};

export const deleteManyEmail = async (email: string) => {
  try {
    const deleteEmail = await UserKey.deleteMany({ email });
    if (!deleteEmail || deleteEmail.deletedCount === 0) {
      return {
        error: "Email not found",
      };
    }
    return {
      count: deleteEmail.deletedCount,
      email,
    };
  } catch (err) {
    return { error: "Database error" };
  }
};

export const banEmail = async (email: string, note?: string) => {
  try {
    const emailBannedModel = new emailBanned({ email, note });
    await emailBannedModel.save();
    return {
      email,
    };
  } catch (err) {
    return { error: "Database error" };
  }
};

export const unbanEmail = async (email: string) => {
  try {
    const findEmail = await emailBanned.findOne({ email });
    if (!findEmail) {
      return {
        error: "Email not found",
      };
    }
    await findEmail.deleteOne();
    return {
      email: findEmail.email,
    };
  } catch (err) {
    return { error: "Database error" };
  }
};

export const checkEmailBanned = async (email: string) => {
  try {
    const checkEmailBanned = await emailBanned.findOne({ email });
    return checkEmailBanned;
  } catch (err) {
    return null;
  }
};

export const getAllBannedEmails = async () => {
  try {
    const emails = await emailBanned.find();
    return emails;
  } catch (err) {
    return { error: "Database error" };
  }
};

export const getAllEmail = async () => {
  //lấy tất cả email từ bảng userkey
  //mỗi object là 1 email và mảng các key của email đó
  //kiểm tra thêm bảng emailbanned xem email đó có bị banned hay không
  try {
    const emails = await UserKey.aggregate([
      {
        $lookup: {
          from: "emailbanned",
          localField: "email",
          foreignField: "email",
          as: "banned",
        },
      },
      {
        $group: {
          _id: "$email",
          keys: { $push: "$key" },
          banned: { $first: { $cond: [{ $gt: [{ $size: "$banned" }, 0] }, true, false] } },
        },
      },
    ]);

    return emails.map((email) => ({
      email: email._id,
      keys: email.keys,
      banned: email.banned,
    }));
  } catch (err) {
    return { error: "Database error" };
  }
};
