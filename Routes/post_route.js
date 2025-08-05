import express from "express";
const router = express.Router();
import { FileSystem } from "../Database/FileSystem.js";
router.post(
  "/submit",
  (req, res, next) => {
    next();
  },
  FileSystem.submitForApproval
);

export { router };
