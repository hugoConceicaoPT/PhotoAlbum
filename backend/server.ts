import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { neon } from "@neondatabase/serverless";

dotenv.config({override: true});

const app = express();
const port = 5000;

// Middleware
app.use(cors());
app.use(express.json());


const sql = neon(process.env.DATABASE_URL!);

// Define routes
app.get('/', (req, res) => {
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

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});