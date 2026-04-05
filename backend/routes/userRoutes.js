import express from "express";
import userAuth from "../middleware/userAuth.js";
import {
	getAllUser,
	getVerificationStatus,
	submitVerificationDocuments,
} from "../controllers/userController.js";
import { handleVerificationUpload } from "../middleware/verificationUpload.js";

const userRouter = express.Router();

userRouter.get("/data", userAuth, getAllUser);
userRouter.get("/verification-status", userAuth, getVerificationStatus);
userRouter.post("/verification-submit", userAuth, handleVerificationUpload, submitVerificationDocuments);

export default userRouter;
