import { apiFetch, ApiError } from "./lib/apiClient";
import { config } from "./config";

export interface IImage {
  id: string;
  collection_id: string;
  image_url: string;
  public_id: string;
}

export class WorkerImage {

  public async getImagesByCollection(collectionId: string): Promise<IImage[]> {
    const endpoint = `${config.serverAddress}/images/collection/${collectionId}`;

    try {
      const response = await apiFetch(endpoint);
      if (!response.ok) {
        throw new ApiError(response.status);
      }

      const images: IImage[] = await response.json();
      return images;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) throw error;
      console.error("Failed to fetch images", error);
      throw new Error("Unable to fetch images");
    }
  }

  public async uploadImages( collectionId: string, files: File[]): Promise<IImage[]> {
    const endpoint = `${config.serverAddress}/images/upload/${collectionId}`;

    const formData = new FormData();
    files.forEach((file) => formData.append("images", file));

    try {
      const response = await apiFetch(endpoint, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new ApiError(response.status);
      }

      const result = await response.json();
      return result.images as IImage[];
    } catch (error) {
      console.error("Failed to upload images", error);
      throw new Error("Unable to upload images");
    }
  }

  public async deleteImage(imageId: string): Promise<void> {
    const endpoint = `${config.serverAddress}/images/${imageId}`;

    try {
      const response = await apiFetch(endpoint, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new ApiError(response.status);
      }
    } catch (error) {
      console.error("Failed to delete image", error);
      throw new Error("Unable to delete image");
    }
  }
}