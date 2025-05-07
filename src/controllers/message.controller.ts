import { Request, Response } from "express";
import { client } from "../services/firestoreClient";
import {
  simplifyFirestoreData,
  simplifyFirestoreDataChat,
  simplifyFirestoreDataMessage,
} from "../utils/simplifyFirestoreData";
import { decodeJwt } from "../utils/decode";
import { createMetadata } from "../utils/metadata";
import { ListenResponse } from "../models/firebase.model";
import { TIMEOUT_MS } from "../utils/constrain";
import { chatUser, chatWithUser } from "../services/chat.service";

function getMesssageWithUser(req: Request, res: Response) {
  const { token, timestamp } = req.body;
  const { with_user } = req.params;
  chatWithUser(
    {
      isSocket: false,
      token,
      with_user,
      timestamp,
    },
    null,
    res
  );
}

function getListMessage(req: Request, res: Response) {
  const { token, timestamp } = req.body;
  chatUser(
    {
      isSocket: false,
      token,
      timestamp,
    },
    null,
    res
  );
}

export { getMesssageWithUser, getListMessage };
