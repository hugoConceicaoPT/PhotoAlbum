import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";

dotenv.config();

// Create a query function using the connection string
const sql = neon(process.env.DATABASE_URL!);

export default sql;