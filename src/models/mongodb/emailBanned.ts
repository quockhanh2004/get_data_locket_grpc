import mongoose, { Schema, Document } from "mongoose";

export interface IEmailBanned extends Document {
  email: string;
  note?: string;
}
const EmailBannedSchema: Schema = new Schema({
  email: { type: String, required: true, unique: true },
  note: { type: String, default: "" },
});
export default mongoose.model<IEmailBanned>("EmailBanned", EmailBannedSchema);
