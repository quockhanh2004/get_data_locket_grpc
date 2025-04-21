const grpc = require("@grpc/grpc-js");
const { client } = require("../services/firestoreClient");
const simplifyFirestoreData = require("../utils/simplifyFirestoreData");
const { saveUserId } = require("../utils/listMyClient");

function handleGetPosts(req, res) {
  const { token, userId, timestamp } = req.body;
  if (!token || !userId) {
    return res.status(400).json({ error: "Token and userId are required" });
  }
  saveUserId(userId);

  const post = [];
  const deleted = [];
  let streamEnded = false;
  const TIMEOUT_MS = 60000;

  const metadataPosts = createMetadata(token, "locket");
  const metadataDeleted = createMetadata(token, "(default)");

  const callGetPosts = client.Listen(metadataPosts);
  const callGetDeleted = client.Listen(metadataDeleted);

  callGetPosts.on("data", (response) => {
    if (response.target_change?.target_change_type === "NO_CHANGE") {
      if (!timestamp) {
        return callGetPosts.end();
      } else {
        callGetDeleted.write(getDeletedRequest(userId, timestamp));
      }
    }

    if (response.document_change?.document?.fields) {
      const doc = response.document_change.document;
      const fields = doc.fields;

      if (doc.name.includes("/deleted_moments/") && fields?.moment_uid?.string_value) {
        deleted.push(fields.moment_uid.string_value);
      } else {
        const data = simplifyFirestoreData(response.document_change);
        post.push(data);
      }
    }
  });

  callGetPosts.on("error", (err) => handleError(err, res, () => (streamEnded = true)));
  callGetPosts.on("end", () => handleEnd(res, post, deleted, () => (streamEnded = true), streamEnded));

  callGetDeleted.on("data", (response) => {
    if (response.target_change?.target_change_type === "NO_CHANGE") {
      return callGetDeleted.end();
    }

    const doc = response.document_change?.document;
    const fields = doc?.fields;
    if (doc?.name.includes("/deleted_moments/") && fields?.moment_uid?.string_value) {
      deleted.push(fields.moment_uid.string_value);
    }
  });

  callGetDeleted.on("error", (err) => handleError(err, res, () => (streamEnded = true)));
  callGetDeleted.on("end", () => handleEnd(res, post, deleted, () => (streamEnded = true), streamEnded));

  setTimeout(() => {
    if (!streamEnded) callGetPosts.end();
  }, TIMEOUT_MS);

  callGetPosts.write(getPostRequest(userId));
}

function createMetadata(token, dbName) {
  const metadata = new grpc.Metadata();
  metadata.add("content-type", "application/grpc");
  metadata.add("google-cloud-resource-prefix", `projects/locket-4252a/databases/${dbName}`);
  metadata.add("grpc-accept-encoding", "gzip");
  metadata.add("te", "trailers");
  metadata.add("user-agent", "grpc-java-okhttp/1.62.2");
  metadata.add("Authorization", `Bearer ${token}`);
  return metadata;
}

function getPostRequest(userId) {
  return {
    database: "projects/locket-4252a/databases/locket",
    add_target: {
      expected_count: {},
      query: {
        parent: `projects/locket-4252a/databases/locket/documents/history/${userId}`,
        structured_query: {
          end_at: {
            before: true,
            values: [
              {
                timestamp_value: {
                  seconds: "1743313268",
                },
              },
            ],
          },
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

function getDeletedRequest(userId, timestamp) {
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
        },
      },
      target_id: 3,
    },
  };
}

function handleError(err, res, setEnded) {
  setEnded();
  console.error("gRPC Stream Error:", err.message);
  res.status(500).json({ error: err.message });
}

function handleEnd(res, post, deleted, setEnded, streamEnded) {
  if (streamEnded) return;
  setEnded();
  res.status(200).json({ post, deleted });
}

module.exports = { handleGetPosts };