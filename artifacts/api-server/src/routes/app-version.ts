import { Router } from "express";

const router = Router();

// Endpoint for checking application updates
router.get("/api/app-version", (_req, res) => {
  res.json({
    latestVersion: "1.0.1",
    apkUrl: "https://expo.dev/artifacts/eas/EdkElQl_-Cy6-aZ8SP5XBncJVzIsdnXVd9VpJ4DFCYs.apk",
    releaseNotes: "New global notifications bell, dynamic sound chimes, and verified residency badges.",
  });
});

export default router;
