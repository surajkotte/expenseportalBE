import express from "express";
import SQLFile from "../Database/SQLFile.js";
const get_router = express.Router();
get_router.get(
  "/admin/configfields",
  async (req, res, next) => {
    try {
      next();
    } catch (error) {
      next(error);
    }
  },
  SQLFile.getConfigFields,
);
get_router.get(
  "/draft/draftfields",
  async (req, res, next) => {
    try {
      next();
    } catch (error) {
      next(error);
    }
  },
  SQLFile.getDraftFields,
);
export default get_router;
