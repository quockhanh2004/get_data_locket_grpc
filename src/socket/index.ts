import { Server, Socket } from "socket.io";
import { GetMessageModel, SocketEvents } from "./socket.model";
import { chatUser, chatWithUser } from "../services/chat.service";

export const setupSocket = (io: Server): void => {
  io.on("connection", (socket: Socket) => {
    const accessToken =
      (socket.handshake.auth.access_token as string) ||
      (socket.handshake.headers["www-authenticate"] as string);
    console.log("✅ Client connected:", socket.id);

    chatUser(
      {
        token: accessToken,
      },
      socket,
      null
    );

    socket.on(SocketEvents.GET_MESSAGE, (msg: GetMessageModel) => {
      const { with_user } = msg;
      chatWithUser(
        {
          token: accessToken,
          with_user,
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
