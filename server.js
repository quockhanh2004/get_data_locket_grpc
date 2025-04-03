const express = require("express");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");
require("dotenv").config();

const PORT = process.env.PORT || 3000;
const PROTO_PATH = path.join(
  __dirname,
  "./google/firestore/v1/firestore.proto"
);

const app = express();
app.use(express.json()); // Middleware để parse JSON body

// Load Firestore gRPC Proto
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
  includeDirs: [path.join(__dirname, "./")],
});
const firestoreProto =
  grpc.loadPackageDefinition(packageDefinition).google.firestore.v1;

// Firestore Client
const client = new firestoreProto.Firestore(
  "firestore.googleapis.com:443",
  grpc.credentials.createSsl()
);

app.post("/listen", (req, res) => {
  const { token, userId } = req.body;
  if (!token || !userId) {
    return res.status(400).json({ error: "Token and userId are required" });
  }

  const metadata = new grpc.Metadata();
  metadata.add("Authorization", `Bearer ${token}`);
  metadata.add("content-type", "application/grpc");
  metadata.add(
    "google-cloud-resource-prefix",
    "projects/locket-4252a/databases/(default)"
  );
  metadata.add("grpc-accept-encoding", "gzip");
  metadata.add("te", "trailers");
  metadata.add("user-agent", "grpc-java-okhttp/1.62.2");

  console.log(`Starting Listen stream for user ${userId}...`);
  const call = client.Listen(metadata);

  const users = [];
  let streamEnded = false;

  call.on("data", (response) => {
    if (response.target_change) {
      if (response.target_change.target_change_type === "NO_CHANGE") {
        return call.end(); // Ngắt kết nối nếu không có thay đổi
      }
    }

    if (response.document_change?.document?.fields?.user?.string_value) {
      const userString =
        response.document_change.document.fields.user.string_value;
      users.push(userString);
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
    res.status(200).json({ users });
    streamEnded = true;
  });

  // Timeout để tránh stream chạy vô hạn
  const TIMEOUT_MS = 60000;
  const timeout = setTimeout(() => {
    if (!streamEnded) {
      console.log("Stream timeout. Closing connection...");
      call.end();
    }
  }, TIMEOUT_MS);

  // Gửi yêu cầu Listen
  const request = {
    database: "projects/locket-4252a/databases/(default)",
    add_target: {
      target_id: Math.floor(Math.random() * 10000),
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
});

// Khởi động server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
