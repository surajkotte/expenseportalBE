import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const FiledsRouter = express.Router();

// Resolve __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

FiledsRouter.post("/mapFields/:id", async (req, res) => {
  const { id } = req.params;
  const { HeaderFields, ItemFields } = req.body;

  try {
    const dirpath = path.resolve(__dirname, "../TempFiles");
    const filePath = path.join(dirpath, "rolesFieldMapping.json");

    let existingFieldsMapping = [];
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, "utf-8");
      if (fileContent) {
        existingFieldsMapping = JSON.parse(fileContent);
      }
    }

    const data = existingFieldsMapping.map((info) =>
      info?.id.toString() === id.toString()
        ? { ...info, ItemInfo: ItemFields, headerInfo: HeaderFields }
        : info
    );

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    res.status(200).json({ messageType: "S", message: "Updated" });
  } catch (err) {
    res.status(400).json({ messageType: "E", message: err.message });
  }
});

FiledsRouter.get("/allFields/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const FieldsMappingDirpath = path.resolve(
      __dirname,
      "../TempFiles/rolesFieldMapping.json"
    );

    if (!fs.existsSync(FieldsMappingDirpath)) {
      throw new Error("Fields file not found");
    }

    const MappingFields = fs.readFileSync(FieldsMappingDirpath, "utf-8");
    const FieldsData = MappingFields ? JSON.parse(MappingFields) : [];

    const FieldsOfRole = FieldsData.filter(
      (info) => info?.id.toString() === id.toString()
    );

    res.status(200).json({ messageType: "S", data: FieldsOfRole });
  } catch (err) {
    res.status(200).json({ messageType: "E", message: err.message });
  }
});

export default FiledsRouter;
