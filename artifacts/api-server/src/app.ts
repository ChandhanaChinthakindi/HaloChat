import express, { type Express, type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// Trust one level of reverse proxy (Railway / nginx) so req.ip reflects the real client IP.
app.set("trust proxy", 1);

app.use(helmet());

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
const allowedOrigin = process.env["CORS_ORIGIN"] ?? (process.env["NODE_ENV"] === "production" ? false : "*");
app.use(cors({ origin: allowedOrigin }));
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

app.use("/api", router);

// Global error handler — must be last, must have 4 params so Express recognises it as an error handler.
// Catches anything thrown by middleware or routes that wasn't caught locally.
// 4xx errors (e.g. 413 Payload Too Large from body-parser) are forwarded as-is.
// 5xx errors are normalised to a generic 500 to avoid leaking internals.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, "Unhandled error");
  if (res.headersSent) return;
  const status: number =
    typeof err.status === "number" ? err.status
    : typeof err.statusCode === "number" ? err.statusCode
    : 500;
  if (status >= 400 && status < 500) {
    res.status(status).json({ error: err.message ?? "Bad request" });
  } else {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default app;
