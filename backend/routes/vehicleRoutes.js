import express from "express";
import {
    addVehicle,
    getVendorVehicles,
    updateVehicle,
    deleteVehicle,
    getAllVehicles,
} from "../controllers/vehicleController.js";
import { protect, authorizeRoles } from "../middleware/roleAuth.js";

const router = express.Router();

// Public route for customers (or anyone) to see all vehicles
router.get("/", getAllVehicles);

// All routes below require login and Vendor role
router.use(protect);
router.use(authorizeRoles("Vendor", "Admin"));

router.post("/", addVehicle);
router.get("/vendor", getVendorVehicles);
router.put("/:id", updateVehicle);
router.delete("/:id", deleteVehicle);

export default router;
