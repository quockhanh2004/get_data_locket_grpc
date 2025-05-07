import { Server, Socket } from "socket.io";
import { GetMessageModel, SocketEvents } from "./socket.model";
import { chatUser, chatWithUser } from "../services/chat.service";

export const setupSocket = (io: Server): void => {
  io.on("connection", (socket: Socket) => {
    const accessToken = socket.handshake.headers.access_token as string;

    socket.on(SocketEvents.GET_MESSAGE, (msg: GetMessageModel) => {
      const { with_user, timestamp } = msg;
      chatWithUser(
        {
          isSocket: true,
          token: accessToken,
          with_user,
          timestamp: timestamp,
        },
        socket,
        null
      );
    });

    socket.on(SocketEvents.LIST_MESSAGE, (msg: GetMessageModel) => {
      const { timestamp } = msg;
      chatUser(
        {
          isSocket: true,
          token: accessToken,
          timestamp,
        },
        socket,
        null
      );
    });

    socket.on("disconnect", () => {
      console.log("❌ Client disconnected:", socket.id);
    });
  });
};
