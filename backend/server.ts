import express from 'express';
import cors from 'cors';
import sql from "./config/db.js";
import albumRoutes from "./routes/albumRoute.js";
import collectionRoutes from "./routes/collectionRoute.js";
import imageRoutes from "./routes/imageRoute.js";

const app = express();
const port = 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === "development") { 
  import("./migrations/migrate.js").then(() => { 
      console.log("✅ Dev database ready"); 
    }).catch(console.error); 
}

// Define routes
app.get('/', async (req, res) => {
  res.send('Hello from the server!');
});

app.get("/db-version", async (req, res) => {
  try {
    const result = await sql`SELECT version()`;
    const version = result[0]?.version;
    res.status(200).send(`PostgreSQL version: ${version}`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});

app.use("/albums", albumRoutes);         // /albums
app.use("/collections", collectionRoutes); // /collections
app.use("/images", imageRoutes);         // /images (upload, get, delete)

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});