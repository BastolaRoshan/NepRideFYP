import bcrypt from "bcryptjs";
import crypto from "crypto";
import userModel from "../models/userModel.js";
import { sendPasswordResetOtpEmail } from "../services/emailService.js";
import generateOtp from "../utils/generateOtp.js";

const RESET_OTP_EXPIRY_MS = 15 * 60 * 1000;
const RESET_TOKEN_EXPIRY_MS = 15 * 60 * 1000;

export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.json({
      success: false,
      message: "Email is required",
    });
  }

  try {
    const genericMessage = "If the email is registered, an OTP has been sent.";
    const user = await userModel.findOne({ email });

    if (!user) {
      return res.json({
        success: true,
        message: genericMessage,
      });
    }

    const otp = generateOtp(6);
    user.resetOtp = otp;
    user.resetOtpExpireAt = Date.now() + RESET_OTP_EXPIRY_MS;
    user.resetPasswordToken = "";
    user.resetPasswordExpireAt = 0;

    await user.save();
    await sendPasswordResetOtpEmail({ email: user.email, otp });

    return res.json({
      success: true,
      message: genericMessage,
    });
  } catch (error) {
    return res.json({
      success: false,
      message: error.message,
    });
  }
};

export const verifyResetOtp = async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.json({
      success: false,
      message: "Email and OTP are required",
    });
  }

  try {
    const user = await userModel.findOne({ email });

    if (!user) {
      return res.json({
        success: false,
        message: "Invalid email or OTP",
      });
    }

    if (!user.resetOtp || user.resetOtp !== String(otp)) {
      return res.json({
        success: false,
        message: "Invalid email or OTP",
      });
    }

    if (user.resetOtpExpireAt < Date.now()) {
      return res.json({
        success: false,
        message: "OTP is invalid or expired",
      });
    }

    const rawResetToken = crypto.randomBytes(32).toString("hex");
    const hashedResetToken = crypto
      .createHash("sha256")
      .update(rawResetToken)
      .digest("hex");

    user.resetPasswordToken = hashedResetToken;
    user.resetPasswordExpireAt = Date.now() + RESET_TOKEN_EXPIRY_MS;

    await user.save();

    return res.json({
      success: true,
      message: "OTP verified successfully",
      resetToken: rawResetToken,
    });
  } catch (error) {
    return res.json({
      success: false,
      message: error.message,
    });
  }
};

export const resetPassword = async (req, res) => {
  const { token, newPassword, confirmPassword } = req.body;

  if (!token || !newPassword || !confirmPassword) {
    return res.json({
      success: false,
      message: "All fields are required",
    });
  }

  if (newPassword.length < 6) {
    return res.json({
      success: false,
      message: "Password must be at least 6 characters long",
    });
  }

  if (newPassword !== confirmPassword) {
    return res.json({
      success: false,
      message: "Passwords do not match",
    });
  }

  try {
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const user = await userModel.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpireAt: { $gt: Date.now() },
    });

    if (!user) {
      return res.json({
        success: false,
        message: "Password reset session is invalid or expired",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetOtp = "";
    user.resetOtpExpireAt = 0;
    user.resetPasswordToken = "";
    user.resetPasswordExpireAt = 0;

    await user.save();

    return res.json({
      success: true,
      message: "Password has been reset successfully",
    });
  } catch (error) {
    return res.json({
      success: false,
      message: error.message,
    });
  }
};
