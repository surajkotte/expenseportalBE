import express from "express";
const router = express.Router();
import { FileSystem } from "../Database/FileSystem.js";

router.get(
  "/drafts",
  (req, res, next) => {
    next();
  },
  FileSystem.getDrafts
);

router.get(
  "/approvalitems",
  (req, res, next) => {
    next();
  },
  FileSystem.getApprovalWorkItems
);
export { router };
