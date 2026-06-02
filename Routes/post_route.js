import express from "express";
import { v4 as uuidv4 } from "uuid";
import SQLFile from "../Database/SQLFile.js";
import { transformData } from "../middleware/transform_data.js";
import dbManager from "../Database/SQLConnection.js";
import dotenv from "dotenv";
dotenv.config();
import { fileURLToPath } from "url";
import Anthropic from "@anthropic-ai/sdk";
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});
import multer from "multer";
import fs from "fs";
import path from "path";
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, "uploads"),
  filename: (_, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });
const post_router = express.Router();

async function getClaudeResponse(prompt, contentBlocks) {
  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 20000,
      temperature: 1,
      system: prompt,
      messages: [{ role: "user", content: contentBlocks }],
    });
    return response.content[0].text;
  } catch (error) {
    console.error("Error communicating with Claude:", error);
    return null;
  }
}

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

post_router.post("/draft/upload", upload.single("file"), async (req, res) => {
  try {
    const uploadedFile = req.file;
    if (!uploadedFile) {
      return res.status(400).json({
        messageType: "E",
        message: "No file uploaded",
      });
    }
    const fileBuffer = fs.readFileSync(uploadedFile.path);
    let rawText = "";
    let contentBlocks = [];
    let ext = path.extname(uploadedFile.originalname).toLowerCase();
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
    if (ext === ".xml" || ext === ".txt") {
      rawText = fileBuffer.toString("utf-8");
      contentBlocks.push({
        type: "text",
        text: `Source ${ext.toUpperCase()} content:\n\n${rawText}`,
      });
    } else {
      const base64Data = fileBuffer.toString("base64");
      contentBlocks.push({
        type: "document",
        source: { type: "base64", media_type: mediaType, data: base64Data },
      });
    }
    const draft_fields_response = await dbManager.read("config_fields");
    const fields_data = draft_fields_response.map((field) => ({
      id: field.id,
      field_scope: field.field_scope,
      default_label: field.default_label,
      technical_name: field.technical_name,
      field_type: field.field_type,
      dropdown_options: field.dropdown_options,
    }));
    const HeaderString = fields_data
      .filter((field) => field.field_scope.toUpperCase() === "HEADER")
      .map((field) => `${field.default_label} (${field.technical_name})`)
      .join(", ");
    const ItemString = fields_data
      .filter((field) => field.field_scope.toUpperCase() === "ITEM")
      .map((field) => `${field.default_label} (${field.technical_name})`)
      .join(", ");

    const prompt = `Extract structured data from the following text. Translate any non-English field names to English. Then, map the extracted data to the corresponding JSON structure using the provided field definitions.

- Use the following string as the source text: 
###IMPORTANT Provide output in JSON format only, without any explanations or additional text. The JSON should have two main sections: **Header** and **Items**.

- Use this string to determine the correct field names for the **Header** section:  
${HeaderString}

- Use this string to determine the correct field names for the **Items** section:  
${ItemString}

**Instructions:**
1. Identify and extract relevant fields from the source text.
2. Translate field names into English where necessary.
3. Map the extracted values to the correct fields from ${HeaderString} and ${ItemString} and provide output as JSON`; // Truncate to 10k chars

    const result = await getClaudeResponse(prompt, contentBlocks);
    const jsonMatch = result.match(/```json([\s\S]*?)```/);
    const jsonObject = jsonMatch ? JSON.parse(jsonMatch[1]) : {};
    console.log("Extracted JSON Object:", jsonObject);
    const clean = result.replace(/```(?:json)?\s*([\s\S]*?)```/, "$1").trim();
    let parsedJson;
    try {
      parsedJson = JSON.parse(clean);
    } catch (err) {
      throw new Error("Failed to parse JSON:");
    }
    res.status(200).json({
      messageType: "S",
      data: parsedJson,
      fileName: req.file.filename,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ messageType: "E", message: err.message });
  }
});

export default post_router;
