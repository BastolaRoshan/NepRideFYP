import jwt from "jsonwebtoken";
import userModel from "../models/userModel.js";
import { getVerificationAccessPayload, normalizeRole } from "../utils/verification.js";

// Middleware to protect routes (Authentication)
export const protect = async (req, res, next) => {
    const { token } = req.cookies;

    if (!token) {
        return res.json({
            success: false,
            message: "Not Authorized. Please login.",
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // authController uses "userId" for token payload (or "id" in older versions). Handled both:
        const id = decoded.userId || decoded.id;

        if (!id) {
            return res.json({
                success: false,
                message: "Invalid Token.",
            });
        }

        const user = await userModel.findById(id).select("-password");
        if (!user) {
            return res.json({
                success: false,
                message: "User not found.",
            });
        }

        req.user = user;
        next();
    } catch (error) {
        res.json({
            success: false,
            message: "Session expired or invalid token.",
        });
    }
};

// Middleware to restrict access based on user role (Authorization)
export const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        const userRole = normalizeRole(req.user?.role);
        const allowedRoles = roles.map((role) => normalizeRole(role)).filter(Boolean);

        if (!userRole || !allowedRoles.includes(userRole)) {
            return res.json({
                success: false,
                message: `Role (${req.user?.role || "Unknown"}) is not allowed to access this resource.`,
            });
        }

        req.user.role = userRole;
        next();
    };
};

export const requireApprovedVerification = (req, res, next) => {
    const userRole = normalizeRole(req.user?.role);

    if (userRole === "Admin") {
        return next();
    }

    const { isServiceAccessAllowed, verificationStatus, verification } = getVerificationAccessPayload(req.user);

    if (!isServiceAccessAllowed) {
        return res.json({
            success: false,
            message: "Verification approval is required before using services.",
            verificationStatus,
            verification,
        });
    }

    next();
};
