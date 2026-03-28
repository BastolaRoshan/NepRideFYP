import fs from "fs";
import path from "path";
import multer from "multer";

const uploadDirectory = path.join(process.cwd(), "uploads", "verification");

if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, uploadDirectory);
  },
  filename: (req, file, callback) => {
    const userId = String(req.body?.userId || req.user?._id || "user");
    const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, "");
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1e9);
    const extension = path.extname(file.originalname || "").toLowerCase();
    callback(null, `${safeUserId}-${timestamp}-${random}${extension}`);
  },
});

const fileFilter = (_req, file, callback) => {
  const allowedMimeTypes = [
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
  ];

  if (!allowedMimeTypes.includes(file.mimetype)) {
    return callback(new Error("Only PDF, JPG, JPEG, PNG, or WEBP files are allowed"));
  }

  callback(null, true);
};

const verificationUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 8 * 1024 * 1024,
    files: 5,
  },
});

export const handleVerificationUpload = (req, res, next) => {
  verificationUpload.any()(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? "Each file must be 8MB or smaller"
        : error.message || "Unable to upload verification documents";

    res.status(400).json({ success: false, message });
  });
};

export default verificationUpload;
