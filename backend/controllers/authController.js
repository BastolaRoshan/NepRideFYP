import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import userModel from "../models/userModel.js";
import { sendWelcomeEmail } from "../services/emailService.js";
import {
  getVerificationAccessPayload,
  getRequiredDocumentTitles,
  normalizeRole,
} from "../utils/verification.js";

export const register = async (req, res) => {
  const { name, email, password, phone, role } = req.body;
  if (!name || !email || !password || !phone) {
    return res.json({
      success: false,
      message: "Required fields are missing",
    });
  }
  try {
    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res.json({
        success: false,
        message: "User already exists",
      });
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new userModel({
      name,
      email,
      password: hashedPassword,
      phone,
      role: normalizeRole(role),
    });
    await user.save();

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    await sendWelcomeEmail({
      email,
      name,
    });
    return res.json({
      success: true,
      message: "Registered successfully",
      user: {
        name: user.name,
        role: normalizeRole(user.role),
        verificationStatus: user.verificationStatus,
        requiredDocuments: getRequiredDocumentTitles(user.role),
      },
    });
  } catch (error) {
    res.json({
      success: false,
      message: error.message,
    });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.json({
      success: false,
      message: "Email and password are required",
    });
  }
  try {
    const user = await userModel.findOne({ email });
    if (!user) {
      return res.json({
        success: false,
        message: "User does not exist",
      });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.json({
        success: false,
        message: "Invalid Password",
      });
    }

    const normalizedRole = normalizeRole(user.role);
    const { isServiceAccessAllowed, verificationStatus, verification } = getVerificationAccessPayload(user);

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    return res.json({
      success: true,
      message: "Logged in successfully",
      user: {
        name: user.name,
        role: normalizedRole,
        verificationStatus,
        isServiceAccessAllowed,
        requiredDocuments: verification.requiredDocuments,
        missingDocuments: verification.missingDocuments,
      },
    });
  } catch (error) {
    res.json({
      success: false,
      message: error.message,
    });
  }
};

export const logout = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
    });
    return res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    res.json({
      success: false,
      message: error.message,
    });
  }
};

export const isAuthenticated = async (req, res) => {
  try {
    const userId = req.body.userId;
    if (!userId) {
      return res.json({ success: false, message: "User ID not found in token" });
    }
    const user = await userModel.findById(userId).select(
      "name email role verificationStatus documents isVerified verificationSubmittedAt verificationReviewedAt verificationNote"
    );
    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    const normalizedRole = normalizeRole(user.role);
    const { verificationStatus, isServiceAccessAllowed, verification } = getVerificationAccessPayload(user);

    return res.json({
      success: true,
      message: "User is authenticated",
      role: normalizedRole,
      verificationStatus,
      isServiceAccessAllowed,
      verification,
      user: {
        name: user.name,
        email: user.email,
        role: normalizedRole,
        verificationStatus,
        isServiceAccessAllowed,
      },
    });
  } catch (error) {
    res.json({
      success: false,
      message: error.message,
    });
  }
};
