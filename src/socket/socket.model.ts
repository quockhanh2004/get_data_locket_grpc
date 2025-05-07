export enum SocketEvents {
  GET_MESSAGE = "get_message",
  NEW_MESSAGE = "new_message",
  SEND_MESSAGE = "send_message",
  LIST_MESSAGE = "list_message",
  ERROR = "server_error",
}

export interface GetMessageModel {
  with_user?: string;
  timestamp?: string | number;
}
