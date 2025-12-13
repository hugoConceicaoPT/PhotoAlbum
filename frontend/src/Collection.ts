import { config } from "./config";

export interface ICollection {
    id?: number;
    album_id: number;
    name: string;
    description?: string | null;
    beginDate?: string | null;
    endDate?: string | null;
}

export class WorkerCollection {

    public async addCollection(album_id: string, name: string, description?: string | null, beginDate?: string | null, endDate?: string | null): Promise<ICollection> {
        const endpoint = `${config.serverAddress}/collections`;

        try {
            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ album_id, name, description, beginDate, endDate }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const newCollection: ICollection = await response.json();
            return newCollection;

        } catch (error) {
            console.error("Failed to add collection", error);
            throw new Error("Unable to add collection. Please try again later.");
        }
    }

    public async getCollectionsByAlbumId(album_id: number): Promise<ICollection[]> {
        const endpoint = `${config.serverAddress}/collections/album/${album_id}`;
        try {
            const response = await fetch(endpoint);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const collections: ICollection[] = await response.json();
            return collections;
        } catch (error) {
            console.error(`Failed to fetch Collections for Album: ${album_id}`, error);
            throw new Error("Unable to retrieve collections. Please try again later.");
        }
    }

    public async getCollectionsByUserId(user_id: number): Promise<ICollection[]> {
        const endpoint = `${config.serverAddress}/collections/album/${user_id}`;
        try {
            const response = await fetch(endpoint);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const collections: ICollection[] = await response.json();
            return collections;
        } catch (error) {
            console.error(`Failed to fetch Collections for User: ${user_id}`, error);
            throw new Error("Unable to retrieve collections. Please try again later.");
        }
    }

    public async getCollection(id: number): Promise<ICollection> {
        const endpoint = `${config.serverAddress}/collections/${id}`;
        try {
            const response = await fetch(endpoint);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const collection: ICollection = await response.json();
            return collection;
        } catch (error) {
            console.error(`Failed to fetch Collection: ${id}`, error);
            throw new Error("Unable to retrieve collection. Please try again later.");
        }
    }

    public async updateCollection(id: number, fields: Record<string, string>): Promise<ICollection> {
        if (Object.keys(fields).length === 0) {
            throw new Error("Nothing to update");
        }

        const endpoint = `${config.serverAddress}/collections/${id}`;

        try {
            const response = await fetch(endpoint, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(fields),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const updatedCollection = await response.json();
            return updatedCollection;
        } catch (error) {
            console.error(`Failed to update collection ${id}`, error);
            throw new Error("Unable to update collection. Please try again later.");
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

            const data = await response.json();
            console.log(data.message || "Album deleted successfully");
        } catch (error) {
            console.error(`Failed to delete album ${id}`, error);
            throw new Error("Unable to delete album. Please try again later.");
        }
    }

    public async deleteCollection(collectionId: number | string): Promise<void> {
        if (!collectionId) {
            throw new Error("Missing collectionId");
        }

        const endpoint = `${config.serverAddress}/collections/${collectionId}`;

        try {
            const response = await fetch(endpoint, {
                method: "DELETE",
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            await response.json();
            console.log("Collection deleted successfully");
        } catch (error) {
            console.error(`Failed to delete collection ${collectionId}`, error);
            throw new Error("Unable to delete collection. Please try again later.");
        }
    }
}