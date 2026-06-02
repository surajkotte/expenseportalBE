import dbManager from "./SQLConnection.js";
import { v4 as uuidv4 } from "uuid";
export const SQLFile = {
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
};

export default SQLFile;
