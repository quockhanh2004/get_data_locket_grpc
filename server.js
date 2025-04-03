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

  // Khởi tạo metadata với token nhận được từ request
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

  let users = []; // Mỗi request có một mảng riêng

  try {
    const call = client.Listen(metadata);

    call.on("data", (response) => {
      if (response.target_change) {
        console.log("Target change event received:", response.target_change);
        if (response.target_change.target_change_type === "NO_CHANGE") {
          call.end(); // Ngắt kết nối khi không có thay đổi
        }
      }

      if (response.document_change) {
        // Lấy danh sách trường từ document_change
        const fields = response.document_change.document.fields;

        // Kiểm tra xem có key "user" không
        if (fields && fields.user && fields.user.string_value) {
          users.push(fields.user.string_value);
          console.log("Saved user string_value:", fields.user.string_value);
        }
      }
    });

    call.on("error", (err) => {
      console.error("Error:", err);
      res.status(500).send({ error: "Internal server error" });
    });

    call.on("end", () => {
      console.log("Stream ended for user:", userId);
      res.status(200).json({ users }); // Trả về danh sách users cho request này
    });

    // Gửi message yêu cầu lắng nghe thay đổi
    const request = {
      database: "projects/locket-4252a/databases/(default)",
      add_target: {
        target_id: Math.floor(Math.random() * 10000), // Tạo target_id ngẫu nhiên
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

    console.log(`Sending Listen request for user ${userId}...`);
    call.write(request);
  } catch (error) {
    console.error("Error:", error);
    if (error.code === 16) {
      res.status(401).send({ error: "Invalid token" });
    }
    res.status(500).send({ error: "Internal server error" });
  }
});

// Lắng nghe kết nối trên cổng đã cấu hình
app.listen(PORT, () => {
  console.log(`Server listening at http://localhost:${PORT}`);
});
