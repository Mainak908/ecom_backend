import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { Resend } from "resend";
import helmet from "helmet";
import adminRoutes from "./controller/productController.js";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

dotenv.config();

const allowedOrigins = [
  process.env.CORSORIGIN,
  process.env.CORSORIGIN2,
  process.env.CORSORIGIN3,
];

export const resend = new Resend(process.env.RESEND_KEY);
const app = express();
const PORT = 3001;

app.use(helmet());
app.use(express.json({ limit: "20kb" }));
app.use(express.urlencoded({ limit: "20kb", extended: true }));
app.use(cookieParser(process.env.COOKIEP));
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
    maxAge: 11600,
  })
);

export const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

app.get("/generate-presigned-url", async (req, res) => {
  try {
    const { fileName, category } = req.query;

    const fileType = req.query.fileType as string;
    const keypart = fileType.split("/")[0];

    if (!fileName || !fileType || !category) {
      res.status(400).json({ error: "Missing required query parameters" });
      return;
    }

    const Key = `${keypart}s/${category}/${fileName}`;

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: Key,
      ContentType: fileType,
    });

    const url = await getSignedUrl(s3, command, { expiresIn: 60 });

    res.json({ url });
  } catch (err) {
    res.status(500).json({ error: err });
  }
});

app.use("/admin", adminRoutes);

app.listen(PORT, () => console.log("server is running on port ", PORT));
