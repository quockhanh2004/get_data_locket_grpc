import { Request, Response } from "express";
import { client } from "../services/firestoreClient";
import { Post } from "../models/posts.model";
import { GetPostsParams } from "../models/bodyRequest.model";
import { ListenResponse } from "../models/firebase.model";
import {
  simplifyFirestoreData,
  simplifyFirestoreDataReactPost,
} from "../utils/simplifyFirestoreData";
import { saveUserId } from "../utils/listMyClient";
import { decodeJwt } from "../utils/decode";
import { createMetadata } from "../utils/metadata";
import { TIMEOUT_MS } from "../utils/constrain";

function handleGetPosts(req: Request, res: Response) {
  const { token, timestamp } = req.body as GetPostsParams;
  const userId = decodeJwt(token)?.user_id;
  if (!token || !userId) {
    return res.status(400).json({ error: "Token and userId are required" });
  }

  saveUserId(userId);

  const posts: any[] = [];
  const deleted: string[] = [];
  let isEndPosts = false;
  let isEndDeleted = false;

  let responded = false;

  const metadataPosts = createMetadata(token, "locket");
  const metadataDeleted = createMetadata(token, "(default)");

  const callPosts = client.Listen(metadataPosts);
  const callDeleted = client.Listen(metadataDeleted);

  const sendResponse = () => {
    if (!isEndPosts || !isEndDeleted) {
      return;
    }

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
      callPosts.end();
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
      callDeleted.end();
      return;
    }
  });

  callPosts.on("end", () => {
    isEndPosts = true;
    sendResponse();
  });
  callDeleted.on("end", () => {
    isEndDeleted = true;
    sendResponse();
  });
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
  callDeleted.write(
    getDeletedRequest(userId, timestamp || new Date().getTime())
  );
}

function getReactionPost(req: Request, res: Response) {
  const { token } = req.body;
  const idMoment = req.params.postId;
  const userId = decodeJwt(token)?.user_id;
  if (!token || !userId) {
    return res.status(400).json({ error: "Token and userId are required" });
  }

  const metadata = createMetadata(token, "(default)");
  const call = client.Listen(metadata);

  const reactions: any[] = [];
  let responded = false;

  call.on("data", (response: ListenResponse) => {
    const change = response.document_change?.document?.fields;
    const change_type = response.target_change?.target_change_type;
    if (change_type === "NO_CHANGE" || change_type === "REMOVE") {
      call.end();
      return;
    }
    if (change) {
      const data = simplifyFirestoreDataReactPost(response);
      if (data) reactions.push(data);
    }
  });

  call.on("error", (err: any) => {
    console.error("gRPC Stream Error:", err.message);
    if (!responded) {
      responded = true;
      res.status(500).json({ error: err.message });
    }
  });

  call.on("end", () => {
    if (!responded) {
      responded = true;
      res.status(200).json({ reactions });
    }
  });

  // Safety timeout
  setTimeout(() => {
    if (!responded) {
      call.end();
      res.status(500).json({ error: "Request timed out" });
    }
  }, TIMEOUT_MS);

  // Start request
  call.write(getReactPostRequest(idMoment));
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

function getReactPostRequest(idMoment: string) {
  return {
    database: "projects/locket-4252a/databases/(default)",
    add_target: {
      query: {
        parent: `projects/locket-4252a/databases/(default)/documents/moments/${idMoment}`,
        structured_query: {
          from: [
            {
              collection_id: "reactions",
            },
          ],
          order_by: [
            {
              direction: "ASCENDING",
              field: {
                field_path: "__name__",
              },
            },
          ],
        },
      },
      target_id: 1,
    },
  };
}

export { handleGetPosts, getReactionPost };
