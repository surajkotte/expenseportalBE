import { fileURLToPath } from "url";
import fs from "fs";
import path from "path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dirPath = path.resolve(__dirname, "../TempFiles");
const filePath = path.join(dirPath, "save_draft.json");
export const FileSystem = {
  async getDrafts(req, res) {
    let existingSavedData = [];
    try {
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
      console.log("Here");
      existingSavedData = existingSavedData.filter(
        (data) => data.status === "1"
      );
      res.status(200).json({ messageType: "S", data: existingSavedData });
    } catch (error) {
      res.status(400).json({ messageType: "E", message: error.message });
    }
  },
  async getApprovalWorkItems(req, res) {
    let existingSavedData = [];
    try {
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
      existingSavedData = existingSavedData.filter(
        (data) => data.status === "2"
      );
      res.status(200).json({ messageType: "S", data: existingSavedData });
    } catch (error) {
      res.status(400).json({ messageType: "E", message: error.message });
    }
  },
};
