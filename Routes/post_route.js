import express from "express";
import { v4 as uuidv4 } from "uuid";
import SQLFile from "../Database/SQLFile.js";
import { transformData } from "../middleware/transform_data.js";
import dbManager from "../Database/SQLConnection.js";
import { uploadToS3 } from "../configurations/filestorageconnection.js";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { activeConnections } from "../utils/globalmap.js";
import { extractionQueue } from "../configurations/redisconnection.js";
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
  upload.array("file", 10),
  async (req, res, next) => {
    const uploadedFiles = req.files;
    const sessionid = req.body.sessionId;
    //activeConnections.set(sessionid, res);
    if (!uploadedFiles) {
      return res.status(400).json({
        messageType: "E",
        message: "No file uploaded",
      });
    }
    const info = uploadedFiles.map(async (fileInfo, index) => {
      const fileBuffer = fs.readFileSync(fileInfo.path);
      const base64Data = fileBuffer.toString("base64");
      let ext = path.extname(fileInfo.originalname).toLowerCase();
      let mediaType;
      switch (ext) {
        case ".pdf":
          mediaType = "application/pdf";
          break;
        case ".xml":
          mediaType = "application/xml";
          break;
        case ".txt":
          mediaType = "text/plain";
          break;
        case ".docx":
          mediaType =
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
          break;
        default:
          return res.status(400).json({ error: "Unsupported file type" });
      }
      const uploadResponse = await uploadToS3(
        fileInfo?.filename,
        fileBuffer,
        fileInfo?.mimetype,
      );
      await extractionQueue.add(
        "extract-invoice",
        {
          invoiceId: uuidv4(),
          sessionid: sessionid,
          filename: fileInfo?.filename,
          filedata: base64Data,
          s3path: uploadResponse?.httpUrl,
          contentType: fileInfo?.mimetype,
          count: index + 1,
        },
        // {
        //   attempts: 3,
        //   backoff: { type: "exponential", delay: 5000 },
        // },
      );
    });
    await Promise.all(info);
    return res.status(200).json({ message: "Files queued for processing." });
  },
  // SQLFile.uploadExpenseFile,
);

post_router.get("/stream", (req, res) => {
  const sessionId = req.query.sessionId;

  // Set headers to keep the connection alive
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // Save this specific connection to the global map
  activeConnections.set(sessionId, res);

  // Cleanup if the user closes the tab
  req.on("close", () => {
    activeConnections.delete(sessionId);
    res.end();
  });
});

post_router.post(
  "/draft/submit",
  async (req, res, next) => {
    next();
  },
  SQLFile.submitDraft,
);

export default post_router;
