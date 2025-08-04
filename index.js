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
import CreateDraftRouter from "./InvoiceProcessing/CreateDraft.js";
import DraftRouter from "./Drafts/Draft.js";
import { fileURLToPath } from "url";
import { router as put_router } from "./Routes/put_route.js";
import { router as get_router } from "./Routes/get_routes.js";

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
  })
);

app.use("/Admin", RolesRouter);
app.use("/Admin/Fields", FiledsRouter);
app.use("/draft", CreateDraftRouter);
//app.use("/api", DraftRouter);
app.use("/api", put_router);
app.use("/api", get_router);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/files", express.static(path.join(__dirname, "uploads")));

app.get("/login/:username/:password", async (req, res) => {
  const { username, password } = req.params;
  const urlval = `https://mu2r3d53.otxlab.net:44300/sap/opu/odata/sap/Z_LOGIN_SRV/LoginRequestCollection(username='${username}',password='${password}')`;
  try {
    const response = await axios({
      method: "get",
      url: urlval,
      auth: { username, password },
      httpsAgent: agent,
    });

    const passwordHash = await bcrypt.hash(password, 10);
    const token = JWT.sign({ id: passwordHash }, "ExpensePortal@2025", {
      expiresIn: "2h",
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    });

    res.status(200).json({ responseData: response.data });
  } catch (err) {
    res.status(401).json({ message: "Unable to login", error: err.message });
  }
});

app.get("/fetchUserDetails", userAuth, async (req, res) => {
  const urlval =
    "https://mu2r3d53.otxlab.net:44300/sap/opu/odata/sap/Z_LOGIN_SRV/UserDetailsSet";

  try {
    const response = await axios({
      method: "get",
      url: urlval,
      auth: {
        username: "ap_processor",
        password: "Otvim1234!",
      },
      httpsAgent: agent,
    });
    res.status(200).send({ responseData: response.data });
  } catch (err) {
    res.status(400).json({ messageType: "E", message: err.message });
  }
});

app.listen(3000, () => {
  console.log("listening to server 3000");
});
