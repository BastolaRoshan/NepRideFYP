import express from "express";
import {
  forgotPassword,
  resetPassword,
  verifyResetOtp,
} from "../controllers/passwordController.js";

const passwordRouter = express.Router();

passwordRouter.post("/forgot-password", forgotPassword);
passwordRouter.post("/verify-otp", verifyResetOtp);
passwordRouter.post("/reset-password", resetPassword);

export default passwordRouter;
