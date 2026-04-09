import express from "express";
import {
    createBooking,
    getCustomerBookings,
    getVendorBookings,
    updateBookingStatus,
    getBookingById,
    confirmBookingPayment,
    cancelBooking,
    initiateKhaltiPayment,
    verifyKhaltiPayment,
} from "../controllers/bookingController.js";
import { protect, authorizeRoles, requireApprovedVerification } from "../middleware/roleAuth.js";

const router = express.Router();

router.use(protect);

// Customer routes
router.post("/", requireApprovedVerification, authorizeRoles("Customer", "Admin"), createBooking);
router.get("/my-bookings", authorizeRoles("Customer", "Admin"), getCustomerBookings);
// Vendor routes
router.get("/vendor-bookings", authorizeRoles("Vendor", "Admin"), getVendorBookings);

router.get("/:id", authorizeRoles("Customer", "Vendor", "Admin"), getBookingById);
router.post("/:id/confirm", requireApprovedVerification, authorizeRoles("Customer", "Admin"), confirmBookingPayment);
router.post("/:id/khalti/initiate", requireApprovedVerification, authorizeRoles("Customer", "Admin"), initiateKhaltiPayment);
router.post("/:id/khalti/verify", requireApprovedVerification, authorizeRoles("Customer", "Admin"), verifyKhaltiPayment);
router.patch("/:id/cancel", requireApprovedVerification, authorizeRoles("Customer", "Vendor", "Admin"), cancelBooking);

router.put("/:id/status", requireApprovedVerification, authorizeRoles("Vendor", "Admin"), updateBookingStatus);

export default router;
