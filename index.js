import cors from "cors";
import express from "express";
import axios from "axios";
import { Agent } from "https";
import bcrypt from "bcrypt";
import JWT from "jsonwebtoken";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import path from "path";
import userAuth from "./middleware/userAuth.js";
import RolesRouter from "./AdminRole/Roles.js";
import FiledsRouter from "./AdminRole/FieldMappings.js";
// import CreateDraftRouter from "./InvoiceProcessing/CreateDraft.js";
import DraftRouter from "./Drafts/Draft.js";
import { fileURLToPath } from "url";
import { router as put_router } from "./Routes/put_route.js";
import get_router from "./Routes/get_routes.js";
import post_router from "./Routes/post_route.js";
import dbManager from "./Database/SQLConnection.js";

async function initializeDatabase() {
  try {
    await dbManager.connect();
    console.log("Database connected successfully.");
  } catch (err) {
    console.error("Failed to connect to the database:", err);
    process.exit(1); // Exit the application if the database connection fails
  }
}

const app = express();
const agent = new Agent({ rejectUnauthorized: false });

app.use(cookieParser());
app.use(bodyParser.json());
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);

app.use("/Admin", RolesRouter);
app.use("/Admin/Fields", FiledsRouter);
// app.use("/draft", CreateDraftRouter);
//app.use("/api", DraftRouter);
app.use("/api", put_router);
app.use("/api", get_router);
app.use("/api", post_router);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/files", express.static(path.join(__dirname, "uploads")));

(async () => {
  try {
    await initializeDatabase();
    app.listen(3000, () => {
      console.log("Server is running on port 3000");
    });
  } catch (error) {
    console.log("Failed to initialize the application:", error);
    process.exit(1);
  }
})();
