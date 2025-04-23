import { GetPostsParams } from "../models/bodyRequest.model";
import { ListenResponse } from "../models/firebase.model";
import { Request, Response } from "express";
import { saveUserId } from "../utils/listMyClient";
import { client } from "../services/firestoreClient";
import * as grpc from "@grpc/grpc-js";
import simplifyFirestoreData from "../utils/simplifyFirestoreData";
import { Post } from "../models/posts.model";

function handleGetPosts(req: Request, res: Response) {
  const request = req.body as GetPostsParams;
  if (!request.token || !request.userId) {
    return res.status(400).json({ error: "Token and userId are required" });
  }
  saveUserId(request.userId);

  const post: Post[] = [];
  const deleted: string[] = [];
  let streamEnded = false;
  const TIMEOUT_MS = 60000;

  const metadataPosts = createMetadata(request.token, "locket");
  const metadataDeleted = createMetadata(request.token, "(default)");

  const callGetPosts = client.Listen(metadataPosts);
  const callGetDeleted = client.Listen(metadataDeleted);

  callGetPosts.on("data", (response: ListenResponse) => {
    if (response.target_change?.target_change_type === "NO_CHANGE") {
      if (!request.timestamp) {
        return callGetPosts.end();
      } else {
        callGetDeleted.write(
          getDeletedRequest(request.userId, request.timestamp)
        );
      }
    }

    if (response.document_change?.document?.fields) {
      const doc = response.document_change.document;
      const fields = doc.fields;

      if (
        doc.name &&
        doc.name.includes("/deleted_moments/") &&
        fields?.moment_uid?.string_value
      ) {
        deleted.push(fields.moment_uid.string_value);
      } else {
        const data = simplifyFirestoreData(response);
        if (!data) return;
        post.push(data);
      }
    }
  });

  callGetPosts.on("error", (err: any) =>
    handleError(err, res, () => (streamEnded = true))
  );
  callGetPosts.on("end", () =>
    handleEnd(res, post, deleted, () => (streamEnded = true), streamEnded)
  );

  callGetDeleted.on("data", (response: ListenResponse) => {
    if (response.target_change?.target_change_type === "NO_CHANGE") {
      return callGetDeleted.end();
    }

    const doc = response.document_change?.document;
    const fields = doc?.fields;
    if (
      doc?.name &&
      doc?.name.includes("/deleted_moments/") &&
      fields?.moment_uid?.string_value
    ) {
      deleted.push(fields.moment_uid.string_value);
    }
  });

  callGetDeleted.on("error", (err: any) =>
    handleError(err, res, () => (streamEnded = true))
  );
  callGetDeleted.on("end", () =>
    handleEnd(res, post, deleted, () => (streamEnded = true), streamEnded)
  );

  setTimeout(() => {
    if (!streamEnded) callGetPosts.end();
  }, TIMEOUT_MS);

  callGetPosts.write(getPostRequest(request.userId, request.timestamp));
}

function createMetadata(token: string, dbName: string) {
  const metadata = new grpc.Metadata();
  metadata.add("content-type", "application/grpc");
  metadata.add(
    "google-cloud-resource-prefix",
    `projects/locket-4252a/databases/${dbName}`
  );
  metadata.add("grpc-accept-encoding", "gzip");
  metadata.add("te", "trailers");
  metadata.add("user-agent", "grpc-java-okhttp/1.62.2");
  metadata.add("Authorization", `Bearer ${token}`);
  return metadata;
}

function getPostRequest(userId: string, timestamp?: string | number) {
  return {
    database: "projects/locket-4252a/databases/locket",
    add_target: {
      expected_count: {},
      query: {
        parent: `projects/locket-4252a/databases/locket/documents/history/${userId}`,
        structured_query: {
          start_at: timestamp
            ? {
                before: true,
                values: [
                  {
                    timestamp_value: {
                      seconds: timestamp,
                    },
                  },
                ],
              }
            : undefined,
          from: [{ collection_id: "entries" }],
          order_by: [
            { direction: "DESCENDING", field: { field_path: "date" } },
            { direction: "DESCENDING", field: { field_path: "__name__" } },
          ],
          limit: { value: 30 },
        },
      },
      target_id: 2,
    },
  };
}

function getDeletedRequest(userId: string, timestamp: string | number) {
  return {
    database: "projects/locket-4252a/databases/(default)",
    add_target: {
      expected_count: {},
      query: {
        parent: `projects/locket-4252a/databases/(default)/documents/users/${userId}`,
        structured_query: {
          start_at: {
            before: false,
            values: [
              {
                timestamp_value: { seconds: timestamp },
              },
            ],
          },
          from: [{ collection_id: "deleted_moments" }],
          order_by: [
            { direction: "ASCENDING", field: { field_path: "date" } },
            { direction: "ASCENDING", field: { field_path: "__name__" } },
          ],
          limit: { value: 30 },
        },
      },
      target_id: 3,
    },
  };
}

function handleError(err: any, res: Response, setEnded: () => void) {
  setEnded();
  console.error("gRPC Stream Error:", err.message);
  res.status(500).json({ error: err.message });
}

function handleEnd(
  res: Response,
  post: Post[],
  deleted: string[],
  setEnded: () => void,
  streamEnded: boolean
) {
  if (streamEnded) return;
  setEnded();
  res.status(200).json({ post, deleted });
}

export { handleGetPosts };
