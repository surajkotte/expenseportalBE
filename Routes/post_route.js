import express from "express";
import { v4 as uuidv4 } from "uuid";
import SQLFile from "../Database/SQLFile.js";
import { transformData } from "../middleware/transform_data.js";
import dbManager from "../Database/SQLConnection.js";
import dotenv from "dotenv";
dotenv.config();
import { fileURLToPath } from "url";
import multer from "multer";
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, "uploads"),
  filename: (_, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });
const post_router = express.Router();
post_router.post("/login", async (req, res, next) => {
  try {
    next();
  } catch (error) {
    next(error);
  }
});

post_router.post(
  "/admin/configfields",
  async (req, res, next) => {
    const fieldData = req.body.fields_data;
    const deletedIds = req.body.deletedIds;
    try {
      const { fields, translations } = await transformData(fieldData);
      res.locals.fields = fields;
      res.locals.translations = translations;
      res.locals.deletedIds = deletedIds;
      next();
    } catch (error) {
      next(error);
    }
  },
  SQLFile.setConfigFields,
);

post_router.post(
  "/draft/upload",
  upload.single("file"),
  async (req, res, next) => {
    next();
  },
  SQLFile.uploadExpenseFile,
);

export default post_router;
