import express from "express";
const router = express.Router();
import { fileURLToPath } from "url";
import fs from "fs";
import path from "path";
router.put("/submit", async (req, res) => {
  const { id } = req.body;
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
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
    const findData = existingSavedData.find(
      (data) => data?.id.toString() === id.toString()
    );
    if (!findData) throw new Error("No data found");
    const updatedData = existingSavedData?.map((data) => {
      if (data?.id.toString() === id.toString())
        data.status = "2";
      return data;
    });
    fs.writeFileSync(filePath, JSON.stringify(existingSavedData, null, 2));
    res.status(200).json({
      messageType: "S",
      data: existingSavedData,
    });
  } catch (err) {
    res.status(500).json({ messageType: "E", message: err.message });
  }
});

export { router };
