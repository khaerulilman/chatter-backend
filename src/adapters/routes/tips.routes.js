import express from "express";
import { verifyToken } from "../middleware/auth.middleware.js";
import { sendTip, getTipsActivity } from "../controllers/tips.controller.js";

const router = express.Router();

router.post("/", verifyToken, sendTip);
router.get("/activity", verifyToken, getTipsActivity);

export default router;
