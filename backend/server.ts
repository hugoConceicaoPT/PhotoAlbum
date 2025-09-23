import express from 'express';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import cors from 'cors';
dotenv.config({override: true});
const app = express();
const port = 5000;

const pool = new Pool({
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
});


// Middleware
app.use(cors());
app.use(express.json());

async function verifyConnection(): Promise<void> {
  try {
    // Attempt to acquire a client from the pool
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL database');
    client.release(); // Release the client back to the pool
  } catch (error) {
    console.error('❌ Error connecting to the database:', error);
  }
}

// Immediately verify connection upon module load.
verifyConnection();

// Define routes
app.get('/', (req, res) => {
  res.send('Hello from the server!');
});
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});