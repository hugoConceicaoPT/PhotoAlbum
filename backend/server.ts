import dotenv from "dotenv";
dotenv.config();

import { createApp } from "./app.js";
import { loadConfig } from "./config/env.js";
import { createStackTokenVerifier } from "./lib/stackAuth.js";

const config = loadConfig();
const port = Number.parseInt(process.env.PORT ?? "5000", 10);

if (!config.stackProjectId) {
  console.error("STACK_PROJECT_ID is not set; refusing to start without token verification.");
  process.exit(1);
}
if (config.allowedOrigins.length === 0) {
  console.warn("CORS_ALLOWED_ORIGINS is empty: browsers on other origins will be blocked.");
}

const verify = createStackTokenVerifier({ projectId: config.stackProjectId, apiUrl: config.stackApiUrl });
const isDev = process.env.NODE_ENV === "development";

const app = createApp(config, verify, (a) => {
  if (!isDev) return;
  // Diagnostic route: exposes the PostgreSQL version, so it exists in development only.
  a.get("/db-version", async (_req, res) => {
    try {
      const { default: sql } = await import("./config/db.js");
      const result = await sql`SELECT version()`;
      res.status(200).send(`PostgreSQL version: ${result[0]?.version}`);
    } catch (err) {
      console.error(err);
      res.status(500).send("Database error");
    }
  });
});

if (isDev) {
  import("./migrations/migrate.js").then(() => {
    console.log("✅ Dev database ready");
  }).catch(console.error);
}

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
