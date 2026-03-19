import express from "express";
import { verifyToken, authorizeRoles } from "../middleware/authmiddleware.js";
import {
  getCertificateInfo,
  downloadCertificate,
} from "../controllers/certificateController.js";

const router = express.Router();

/*
========================================
🎓 CERTIFICATE ROUTES
Base: /api/certificates
========================================
*/

// Get certificate metadata (JSON) — used by frontend preview card
router.get(
  "/:registrationId",
  verifyToken,
  authorizeRoles("student"),
  getCertificateInfo
);

// Download certificate as PDF
router.get(
  "/:registrationId/download",
  verifyToken,
  authorizeRoles("student"),
  downloadCertificate
);

export default router;
