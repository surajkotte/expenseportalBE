import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const RolesRouter = express.Router();

// emulate __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

RolesRouter.post("/createNewRole", async (req, res) => {
  const { name, description } = req.body;
  console.log(name + " " + description);

  try {
    const roleData = {
      name,
      description,
      createdAt: new Date().toISOString(),
    };

    const dirPath = path.resolve(__dirname, "../TempFiles");
    const filePath = path.join(dirPath, "roles.json");

    let existingRoles = [];
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, "utf-8");
      if (fileContent) {
        existingRoles = JSON.parse(fileContent);
      }
    }

    const newId = existingRoles.length + 1;
    existingRoles.push({ ...roleData, id: newId });

    fs.writeFileSync(filePath, JSON.stringify(existingRoles, null, 2));

    // Read Header and Item fields
    const HeaderFieldsPath = path.resolve(__dirname, "../TempFiles/Headerfields.json");
    const ItemFieldsPath = path.resolve(__dirname, "../TempFiles/Itemfields.json");

    if (!fs.existsSync(HeaderFieldsPath) || !fs.existsSync(ItemFieldsPath)) {
      throw new Error("Fields file not found");
    }

    const headerFields = fs.readFileSync(HeaderFieldsPath, "utf-8");
    const itemFields = fs.readFileSync(ItemFieldsPath, "utf-8");

    const MappingFilePath = path.join(dirPath, "rolesFieldMapping.json");

    let existingFieldMappings = [];
    if (fs.existsSync(MappingFilePath)) {
      const content = fs.readFileSync(MappingFilePath, "utf-8");
      if (content) {
        existingFieldMappings = JSON.parse(content);
      }
    }

    const itemData = itemFields ? JSON.parse(itemFields) : [];
    const headerData = headerFields ? JSON.parse(headerFields) : [];

    const ItemInfo = itemData.map((data) => ({ ...data, isVisible: false }));
    const headerInfo = headerData.map((data) => ({ ...data, isVisible: false }));

    existingFieldMappings.push({ id: newId, ItemInfo, headerInfo });

    fs.writeFileSync(MappingFilePath, JSON.stringify(existingFieldMappings, null, 2));

    res.status(200).json({ messageType: "S", message: "Added" });
  } catch (err) {
    res.status(400).json({ messageType: "E", message: err.message });
  }
});

RolesRouter.get("/getRoles", async (req, res) => {
  try {
    const filePath = path.resolve(__dirname, "../TempFiles/roles.json");

    if (!fs.existsSync(filePath)) throw new Error("File path not found");

    const fileContent = fs.readFileSync(filePath, "utf-8");
    const fileData = fileContent ? JSON.parse(fileContent) : [];

    res.status(200).json({ messageType: "S", data: fileData });
  } catch (err) {
    res.status(400).json({ messageType: "E", message: err.message });
  }
});

export default RolesRouter;
