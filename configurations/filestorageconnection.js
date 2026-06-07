import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import dotenv from "dotenv";
dotenv.config();
export const s3 = new S3Client({
  endpoint: process.env.AMAZON_S3_ENDPOINT,
  region: process.env.AMAZON_S3_REGION,
  credentials: {
    accessKeyId: process.env.AMAZON_S3_ACCESS_KEY,
    secretAccessKey: process.env.AMAZON_S3_SECRET_KEY,
  },
  forcePathStyle: true,
});

export const uploadToS3 = async (fileName, fileContent, fileType) => {
  try {
    const params = {
      Bucket: process.env.AMAZON_S3_BUCKET_NAME,
      Key: fileName,
      Body: fileContent,
      ContentType: fileType,
    };
    const command = new PutObjectCommand(params);
    const response = await s3.send(command);
    const internalPath = fileName;
    const httpUrl = `${process.env.AMAZON_S3_ENDPOINT}/${process.env.AMAZON_S3_BUCKET_NAME}/${fileName}`;
    return { internalPath, httpUrl };
  } catch (err) {
    console.error("Error uploading file to S3:", err);
    throw err;
  }
};
export const getBase64FromS3 = async (fileKey) => {
  try {
    const command = new GetObjectCommand({
      Bucket: process.env.AMAZON_S3_BUCKET_NAME,
      Key: fileKey,
    });
    const response = await s3.send(command);
    const byteArray = await response.Body.transformToByteArray();
    const buffer = Buffer.from(byteArray);
    const base64String = buffer.toString("base64");

    return { messageType: "S", data: base64String };
  } catch (error) {
    return {
      messageType: "E",
      message: error?.message || "Error fetching file from S3",
    };
  }
}
