import { Response } from "express";
import { ListenResponse } from "../models/firebase.model";
import { decodeJwt } from "../utils/decode";
import { createMetadata } from "../utils/metadata";
import { simplifyFirestoreDataChat, simplifyFirestoreDataMessage } from "../utils/simplifyFirestoreData";
import { client } from "./firestoreClient";
import { TIMEOUT_MS } from "../utils/constrain";
import { Socket } from "socket.io";
import { SocketEvents } from "../socket/socket.model";

interface GetMessageParams {
  isSocket: boolean;
  token: string;
  with_user?: string;
  timestamp?: string | number;
}

interface GetMessageWithUserParams extends GetMessageParams {
  with_user?: string;
}

export const chatWithUser = (
  { isSocket, token, with_user, timestamp }: GetMessageWithUserParams,
  socket: Socket | null,
  res: Response | null
) => {
  const userId = decodeJwt(token)?.user_id;

  if (!token || !userId) {
    if (res) {
      return res.json({ error: "Token and userId are required" });
    }
    if (socket) {
      return socket.emit("error", { error: "Token and userId are required" });
    }
  }

  if (!with_user) {
    return;
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

    if (
      (change_type === "NO_CHANGE" || change_type === "REMOVE") &&
      !isSocket
    ) {
      call.end();
      return;
    }

    if (change) {
      const messageData = simplifyFirestoreDataMessage(response);
      if (!isSocket) {
        message.push(messageData);
      } else {
        send({ isSocket, res, socket, data: messageData });
      }
    }
  });

  call.on("error", (err: any) => {
    console.error("gRPC Stream Error:", err.message);
    safeSend(() => {
      send({
        isSocket,
        res,
        socket,
        data: { error: err.message },
        status: 500,
        isError: true,
      });
    });
  });

  call.on("end", () => {
    console.log("gRPC Stream End");
    safeSend(() => {
      if (!isSocket) {
        send({ isSocket, res, socket, data: { message } });
      }
    });
  });

  setTimeout(() => {
    if (!streamEnded && !isSocket) {
      console.log("Stream timeout. Closing connection...");
      call.end();
    }
  }, TIMEOUT_MS);

  const request = getMesssageWithUserRequest(with_user, timestamp);
  call.write(request);
  if (isSocket && socket) {
    socket.once("disconnect", () => {
      console.log("❌ Socket disconnected. Ending gRPC stream.");
      call.end();
    });
  }
};

export const chatUser = (
  { isSocket, token, timestamp }: GetMessageParams,
  socket: Socket | null,
  res: Response | null
) => {
  const userId = decodeJwt(token)?.user_id;
  const metadata = createMetadata(token, "(default)");

  if (!token || !userId) {
    if (res) return res.json({ error: "Token and userId are required" });
    if (socket)
      return socket.emit(SocketEvents.ERROR, { error: "Token and userId are required" });
    return;
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

    if (
      (change_type === "NO_CHANGE" || change_type === "REMOVE") &&
      !isSocket
    ) {
      call.end();
      return;
    }

    if (change) {
      const messageData = simplifyFirestoreDataChat(response);
      if (res) message.push(messageData);
      if (socket) socket.emit(SocketEvents.NEW_MESSAGE, messageData);
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
    if (!streamEnded && !isSocket) {
      console.log("Stream timeout. Closing connection...");
      call.end();
    }
  }, TIMEOUT_MS);

  const request = getListMessageRequest(userId, timestamp);
  call.write(request);
};

function getMesssageWithUserRequest(
  with_user: string,
  timestamp?: string | number
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
      target_id: 1,
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
}

function send<T>(opts: {
  isSocket: boolean;
  res: Response | null;
  socket: Socket | null;
  data: T;
  status?: number;
  event?: string;
  isError?: boolean;
}) {
  const {
    isSocket,
    res,
    socket,
    data,
    status = 200,
    event = SocketEvents.NEW_MESSAGE,
    isError = false,
  } = opts;

  if (isSocket && socket) {
    socket.emit(isError ? SocketEvents.ERROR : event, data);
  }

  if (!isSocket && res) {
    res.status(status).json(data);
  }
}
