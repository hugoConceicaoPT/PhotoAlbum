import { config } from "./config";

export interface IAlbum {
    id?: number,
    name: string;
    user_id: string;
}

export class WorkerAlbum {

    public async addAlbum(name: string, user_id: string): Promise<IAlbum> {
        const endpoint = `${config.serverAddress}/albums`;

        try {
            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                "Content-Type": "application/json",
                },
                body: JSON.stringify({ name, user_id }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const newAlbum: IAlbum = await response.json();
            return newAlbum;

        } catch (error) {
            console.error("Failed to add album", error);
            throw new Error("Unable to add album. Please try again later.");
        }
    }

    public async getAlbum(id: number): Promise<IAlbum> {
        const endpoint = `${config.serverAddress}/albums/${id}`;
        try {
            const response = await fetch(endpoint);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const album: IAlbum = await response.json();
            return album;
        } catch (error) {
            console.error(`Failed to fetch Album for ID: ${id}`, error);
            throw new Error("Unable to retrieve album. Please try again later.");
        }
    }
    
    public async getAlbumByUserId(user_id: number): Promise<IAlbum[]> {
        const endpoint = `${config.serverAddress}/albums/user/${user_id}`;
        try {
            const response = await fetch(endpoint);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const album: IAlbum[] = await response.json();
            return album;
        } catch (error) {
            console.error(`Failed to fetch Album for user: ${user_id}`, error);
            throw new Error("Unable to retrieve album. Please try again later.");
        }
    }
    
    public async updateAlbum(album_id: number, name: string): Promise<IAlbum> {
        const endpoint = `${config.serverAddress}/albums/${album_id}`;

        try {
        const response = await fetch(endpoint, {
            method: "PUT",
            headers: {
            "Content-Type": "application/json",
            },
            body: JSON.stringify({ name }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const updatedAlbum: IAlbum = await response.json();
        return updatedAlbum;
        } catch (error) {
        console.error(`Failed to update album ${album_id}`, error);
        throw new Error("Unable to update album. Please try again later.");
        }
    }

    public async deleteAlbum(id: number): Promise<void> {
        const endpoint = `${config.serverAddress}/albums/${id}`;

        try {
            const response = await fetch(endpoint, {
                method: "DELETE",
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            await response.json();
            console.log("Album deleted successfully");
        } catch (error) {
            console.error(`Failed to delete album ${id}`, error);
            throw new Error("Unable to delete album. Please try again later.");
        }
    }
}