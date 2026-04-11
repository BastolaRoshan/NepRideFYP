import mongoose from "mongoose";

const userDocumentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
    note: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["Customer", "Vendor", "Admin"],
    default: "Customer",
  },
  verifyOtp: {
    type: String,
    default: "",
  },
  verifyOtpExpireAt: {
    type: Number,
    default: 0,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  verificationStatus: {
    type: String,
    enum: ["NotSubmitted", "UnderReview", "Approved", "Rejected"],
    default: "NotSubmitted",
  },
  verificationNote: {
    type: String,
    trim: true,
    default: "",
  },
  verificationSubmittedAt: {
    type: Date,
    default: null,
  },
  verificationReviewedAt: {
    type: Date,
    default: null,
  },
  resetOtp: {
    type: String,
    default: "",
  },
  resetOtpExpireAt: {
    type: Number,
    default: 0,
  },
  resetPasswordToken: {
    type: String,
    default: "",
  },
  resetPasswordExpireAt: {
    type: Number,
    default: 0,
  },
  documents: {
    type: [userDocumentSchema],
    default: [],
  },
  accountStatus: {
    type: String,
    enum: ["active", "suspended", "blocked"],
    default: "active",
  },
  vendorRatingAverage: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  vendorRatingCount: {
    type: Number,
    default: 0,
    min: 0,
  },
});

const userModel = mongoose.models.user || mongoose.model("user", userSchema);

export default userModel;
