import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import path from "path";

const PROTO_PATH = path.resolve(
  process.cwd(),
  "google/firestore/v1/firestore.proto"
);

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
  // THÊM dòng này để nó tìm được các proto khác nằm trong thư mục `google/`
  includeDirs: [
    path.resolve(process.cwd(), "google"),
    path.resolve(process.cwd(), "src"),
    path.resolve(process.cwd(), "."),
  ],
});

const loaded = grpc.loadPackageDefinition(packageDefinition) as any;
const firestoreProto = loaded.google.firestore.v1;

const client = new firestoreProto.Firestore(
  "firestore.googleapis.com:443",
  grpc.credentials.createSsl()
);

export { client };
