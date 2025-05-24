import mongoose from "mongoose";
const MONGO_URI = process.env.DB_URL || "mongodb://localhost:27017/mydatabase";
export const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB connected");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};
