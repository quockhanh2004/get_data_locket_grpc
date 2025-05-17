import { Request, Response } from "express";
import grpc, { Metadata } from "@grpc/grpc-js";
import { client } from "../services/firestoreClient";
import { saveUserId } from "../utils/listMyClient";
import { ListenResponse, TargetChangeType } from "../models/firebase.model";
import { decodeJwt } from "../utils/decode";
import { TIMEOUT_MS } from "../utils/constrain";

function handleGetFriends(req: Request, res: Response) {
  const { token } = req.body;
  const userId = decodeJwt(token)?.user_id;

  if (!token || !userId) {
    return res.status(400).json({ error: "Token and userId are required" });
  }

  saveUserId(userId);

  const metadata = new Metadata();
  metadata.add("Authorization", `Bearer ${token}`);
  metadata.add("content-type", "application/grpc");
  metadata.add(
    "google-cloud-resource-prefix",
    "projects/locket-4252a/databases/(default)"
  );
  metadata.add("grpc-accept-encoding", "gzip");
  metadata.add("te", "trailers");
  metadata.add("user-agent", "grpc-java-okhttp/1.62.2");

  const call = client.Listen(metadata);

  const users: string[] = [];
  let streamEnded = false;

  function safeSend(callback: () => void) {
    if (!streamEnded) {
      streamEnded = true;
      callback();
    }
  }

  call.on("data", (response: ListenResponse) => {
    if (
      response.target_change?.target_change_type === TargetChangeType.NO_CHANGE
    ) {
      return call.end();
    }

    const userField =
      response.document_change?.document?.fields?.user?.string_value;
    if (userField) {
      users.push(userField);
    }

    const deletedDoc = response.document_delete?.document;
    if (deletedDoc) {
      const deletedUser = deletedDoc.split("/").pop();
      console.log("User deleted:", deletedUser);
    }
  });

  call.on("error", (err: grpc.ServiceError) => {
    console.error("gRPC Stream Error:", err.message);
    safeSend(() => res.status(500).json({ error: err.message }));
  });

  call.on("end", () => {
    safeSend(() => res.status(200).json({ users }));
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
      target_id: 1001,
      query: {
        parent: `projects/locket-4252a/databases/(default)/documents/users/${userId}`,
        structured_query: {
          from: [{ collection_id: "friends" }],
          order_by: [
            { field: { field_path: "__name__" }, direction: "ASCENDING" },
          ],
        },
      },
    },
  };

  call.write(request);
}

export default handleGetFriends;
