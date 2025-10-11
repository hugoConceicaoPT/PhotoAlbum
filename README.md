# PhotoAlbum

## 📦 Prerequisites

Make sure you have installed the following on your system:

- Install [Node.js](https://nodejs.org/) (v18+ recommended).  
- Install [npm](https://www.npmjs.com/) (comes with Node.js).  
- Install [PostgreSQL](https://www.postgresql.org/) if you plan to use the database.

## ⚙️ Setup & Installation
```bash
git clone <your-repo-url>
cd photoalbum
npm install
```

## 🛡️ Security

1. **Create a `.env` file** in the root directory to store sensitive configuration such as database URLs and ports. Example:  
```env
PORT=3000
DATABASE_URL=postgres://username:password@localhost:5432/yourdatabase
```

## ▶️ Start the server
```bash
npm run dev
```
Compile the TypeScript code automatically and run the server, restarting it whenever you make changes.

## 🏗️ Architecture
![Architecture Diagram](./assets/architecture0.1.jpg)