import { Router } from "express";

const router = Router();

// Endpoint for checking application updates
router.get("/api/app-version", (_req, res) => {
  res.json({
    latestVersion: "1.0.1",
    apkUrl: "https://connecting-neighbours-apiserver.vercel.app/download/app-latest.apk",
    releaseNotes: "New global notifications bell, dynamic sound chimes, and verified residency badges.",
  });
});

export default router;
