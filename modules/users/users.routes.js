import express from "express";
import multer from "multer";
import { verifyToken } from "../../middleware/createToken.js";
import { getUsers, updateProfile } from "./users.controller.js";

const router = express.Router();

const profileUpload = multer();

router.get("/", getUsers);

router.put(
  "/edit-profile",
  profileUpload.fields([
    { name: "profile_picture", maxCount: 1 },
    { name: "header_picture", maxCount: 1 },
  ]),
  verifyToken,
  updateProfile,
);

export default router;
