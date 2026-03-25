import express from "express";
import {
    createBooking,
    getCustomerBookings,
    getVendorBookings,
    updateBookingStatus,
    getBookingById,
    confirmBookingPayment,
    cancelBooking,
} from "../controllers/bookingController.js";
import { protect, authorizeRoles } from "../middleware/roleAuth.js";

const router = express.Router();

router.use(protect);

// Customer routes
router.post("/", authorizeRoles("Customer", "Admin"), createBooking);
router.get("/my-bookings", authorizeRoles("Customer", "Admin"), getCustomerBookings);
router.get("/:id", authorizeRoles("Customer", "Vendor", "Admin"), getBookingById);
router.post("/:id/confirm", authorizeRoles("Customer", "Admin"), confirmBookingPayment);
router.patch("/:id/cancel", authorizeRoles("Customer", "Vendor", "Admin"), cancelBooking);

// Vendor routes
router.get("/vendor-bookings", authorizeRoles("Vendor", "Admin"), getVendorBookings);
router.put("/:id/status", authorizeRoles("Vendor", "Admin"), updateBookingStatus);

export default router;
