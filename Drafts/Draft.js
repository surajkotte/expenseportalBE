import express from "express";
import multer from "multer";
import dotenv from "dotenv";
import { PDFExtract } from "pdf.js-extract";
import { fileURLToPath } from "url";
import fs from "fs";
import path from "path";
const DraftRouter = express.Router();

DraftRouter.get("/drafts", (req, res) => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  try {
    const dirPath = path.resolve(__dirname, "../TempFiles");
    const filePath = path.join(dirPath, "save_draft.json");
    let existingSavedData = [];
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, "utf-8");
      if (fileContent) {
        existingSavedData = JSON.parse(fileContent);
      } else {
        throw new Error("No saved drafts found.");
      }
    } else {
      throw new Error("No saved drafts found.");
    }
    res.status(200).json({
      messageType: "S",
      data: existingSavedData,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ messageType: "E", message: err.message });
  }
});

export default DraftRouter;
