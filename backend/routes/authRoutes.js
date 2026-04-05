import express from "express";
import {
  isAuthenticated,
  login,
  logout,
  register,
} from "../controllers/authController.js";
import {
  sendVerifyOtp,
  verifyEmail,
} from "../controllers/verificationController.js";
import userAuth from "../middleware/userAuth.js";

const authRouter = express.Router();

authRouter.post("/register", register);
authRouter.post("/login", login);
authRouter.post("/logout", logout);
authRouter.post("/send-otp", userAuth, sendVerifyOtp);
authRouter.post("/verify-account", userAuth, verifyEmail);
authRouter.post("/verify-Account", userAuth, verifyEmail);
authRouter.post("/isAuthenticated", userAuth, isAuthenticated);

export default authRouter;
