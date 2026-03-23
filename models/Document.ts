import mongoose, { Schema, Document } from "mongoose";

export interface IDocumentDocument extends Document {
  _id: mongoose.Types.ObjectId;
  providerId: mongoose.Types.ObjectId;
  documentType: string;
  year: number;
  description: string;
  status: "PENDING" | "UPLOADED" | "APPROVED" | "REJECTED";
  fileUrl?: string;
  fileName?: string;
  blobName?: string;
  observations?: string;
  deadline?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DocumentSchema = new Schema<IDocumentDocument>(
  {
    providerId: {
      type: Schema.Types.ObjectId,
      ref: "Provider",
      required: true,
    },
    documentType: {
      type: String,
      required: true,
      trim: true,
    },
    year: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "UPLOADED", "APPROVED", "REJECTED"],
      default: "PENDING",
    },
    fileUrl: {
      type: String,
    },
    fileName: {
      type: String,
    },
    blobName: {
      type: String,
    },
    observations: {
      type: String,
    },
    deadline: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

DocumentSchema.index(
  { providerId: 1, documentType: 1, year: 1 },
  { unique: true }
);

const Doc =
  mongoose.models.Document ||
  mongoose.model<IDocumentDocument>("Document", DocumentSchema);

export default Doc;
