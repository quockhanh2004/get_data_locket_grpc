const express = require("express");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");

// Khởi tạo ứng dụng Express
const app = express();
const port = 3000;

// Giải mã JSON từ body request
app.use(express.json());

// Định nghĩa đường dẫn proto
const PROTO_PATH = path.join(
  __dirname,
  "./google/firestore/v1/firestore.proto"
);

// Mảng để lưu giá trị user
const usersArray = [];

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

// Kết nối đến Firestore
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

  let resumeToken = null;

  // Lắng nghe các sự kiện từ Firestore
  const call = client.Listen(metadata);

  call.on("data", (response) => {
    if (response.target_change) {
      console.log("Target change event received:", response.target_change);
      if (response.target_change.target_change_type === "NO_CHANGE") {
        call.end();
      }
    }

    if (response.document_change) {
      // Lấy danh sách trường từ document_change
      const fields = response.document_change.document.fields;

      // Kiểm tra xem có key "user" không
      if (fields && fields.user && fields.user.string_value) {
        usersArray.push(fields.user.string_value);
        console.log("Saved user string_value:", fields.user.string_value);
      }
    }
  });

  call.on("error", (err) => {
    console.error("Error:", err);
    res.status(500).send({ error: "Internal server error" });
  });

  call.on("end", () => {
    console.log("Stream ended.");
    // Trả về mảng usersArray và ngừng kết nối
    res.status(200).json({ users: usersArray });
  });

  // Gửi message yêu cầu lắng nghe thay đổi
  const request = {
    database: "projects/locket-4252a/databases/(default)",
    add_target: {
      target_id: 2,
      query: {
        parent: `projects/locket-4252a/databases/(default)/documents/users/${userId}`,
        structured_query: {
          from: [
            {
              collection_id: "friends",
            },
          ],
          order_by: [
            {
              field: {
                field_path: "__name__",
              },
              direction: "ASCENDING",
            },
          ],
        },
      },
    },
  };

  console.log("Sending Listen request...");
  call.write(request);
});

// Lắng nghe kết nối trên cổng 3000
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
