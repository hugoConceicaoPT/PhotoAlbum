import { apiFetch, apiJson, ApiError } from "./lib/apiClient";
import { config } from "./config";

export interface IAlbum {
    id?: string;
    name: string;
    user_id: string;
    created_at?: string;
}

export class WorkerAlbum {

    public async addAlbum(name: string): Promise<IAlbum> {
        const endpoint = `${config.serverAddress}/albums`;

        try {
            const response = await apiFetch(endpoint, {
                method: "POST",
                headers: {
                "Content-Type": "application/json",
                },
                body: JSON.stringify({ name }), // owner comes from the token (backend ignores any user_id)
            });

            if (!response.ok) {
                throw new ApiError(response.status);
            }

            const newAlbum: IAlbum = await response.json();
            return newAlbum;

        } catch (error) {
            console.error("Failed to add album", error);
            throw new Error("Unable to add album. Please try again later.");
        }
    }

    public async getAlbum(id: string): Promise<IAlbum> {
        const endpoint = `${config.serverAddress}/albums/${id}`;
        try {
            const response = await apiFetch(endpoint);
            if (!response.ok) {
                throw new ApiError(response.status);
            }

            const album: IAlbum = await response.json();
            return album;
        } catch (error) {
            console.error(`Failed to fetch Album for ID: ${id}`, error);
            throw new Error("Unable to retrieve album. Please try again later.");
        }
    }
    
    /** Albums of the authenticated user (GET /albums; the owner comes from the token, no user id is sent). */
    public async getMyAlbums(): Promise<IAlbum[]> {
        try {
            return await apiJson<IAlbum[]>(`${config.serverAddress}/albums`);
        } catch (error) {
            // Keep the status for 401 so the UI can send the user back to Login.
            if (error instanceof ApiError && error.status === 401) throw error;
            console.error("Failed to fetch albums", error);
            throw new Error("Unable to retrieve albums. Please try again later.");
        }
    }
    
    public async updateAlbum(album_id: string, name: string): Promise<IAlbum> {
        const endpoint = `${config.serverAddress}/albums/${album_id}`;

        try {
        const response = await apiFetch(endpoint, {
            method: "PUT",
            headers: {
            "Content-Type": "application/json",
            },
            body: JSON.stringify({ name }),
        });

        if (!response.ok) {
            throw new ApiError(response.status);
        }

        const updatedAlbum: IAlbum = await response.json();
        return updatedAlbum;
        } catch (error) {
        console.error(`Failed to update album ${album_id}`, error);
        throw new Error("Unable to update album. Please try again later.");
        }
    }

    public async deleteAlbum(id: string): Promise<void> {
        const endpoint = `${config.serverAddress}/albums/${id}`;

        try {
            const response = await apiFetch(endpoint, {
                method: "DELETE",
            });

            if (!response.ok) {
                throw new ApiError(response.status);
            }

            await response.json();
            console.log("Album deleted successfully");
        } catch (error) {
            console.error(`Failed to delete album ${id}`, error);
            throw new Error("Unable to delete album. Please try again later.");
        }
    }
}