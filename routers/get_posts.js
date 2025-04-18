const express = require("express");
const router = express.Router();
const grpc = require("@grpc/grpc-js");
const { client } = require("../services/firestoreClient");
const simplifyFirestoreData = require("../utils/simplifyFirestoreData");

router.post("/posts", (req, res) => {
  const { token, userId } = req.body;
  if (!token || !userId) {
    return res.status(400).json({ error: "Token and userId are required" });
  }

  const metadata = new grpc.Metadata();
  metadata.add("content-type", "application/grpc");
  metadata.add(
    "google-cloud-resource-prefix",
    "projects/locket-4252a/databases/locket"
  );
  metadata.add("grpc-accept-encoding", "gzip");
  metadata.add("te", "trailers");
  metadata.add("user-agent", "grpc-java-okhttp/1.62.2");
  metadata.add("Authorization", `Bearer ${token}`);

  const call = client.Listen(metadata);

  const post = [];
  let streamEnded = false;

  call.on("data", (response) => {
    if (response.target_change) {
      if (response.target_change.target_change_type === "NO_CHANGE") {
        return call.end(); // Ngắt kết nối nếu không có thay đổi
      }
    }

    if (response.document_change?.document?.fields) {
      const data = simplifyFirestoreData(response.document_change);
      post.push(data);
    }
  });

  call.on("error", (err) => {
    if (streamEnded) return;
    console.error("gRPC Stream Error:", err);
    res.status(500).json({ error: "Internal server error" });
  });

  call.on("end", () => {
    if (streamEnded) return;
    console.log(`Stream ended for user: ${userId}`);
    res.status(200).json({ post });
    streamEnded = true;
  });

  // Timeout để tránh stream chạy vô hạn
  const TIMEOUT_MS = 60000;
  setTimeout(() => {
    if (!streamEnded) {
      console.log("Stream timeout. Closing connection...");
      call.end();
    }
  }, TIMEOUT_MS);

  // Gửi yêu cầu Listen
  const request = {
    database: "projects/locket-4252a/databases/locket",
    add_target: {
      expected_count: {},
      query: {
        parent:
          "projects/locket-4252a/databases/locket/documents/history/" + userId,
        structured_query: {
          end_at: {
            before: true,
            values: [
              {
                timestamp_value: {
                  nanos: 63000000,
                  seconds: "1743313268",
                },
              },
            ],
          },
          from: [{ collection_id: "entries" }],
          order_by: [
            {
              direction: "DESCENDING",
              field: {
                field_path: "date",
              },
            },

            {
              direction: "DESCENDING",
              field: {
                field_path: "__name__",
              },
            },
          ],
          limit: {
            value: 30,
          },
        },
      },
      target_id: 2,
    },
  };

  call.write(request);
});
module.exports = router;
