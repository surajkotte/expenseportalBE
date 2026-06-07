import dbManager from "./SQLConnection.js";
import { v4 as uuidv4 } from "uuid";
import Anthropic from "@anthropic-ai/sdk";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import generateFieldHash from "../utils/cryptoUtility.js";
dotenv.config();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const SQLFile = {
  async getClaudeResponse(prompt, contentBlocks) {
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
  },
  async setConfigFields(req, res, next) {
    const fields = res.locals.fields;
    const idsToDelete = res.locals.deletedIds;
    const translations = res.locals.translations;
    try {
      if (idsToDelete && idsToDelete.length > 0) {
        const placeholders = idsToDelete.map(() => "?").join(",");
        const deleteSql = `DELETE FROM config_fields WHERE id IN (${placeholders})`;

        await dbManager.query(deleteSql, idsToDelete);
      }
      let response;
      if (fields && fields.length > 0) {
        response = await dbManager.upsert("config_fields", fields);
      } else {
        return res.json({
          messageType: "E",
          message: "No fields provided to save.",
        });
      }
      if (translations && translations.length > 0) {
        const translation_response = await dbManager.upsert(
          "config_field_translations",
          translations,
        );
      }
      if (response.affectedRows > 0) {
        return res.json({
          messageType: "S",
          message: "Configuration fields saved successfully.",
        });
      } else {
        throw new Error(
          "No rows affected, failed to save configuration fields.",
        );
      }
    } catch (error) {
      console.error("Error saving configuration fields:", error);
      return res.json({
        messageType: "E",
        message: "Failed to save configuration fields.",
      });
    }
  },
  async getConfigFields(req, res, next) {
    try {
      const config_fields_response = await dbManager.read("config_fields");
      const translations_response = await dbManager.read(
        "config_field_translations",
      );
      const fieldsMap = config_fields_response.map((field) => {
        const translations = translations_response
          .filter((t) => t.field_id === field.id)
          .reduce((acc, t) => {
            acc[t.language_code] = t.translated_label;
            return acc;
          }, {});
        return {
          id: field.id,
          field_scope: field.field_scope,
          default_label: field.default_label,
          technical_name: field.technical_name,
          field_type: field.field_type,
          dropdown_options: field.dropdown_options,
          is_validate: field.is_validate,
          is_auto_populate: field.is_auto_populate,
          translations: translations,
        };
      });
      return res.json({
        messageType: "S",
        message: "Configuration fields retrieved successfully.",
        data: fieldsMap,
      });
    } catch (error) {
      return res.json({
        messageType: "E",
        message: "Failed to fetch configuration fields.",
      });
    }
  },
  async getDraftFields(req, res, next) {
    try {
      const draft_fields_response = await dbManager.read("config_fields");
      const fields_data = draft_fields_response.map((field) => ({
        id: field.id,
        field_scope: field.field_scope,
        default_label: field.default_label,
        technical_name: field.technical_name,
        field_type: field.field_type,
        dropdown_options: field.dropdown_options,
      }));
      return res.json({
        messageType: "S",
        message: "Draft fields retrieved successfully.",
        data: fields_data,
      });
    } catch (error) {
      return res.json({
        messageType: "E",
        message: "Failed to fetch draft fields.",
      });
    }
  },
  async uploadExpenseFile(req, res, next) {
    try {
      const uploadedFile = req.files[0];
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
3. Map the extracted values to the correct fields from ${HeaderString} and ${ItemString} and provide output as JSON
4. If anything is not in english translate it to english and then map to the correct field. If you cannot find a value for a field, use an empty string as the value.`; // Truncate to 10k chars

      const result = await SQLFile.getClaudeResponse(prompt, contentBlocks);
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

      const sealField = (val) => {
        const fallbackValue =
          val === null || val === undefined ? "" : String(val);
        return {
          value: fallbackValue,
          ai_hash: generateFieldHash(fallbackValue),
        };
      };
      const dynamic_header_data = {};
      if (parsedJson.Header) {
        for (const [fieldName, fieldValue] of Object.entries(
          parsedJson.Header,
        )) {
          dynamic_header_data[fieldName] = sealField(fieldValue);
        }
      }
      let dynamic_items_data = [];
      if (Array.isArray(parsedJson.Items)) {
        dynamic_items_data = parsedJson.Items.map((itemRow, index) => {
          const securedRow = {};
          securedRow.id = itemRow.id || `${Date.now()}_${index}`;

          for (const [fieldName, fieldValue] of Object.entries(itemRow)) {
            if (fieldName === "id") continue;
            securedRow[fieldName] = sealField(fieldValue);
          }
          return securedRow;
        });
      }
      res.status(200).json({
        messageType: "S",
        data: { dynamic_header_data, dynamic_items_data },
        fileName: req.files[0].filename,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ messageType: "E", message: err.message });
    }
  },
  async upload_to_ai(filename, contenttype, filedata) {
    try {
      let contentBlocks = [];
      if (!filename || !filedata) {
        throw new Error("No data found");
      }
      contentBlocks.push({
        type: "document",
        source: { type: "base64", media_type: contenttype, data: filedata },
      });
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
3. Map the extracted values to the correct fields from ${HeaderString} and ${ItemString} and provide output as JSON
4. If anything is not in english translate it to english and then map to the correct field. If you cannot find a value for a field, use an empty string as the value.`; // Truncate to 10k chars

      const result = await SQLFile.getClaudeResponse(prompt, contentBlocks);
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

      const sealField = (val) => {
        const fallbackValue =
          val === null || val === undefined ? "" : String(val);
        return {
          value: fallbackValue,
          ai_hash: generateFieldHash(fallbackValue),
        };
      };
      const dynamic_header_data = {};
      if (parsedJson.Header) {
        for (const [fieldName, fieldValue] of Object.entries(
          parsedJson.Header,
        )) {
          dynamic_header_data[fieldName] = sealField(fieldValue);
        }
      }
      let dynamic_items_data = [];
      if (Array.isArray(parsedJson.Items)) {
        dynamic_items_data = parsedJson.Items.map((itemRow, index) => {
          const securedRow = {};
          securedRow.id = itemRow.id || `${Date.now()}_${index}`;

          for (const [fieldName, fieldValue] of Object.entries(itemRow)) {
            if (fieldName === "id") continue;
            securedRow[fieldName] = sealField(fieldValue);
          }
          return securedRow;
        });
      }
      return {
        messageType: "S",
        data: { dynamic_header_data, dynamic_items_data },
      };
    } catch (error) {
      return { messageType: "E", message: error.message };
    }
  },
};

export default SQLFile;
