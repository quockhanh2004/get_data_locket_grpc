import * as grpc from "@grpc/grpc-js";
export function createMetadata(token: string, dbName: string) {
  const metadata = new grpc.Metadata();
  metadata.add("Authorization", `Bearer ${token}`);
  metadata.add(
    "google-cloud-resource-prefix",
    `projects/locket-4252a/databases/${dbName}`
  );
  metadata.add("content-type", "application/grpc");
  metadata.add("grpc-accept-encoding", "gzip");
  metadata.add("te", "trailers");
  metadata.add("user-agent", "grpc-java-okhttp/1.62.2");
  return metadata;
}
