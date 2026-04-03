import express from "express";
import {
  addAdminUserDocument,
  deleteAdminUser,
  deleteAdminVehicle,
  getAdminDocuments,
  getAdminPayments,
  getAdminSummary,
  getAdminUsers,
  getAdminVehicles,
  updateAdminPaymentStatus,
  updateAdminUser,
  updateAdminUserDocument,
  updateUserVerification,
} from "../controllers/adminController.js";
import { authorizeRoles, protect } from "../middleware/roleAuth.js";

const router = express.Router();

router.use(protect);
router.use(authorizeRoles("Admin"));

router.get("/summary", getAdminSummary);

router.get("/users", getAdminUsers);
router.put("/users/:id", updateAdminUser);
router.put("/users/:id/verification", updateUserVerification);
router.delete("/users/:id", deleteAdminUser);

router.get("/vehicles", getAdminVehicles);
router.delete("/vehicles/:id", deleteAdminVehicle);

router.get("/payments", getAdminPayments);
router.put("/payments/:id", updateAdminPaymentStatus);

router.get("/documents", getAdminDocuments);
router.post("/users/:id/documents", addAdminUserDocument);
router.put("/users/:userId/documents/:documentId", updateAdminUserDocument);

export default router;