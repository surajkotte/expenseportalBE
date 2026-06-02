import express from "express";
import multer from "multer";
import dotenv from "dotenv";
import { PDFExtract } from "pdf.js-extract";
import { v4 as uuidv4 } from "uuid";
//import fs from "fs/promises";
import { fileURLToPath } from "url";
import fs from "fs";
import path from "path";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";
const CreateDraft = express.Router();
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, "uploads"),
  filename: (_, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });
const pdfExtract = new PDFExtract();
const options = {};
dotenv.config();
const HeaderString =
  "employeeId, employeeType,name, vendorName,vendorNumber, createdDate,submissionDate,details,supervisor";
const ItemString =
  "Department, BillNo, Description, expenseType, expenseDate, amountDocCurr, currency, amountLocalCurr, ExchangeRate, OriginalBillAttach, costCenter,glAccount, wbsElement, internalOrder";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});
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

const extractTextFromPDF = async (filePath) => {
  try {
    const data = await pdfExtract.extract(filePath, options);
    let extractedText = "";
    for (const page of data.pages) {
      for (const item of page.content) {
        extractedText += item.str + " ";
      }
    }
    return extractedText.trim();
  } catch (err) {
    console.error("Error extracting text with pdf.js-extract:", err);
    throw err;
  }
};

function extractJsonBlock(text) {
  const jsonMatch = text.match(/{[\s\S]*?"Items":\s*\[[\s\S]*?\][\s\S]*?}/);

  if (!jsonMatch) {
    throw new Error("No valid JSON found in the response.");
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return parsed;
  } catch (error) {
    throw new Error("Extracted JSON is invalid: " + error.message);
  }
}

CreateDraft.post("/upload", upload.single("file"), async (req, res) => {
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
    // const extractedText = text;

    const prompt = `Extract structured data from the following text. Translate any non-English field names to English. Then, map the extracted data to the corresponding JSON structure using the provided field definitions and return in JSON Format

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
      data: parsedJSON,
      fileName: req.file.filename,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ messageType: "E", message: err.message });
  }
});

CreateDraft.post("/saveDraft", async (req, res) => {
  try {
    const { header, items, fileName } = req.body;

    if (!header || !items || !fileName) {
      return res.status(400).json({
        messageType: "E",
        message: "Header, items, and fileName are required.",
      });
    }
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const dirPath = path.resolve(__dirname, "../TempFiles");
    const filePath = path.join(dirPath, "save_draft.json");
    let existingSavedData = [];
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, "utf-8");
      if (fileContent) {
        existingSavedData = JSON.parse(fileContent);
      }
    }
    const newDraft = {
      header,
      items,
      fileName,
      status: "1",
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    };
    existingSavedData.push(newDraft);
    fs.writeFileSync(filePath, JSON.stringify(existingSavedData, null, 2));

    res.status(200).json({
      messageType: "S",
      message: "Draft saved successfully.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ messageType: "E", message: err.message });
  }
});

CreateDraft.post("/submitDraft", async (req, res) => {
  try {
    const { header, items, fileName } = req.body;

    if (!header || !items || !fileName) {
      return res.status(400).json({
        messageType: "E",
        message: "Header, items, and fileName are required.",
      });
    }
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const dirPath = path.resolve(__dirname, "../TempFiles");
    const filePath = path.join(dirPath, "submit_draft.json");
    let existingSavedData = [];
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, "utf-8");
      if (fileContent) {
        existingSavedData = JSON.parse(fileContent);
      }
    }
    const newDraft = {
      header,
      items,
      fileName,
      status: "2",
      createdAt: new Date().toISOString(),
    };
    existingSavedData.push(newDraft);
    fs.writeFileSync(filePath, JSON.stringify(existingSavedData, null, 2));

    res.status(200).json({
      messageType: "S",
      message: "Draft submitted successfully.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ messageType: "E", message: err.message });
  }
});

export default CreateDraft;
