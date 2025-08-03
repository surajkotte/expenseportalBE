import express from "express";
import multer from "multer";
import dotenv from "dotenv";
import { PDFExtract } from "pdf.js-extract";
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

async function getClaudeResponse(prompt) {
  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 20000,
      temperature: 1,
      messages: [{ role: "user", content: prompt }],
    });
    return response.content;
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
  // Regex to extract JSON between `{` and matching `}`
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
    const text = await extractTextFromPDF(uploadedFile.path);
    if (!uploadedFile) {
      return res.status(400).json({
        messageType: "E",
        message: "No file uploaded",
      });
    }

    // Read and extract text from PDF
    //const fileBuffer = await fs.readFile(uploadedFile.path);
    const extractedText = text;

    // Use Gemini to analyze the PDF content
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `Extract structured data from the following text. Translate any non-English field names to English. Then, map the extracted data to the corresponding JSON structure using the provided field definitions.

- Use the following string as the source text: 

${extractedText.substring(0, 10000000)}

- Use this string to determine the correct field names for the **Header** section:  
${HeaderString}

- Use this string to determine the correct field names for the **Items** section:  
${ItemString}

**Instructions:**
1. Identify and extract relevant fields from the source text.
2. Translate field names into English where necessary.
3. Map the extracted values to the correct fields from ${HeaderString} and ${ItemString} `; // Truncate to 10k chars

    /** Gemini response */
    const result = await model.generateContent(prompt);

    /**Anthropic response */
    // const result = await getClaudeResponse(prompt);
    // console.log(result);
    const response = await result.response;
    const geminiOutput = response.text();
    const clean = geminiOutput
      .replace(/```(?:json)?\s*([\s\S]*?)```/, "$1")
      .trim();
    // console.log(clean);
    const parsedJson = extractJsonBlock(clean);
    // let jsonObject;
    // try {
    //   jsonObject = JSON.parse(clean);
    // } catch (err) {
    //   throw new Error("Failed to parse JSON:");
    // }
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

export default CreateDraft;
