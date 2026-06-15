import path from "path";
import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import router from "./routes";
import { logger } from "./lib/logger";
import { authMiddleware } from "./middlewares/authMiddleware";

const app: Express = express();

// Set up security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https://api.dicebear.com", "https://*"],
        connectSrc: ["'self'", "https://*"],
      },
    },
  })
);

// Gzip compression for optimal page loading speeds
app.use(compression());

// Rate limiter for API routes (skipped in development mode)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV !== "production",
});
app.use("/api", limiter);

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
app.use(cors({ credentials: true, origin: true }));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(authMiddleware);

app.use("/api", router);

// Serve static frontend assets in production (for unified deployments on Render/Railway/VPS)
if (process.env.NODE_ENV === "production") {
  const publicPath = path.resolve(globalThis.__dirname || "", "../../connecting-neighbors/dist/public");
  // Cache static assets securely for 1 year
  app.use(
    express.static(publicPath, {
      maxAge: "1y",
      immutable: true,
    })
  );
  app.get("*", (req, res) => {
    if (req.path.startsWith("/api")) {
      res.status(404).json({ error: "API route not found" });
      return;
    }
    res.sendFile(path.join(publicPath, "index.html"));
  });
}

export default app;
