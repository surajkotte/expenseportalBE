export const transformData = async (fieldData) => {
  try {
    const headerFields = (fieldData["header"] || []).map((field) => ({
      id: field?.id || uuidv4(),
      field_scope: field.field_scope || "HEADER",
      default_label: field.default_label,
      technical_name: field.technical_name,
      field_type: field.field_type,
      dropdown_options: field.dropdown_options,
      is_validate: field.is_validate,
      is_auto_populate: field.is_auto_populate,
    }));
    const itemFields = (fieldData["item"] || []).map((field) => ({
      id: field?.id || uuidv4(),
      field_scope: "ITEM",
      default_label: field.default_label,
      technical_name: field.technical_name,
      field_type: field.field_type,
      dropdown_options: field.dropdown_options,
      is_validate: field.is_validate,
      is_auto_populate: field.is_auto_populate,
    }));
    const itemTranslations =
      fieldData["item"]
        ?.filter((field) => Object.keys(field.translations || {}).length > 0)
        .flatMap((field) =>
          Object.entries(field.translations || {}).map(([lang, label]) => ({
            id: uuidv4(),
            field_id: itemFields.find(
              (ifield) => ifield.technical_name === field.technical_name,
            )?.id,
            language_code: lang,
            translated_label: label,
          })),
        ) || [];

    const headerTranslations =
      fieldData["header"]
        ?.filter((field) => Object.keys(field.translations || {}).length > 0)
        .flatMap((field) =>
          Object.entries(field.translations || {}).map(([lang, label]) => ({
            id: uuidv4(),
            field_id: headerFields.find(
              (hf) => hf.technical_name === field.technical_name,
            )?.id,
            language_code: lang,
            translated_label: label,
          })),
        ) || [];
    const translations = [...headerTranslations, ...itemTranslations];
    const fields = [...headerFields, ...itemFields];
    return { fields, translations };
  } catch (error) {
    console.error("Error transforming data:", error);
    throw error;
  }
};
