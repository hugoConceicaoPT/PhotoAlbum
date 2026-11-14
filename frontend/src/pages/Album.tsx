import { useEffect, useState } from "react";
import AlbumCard from "../components/AlbumCard";
import Navbar from "../components/Navbar";
import { WorkerAlbum, type IAlbum } from "../Album";
import { WorkerCollection, type ICollection } from "../Collection";
import { WorkerImage, type IImage } from "../Image";

const workerAlbum = new WorkerAlbum();
const workerCollection = new WorkerCollection();
const workerImage = new WorkerImage();

interface AlbumWithImages {
  id: number;
  name: string;
  images: string[];
}

export default function Album() {
  const [albums, setAlbums] = useState<AlbumWithImages[]>([]);
  const userId = 1; // A substituir com o user real

  useEffect(() => {
    async function loadAlbums() {
      // 1) Pegar albums do user
      const albumsData: IAlbum[] = await workerAlbum.getAlbunsByUserId(userId);

      // 2) Para cada album, pegar as collections
      const albumsWithImages = await Promise.all(
        albumsData.map(async (album) => {
          const collections: ICollection[] =
            await workerCollection.getCollectionsByAlbumId(album.id!);

          // 3) Para cada collection, pegar as imagens
          const imagesUrls = await Promise.all(
            collections.map(async (collection) => {
              const images: IImage[] = await workerImage.getImagesByCollection(
                String(collection.id)
              );
              return images.map((img) => img.image_url);
            })
          );

          // 4) juntar todas imagens do album
          const allImages = imagesUrls.flat();

          return {
            id: album.id!,
            name: album.name,
            images: allImages,
          };
        })
      );

      setAlbums(albumsWithImages);
    }

    loadAlbums();
  }, [userId]);

  return (
    <>
      <Navbar />
      <div className="container mt-5">
        <div className="d-flex justify-content-between align-items-center mb-0">
          <h2 className="AlbumHeading ms-4 mb-0">Álbuns</h2>
          <div className="d-flex align-items-center mb-0">
            {/* ... */}
          </div>
        </div>

        <hr className="divisorAlbum mt-2" />

        <div className="row g-3">
          {albums.map((album) => (
            <div className="col-md-6" key={album.id}>
              <AlbumCard album={album} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
