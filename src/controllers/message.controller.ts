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

function getMesssageWithUser(req: Request, res: Response) {
  const { token, timestamp } = req.body;
  const { with_user } = req.params;
  const userId = decodeJwt(token)?.user_id;
  console.log(userId, with_user, timestamp);

  if (!token || !userId || !with_user) {
    res.json({ error: "Token and userId are required" });
  }
  const metadata = createMetadata(token, "(default)");

  const message: any[] = [];
  let streamEnded = false;

  function safeSend(callback: () => void) {
    if (!streamEnded) {
      streamEnded = true;
      callback();
    }
  }

  const call = client.Listen(metadata);

  call.on("data", (response: ListenResponse) => {
    const change = response.document_change?.document?.fields;
    const change_type = response.target_change?.target_change_type;

    if (change_type === "NO_CHANGE" || change_type === "REMOVE") {
      call.end();
      return;
    }

    if (change) {
      const messageData = simplifyFirestoreDataMessage(response);
      message.push(messageData);
    }
  });

  call.on("error", (err: any) => {
    console.error("gRPC Stream Error:", err.message);
    safeSend(() => res.status(500).json({ error: err.message }));
  });

  call.on("end", () => {
    safeSend(() => res.status(200).json({ message }));
  });

  setTimeout(() => {
    if (!streamEnded) {
      console.log("Stream timeout. Closing connection...");
      call.end();
    }
  }, TIMEOUT_MS);

  const request = {
    database: "projects/locket-4252a/databases/(default)",
    add_target: {
      query: {
        parent: `projects/locket-4252a/databases/(default)/documents/conversations/${with_user}`,
        structured_query: {
          from: [
            {
              collection_id: "messages",
            },
          ],
          limit: {
            value: 50,
          },
          order_by: [
            {
              direction: "DESCENDING",
              field: {
                field_path: "created_at",
              },
            },
          ],
          start_at: timestamp
            ? {
                before: false,
                values: [{ timestamp_value: { seconds: timestamp } }],
              }
            : undefined,
        },
      },
      target_id: 1,
    },
  };
  call.write(request);
}

function getListMessage(req: Request, res: Response) {
  const { token, timestamp } = req.body;
  const userId = decodeJwt(token)?.user_id;
  const metadata = createMetadata(token, "(default)");

  if (!token || !userId) {
    res.json({ error: "Token and userId are required" });
  }

  const message: any[] = [];
  let streamEnded = false;

  function safeSend(callback: () => void) {
    if (!streamEnded) {
      streamEnded = true;
      callback();
    }
  }

  const call = client.Listen(metadata);

  call.on("data", (response: ListenResponse) => {
    const change = response.document_change?.document?.fields;
    const change_type = response.target_change?.target_change_type;

    if (change_type === "NO_CHANGE" || change_type === "REMOVE") {
      call.end();
      return;
    }

    if (change) {
      const messageData = simplifyFirestoreDataChat(response);
      message.push(messageData);
    }
  });

  call.on("error", (err: any) => {
    console.error("gRPC Stream Error:", err.message);
    safeSend(() => res.status(500).json({ error: err.message }));
  });

  call.on("end", () => {
    safeSend(() => res.status(200).json({ chat: message }));
  });

  setTimeout(() => {
    if (!streamEnded) {
      console.log("Stream timeout. Closing connection...");
      call.end();
    }
  }, TIMEOUT_MS);

  const request = {
    database: "projects/locket-4252a/databases/(default)",
    add_target: {
      query: {
        parent: `projects/locket-4252a/databases/(default)/documents/users/${userId}`,
        structured_query: {
          from: [
            {
              collection_id: "conversations",
            },
          ],
          order_by: [
            {
              direction: "DESCENDING",
              field: {
                field_path: "latest_message.created_at",
              },
            },
          ],
          limit: {
            value: 40,
          },
          start_at: timestamp
            ? {
                before: false,
                values: [{ timestamp_value: { seconds: timestamp } }],
              }
            : undefined,
        },
      },
      target_id: 8,
    },
  };
  call.write(request);
}

export { getMesssageWithUser, getListMessage };
