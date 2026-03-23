import mongoose, { Schema, Document } from "mongoose";

export interface IProviderDocument extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  ruc: string;
  email?: string;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProviderSchema = new Schema<IProviderDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    ruc: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const Provider =
  mongoose.models.Provider ||
  mongoose.model<IProviderDocument>("Provider", ProviderSchema);

export default Provider;
