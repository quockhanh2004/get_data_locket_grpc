import { Request, Response } from "express";
import { client } from "../services/firestoreClient";
import * as grpc from "@grpc/grpc-js";
import { Post } from "../models/posts.model";
import { GetPostsParams } from "../models/bodyRequest.model";
import { ListenResponse } from "../models/firebase.model";
import { simplifyFirestoreData } from "../utils/simplifyFirestoreData";
import { saveUserId } from "../utils/listMyClient";
import { decodeJwt } from "../utils/decode";

function handleGetPosts(req: Request, res: Response) {
  const { token, timestamp } = req.body as GetPostsParams;
  const userId = decodeJwt(token)?.user_id;
  if (!token || !userId) {
    return res.status(400).json({ error: "Token and userId are required" });
  }

  saveUserId(userId);

  const posts: Post[] = [];
  const deleted: string[] = [];

  let responded = false;

  const TIMEOUT_MS = 30000;
  const metadataPosts = createMetadata(token, "locket");
  const metadataDeleted = createMetadata(token, "(default)");

  const callPosts = client.Listen(metadataPosts);
  const callDeleted = client.Listen(metadataDeleted);

  const sendResponse = () => {
    if (responded) return;
    responded = true;
    res.status(200).json({ post: posts, deleted });
  };

  const sendError = (err: any) => {
    if (responded) return;
    responded = true;
    console.error("gRPC Stream Error:", err.message);
    res.status(500).json({ error: err.message });
  };

  callPosts.on("data", (response: ListenResponse) => {
    const change = response.document_change?.document?.fields;
    const change_type = response.target_change?.target_change_type;
    const name = response.document_change?.document?.name;

    if (change_type === "NO_CHANGE" || change_type === "REMOVE") {
      if (!timestamp) {
        callPosts.end();
      } else {
        callDeleted.write(getDeletedRequest(userId, timestamp));
      }
      return;
    }

    if (
      name?.includes("/deleted_moments/") &&
      change?.moment_uid?.string_value
    ) {
      deleted.push(change.moment_uid.string_value);
    } else {
      const data = simplifyFirestoreData(response);
      if (data) posts.push(data);
    }
  });

  callDeleted.on("data", (response: ListenResponse) => {
    const doc = response.document_change?.document;
    const change_type = response.target_change?.target_change_type;
    const fields = doc?.fields;
    if (
      doc?.name?.includes("/deleted_moments/") &&
      fields?.moment_uid?.string_value
    ) {
      deleted.push(fields.moment_uid.string_value);
    }

    if (change_type === "NO_CHANGE" || change_type === "REMOVE") {
      callPosts.end();
      callDeleted.end();
    }
  });

  callPosts.on("end", sendResponse);
  callDeleted.on("end", sendResponse);
  callPosts.on("error", sendError);
  callDeleted.on("error", sendError);

  // Safety timeout
  setTimeout(() => {
    if (!responded) {
      callPosts.end();
      callDeleted.end();
      sendResponse();
    }
  }, TIMEOUT_MS);

  // Start request
  callPosts.write(getPostRequest(userId, timestamp));
}

function createMetadata(token: string, dbName: string) {
  const metadata = new grpc.Metadata();
  metadata.add("Authorization", `Bearer ${token}`);
  metadata.add(
    "google-cloud-resource-prefix",
    `projects/locket-4252a/databases/${dbName}`
  );
  metadata.add("content-type", "application/grpc");
  metadata.add("grpc-accept-encoding", "gzip");
  metadata.add("te", "trailers");
  metadata.add("user-agent", "grpc-java-okhttp/1.62.2");
  return metadata;
}

function getPostRequest(userId: string, timestamp?: string | number) {
  return {
    database: "projects/locket-4252a/databases/locket",
    add_target: {
      target_id: 2,
      query: {
        parent: `projects/locket-4252a/databases/locket/documents/history/${userId}`,
        structured_query: {
          from: [{ collection_id: "entries" }],
          order_by: [
            { direction: "DESCENDING", field: { field_path: "date" } },
            { direction: "DESCENDING", field: { field_path: "__name__" } },
          ],
          limit: { value: 30 },
          start_at: timestamp
            ? {
                before: true,
                values: [{ timestamp_value: { seconds: timestamp } }],
              }
            : undefined,
        },
      },
    },
  };
}

function getDeletedRequest(userId: string, timestamp: string | number) {
  return {
    database: "projects/locket-4252a/databases/(default)",
    add_target: {
      target_id: 3,
      query: {
        parent: `projects/locket-4252a/databases/(default)/documents/users/${userId}`,
        structured_query: {
          from: [{ collection_id: "deleted_moments" }],
          order_by: [
            { direction: "DESCENDING", field: { field_path: "date" } },
            { direction: "DESCENDING", field: { field_path: "__name__" } },
          ],
          limit: { value: 30 },
          start_at: {
            before: false,
            values: [{ timestamp_value: { seconds: timestamp } }],
          },
        },
      },
    },
  };
}

export { handleGetPosts };
