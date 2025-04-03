const express = require("express");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");
require("dotenv").config();

const PORT = process.env.PORT || 3000;

// Khởi tạo ứng dụng Express
const app = express();
app.use(express.json()); // Middleware để parse JSON body

// Định nghĩa đường dẫn proto
const PROTO_PATH = path.join(
  __dirname,
  "./google/firestore/v1/firestore.proto"
);

// Định nghĩa proto
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

// Khởi tạo kết nối đến Firestore
const client = new firestoreProto.Firestore(
  "firestore.googleapis.com:443",
  grpc.credentials.createSsl()
);

// Định nghĩa API POST để nhận token và userId
app.post("/listen", (req, res) => {
  const { token, userId } = req.body;

  if (!token || !userId) {
    return res.status(400).send({ error: "Token and userId are required" });
  }

  const metadata = new grpc.Metadata();
  metadata.add("Authorization", `Bearer ${token}`);

  let users = [];
  const call = client.Listen(metadata);

  // Thêm timeout để tránh stream chạy vô hạn
  const TIMEOUT_MS = 60000; // 60 giây
  const timeout = setTimeout(() => {
    console.log("Stream timeout. Closing connection...");
    call.end();
  }, TIMEOUT_MS);

  call.on("data", (response) => {
    if (response.target_change && response.target_change.target_change_type === "NO_CHANGE") {
      call.end();
    }

    if (response.document_change) {
      const fields = response.document_change.document.fields;
      if (fields && fields.user && fields.user.string_value) {
        users.push(fields.user.string_value);
      }
    }
  });

  call.on("error", (err) => {
    console.error("Error:", err);
    call.end();
    clearTimeout(timeout);
    res.status(500).send({ error: "Internal server error" });
  });

  call.on("end", () => {
    clearTimeout(timeout);
    console.log("Stream ended for user:", userId);
    res.status(200).json({ users });
  });

  // Sử dụng target_id cố định thay vì ngẫu nhiên
  const targetId = userId.hashCode() % 10000;
  const request = {
    database: "projects/locket-4252a/databases/(default)",
    add_target: {
      target_id: targetId,
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

// Lắng nghe kết nối trên cổng đã cấu hình
app.listen(PORT, () => {
  console.log(`Server listening at http://localhost:${PORT}`);
});
