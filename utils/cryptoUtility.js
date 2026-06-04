import crypto from "crypto";
const HMAC_SECRET =
  process.env.HMAC_SECRET || "expense_portal_secret_pepper_secure_key_12345";
const generateFieldHash = (value) => {
  if (value === null || value === undefined) return "";
  const normalizedValue = String(value).trim();
  return crypto
    .createHmac("sha256", HMAC_SECRET)
    .update(normalizedValue)
    .digest("hex");
};

export default generateFieldHash;
