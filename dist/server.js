var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import express from 'express';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import cors from 'cors';
dotenv.config({ override: true });
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
function verifyConnection() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Attempt to acquire a client from the pool
            const client = yield pool.connect();
            console.log('✅ Connected to PostgreSQL database');
            client.release(); // Release the client back to the pool
        }
        catch (error) {
            console.error('❌ Error connecting to the database:', error);
        }
    });
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
//# sourceMappingURL=server.js.map