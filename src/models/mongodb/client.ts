import mongoose, { Schema, Document } from "mongoose";

export interface IUserKey extends Document {
  key: string;
  email: string;
}

const UserKeySchema: Schema = new Schema({
  key: { type: String, required: true, unique: true },
  email: { type: String, required: true },
});

export default mongoose.model<IUserKey>("UserKey", UserKeySchema);
