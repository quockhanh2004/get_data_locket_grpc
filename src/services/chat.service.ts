import { Response } from "express";
import { ListenResponse } from "../models/firebase.model";
import { decodeJwt } from "../utils/decode";
import { createMetadata } from "../utils/metadata";
import {
  simplifyFirestoreDataChat,
  simplifyFirestoreDataMessage,
} from "../utils/simplifyFirestoreData";
import { client } from "./firestoreClient";
import { TIMEOUT_MS } from "../utils/constrain";
import { Socket } from "socket.io";
import { SocketEvents } from "../socket/socket.model";
import { TargetChangeType } from "../models/firebase.model";

interface GetMessageParams {
  token: string;
  with_user?: string;
  timestamp?: string | number;
}

interface GetMessageWithUserParams extends GetMessageParams {
  with_user?: string;
}

export const chatWithUser = (
  { token, with_user, timestamp }: GetMessageWithUserParams,
  socket: Socket | null,
  res: Response | null
) => {
  const userId = decodeJwt(token)?.user_id;
  if (!token || !userId || !with_user) {
    const errorMsg =
      !token || !userId
        ? "Token and userId are required"
        : "with_user is required";
    if (res) res.json({ error: errorMsg });
    if (socket) socket.emit(SocketEvents.ERROR, { error: errorMsg });
    return;
  }

  const metadata = createMetadata(token, "(default)");
  const call = client.Listen(metadata);

  if (socket) {
    (socket as any)._grpcStream = call;
    socket.on("disconnect", () => {
      call.end();
    });
  }

  let message: any[] = [];
  let streamEnded = false;

  const request = getMesssageWithUserRequest(with_user, timestamp);
  call.write(request);

  call.on("data", (response: ListenResponse) => {
    const change_type = response.target_change?.target_change_type;
    if (change_type === TargetChangeType.NO_CHANGE) {
      if (!socket) {
        call.end();
        return;
      } else {
        socket.emit(SocketEvents.NEW_MESSAGE, message);
        message = [];
      }
    }

    if (response.document_change?.document?.fields) {
      const messageData = simplifyFirestoreDataMessage(response);
      message.push(messageData);
    }

    if (change_type === TargetChangeType.REMOVE) {
      send({
        res,
        socket,
        data: { message: "Message removed" },
        status: 200,
      });
      call.end();
    }
  });

  call.on("error", (err: any) => {
    console.error("gRPC error:", err);
    if (!streamEnded) {
      streamEnded = true;
      send({
        res,
        socket,
        data: { error: err.message },
        status: 500,
        isError: true,
      });
    }
  });

  call.on("end", () => {
    if (!streamEnded) {
      streamEnded = true;
      if (!socket) send({ res, socket, data: { message } });
    }
  });

  if (!socket) {
    setTimeout(() => {
      if (!streamEnded) {
        console.log("Timeout: Ending stream.");
        call.end();
      }
    }, TIMEOUT_MS);
  }
};

export const chatUser = (
  { token, timestamp }: GetMessageParams,
  socket: Socket | null,
  res: Response | null
) => {
  const userId = decodeJwt(token)?.user_id;
  const metadata = createMetadata(token, "(default)");

  if (!token || !userId) {
    if (res) return res.json({ error: "Token and userId are required" });
    if (socket)
      return socket.emit(SocketEvents.ERROR, {
        error: "Token and userId are required",
      });
    return;
  }

  let message: any[] = [];
  let streamEnded = false;

  function safeSend(callback: () => void) {
    if (!streamEnded) {
      streamEnded = true;
      callback();
    }
  }

  const call = client.Listen(metadata);

  // Gán stream vào socket để sau này cleanup khi disconnect
  if (socket) {
    (socket as any)._grpcStream = call;

    socket.on("disconnect", () => {
      console.log("Socket disconnected, cleaning gRPC stream...");
      call.end();
    });
  }

  call.on("data", (response: ListenResponse) => {
    const change = response.document_change?.document?.fields;
    const change_type = response.target_change?.target_change_type;

    if (change_type === TargetChangeType.NO_CHANGE) {
      if (!socket) {
        call.end();
        return;
      } else {
        socket.emit(SocketEvents.LIST_MESSAGE, message);
        message = [];
      }
    }

    if (change) {
      const messageData = simplifyFirestoreDataChat(response, userId);
      message.push(messageData);
    }

    if (change_type === TargetChangeType.REMOVE) {
      send({
        isError: true,
        res,
        socket,
        data: { message: "Message removed" },
        status: 200,
      });
      call.end();
      return;
    }
  });

  call.on("error", (err: any) => {
    console.error("gRPC Stream Error:", err.message);
    safeSend(() => {
      if (res) res.status(500).json({ error: err.message });
      if (socket) socket.emit(SocketEvents.ERROR, { error: err.message });
    });
  });

  call.on("end", () => {
    safeSend(() => {
      if (res) res.status(200).json({ chat: message });
    });
  });

  setTimeout(() => {
    if (!streamEnded && !socket) {
      console.log("Stream timeout. Closing connection...");
      call.end();
    }
  }, TIMEOUT_MS);

  const request = getListMessageRequest(userId, timestamp);
  call.write(request);
};

function getMesssageWithUserRequest(
  with_user: string,
  timestamp?: string | number | undefined
) {
  return {
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
      target_id: 12,
    },
  };
}

function getListMessageRequest(userId: string, timestamp?: string | number) {
  return {
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
          limit: timestamp
            ? {
                value: 40,
              }
            : undefined,
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
}

function send<T>(opts: {
  res: Response | null;
  socket: Socket | null;
  data: T;
  status?: number;
  event?: string;
  isError?: boolean;
}) {
  const {
    res,
    socket,
    data,
    status = 200,
    event = SocketEvents.NEW_MESSAGE,
    isError = false,
  } = opts;

  if (socket) {
    socket.emit(isError ? SocketEvents.ERROR : event, data);
  }

  if (res) {
    res.status(status).json(data);
  }
}
