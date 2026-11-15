// API base URL. Configure with VITE_API_URL (see frontend/.env).
// The backend listens on port 5000 by default (docs/api/auth-contract.md); 8080 is the Vite dev server.
export const config: { serverAddress: string } =
{
    serverAddress: import.meta.env.VITE_API_URL ?? "http://localhost:5000",
};
