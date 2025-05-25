import mongoose, { Schema, Document } from "mongoose";

export interface IUserKey extends Document {
  key: string;
  email: string;
  isActivate: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserKeySchema: Schema = new Schema({
  key: { type: String, required: true, unique: true },
  email: { type: String, required: true, index: true},
  isActivate: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model<IUserKey>("UserKey", UserKeySchema);
