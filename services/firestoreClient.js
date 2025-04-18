const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");

const PROTO_PATH = path.join(__dirname, "../google/firestore/v1/firestore.proto");

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
  includeDirs: [path.join(__dirname, "../")],
});

const firestoreProto = grpc.loadPackageDefinition(packageDefinition).google.firestore.v1;

const client = new firestoreProto.Firestore(
  "firestore.googleapis.com:443",
  grpc.credentials.createSsl()
);


module.exports = { client };
