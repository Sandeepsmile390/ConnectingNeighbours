import { Router } from "express";

const router = Router();

// Endpoint for checking application updates
router.get("/app-version", (_req, res) => {
  res.json({
    latestVersion: "1.0.1",
    apkUrl: "https://drive.google.com/file/d/173AOmn1l7zOF3WDDocBmKDAPu9kAgzkQ/view?usp=drivesdk",
    releaseNotes: "New global notifications bell, dynamic sound chimes, and verified residency badges.",
  });
});

export default router;
