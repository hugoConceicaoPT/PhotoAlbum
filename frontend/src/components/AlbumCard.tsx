import { useMemo } from "react";

interface AlbumCardProps {
    album: {
        id: number;
        name: string;
        images: string[];
    };
}

function renderImages(images: string[]) {
    const count = images.length;

    if (count === 0) {
        return (
            <div className="col-12 h-100 d-flex align-items-center justify-content-center">
                <p className="text-muted">Sem imagens</p>
            </div>
        );
    }

    // 1 IMAGE
    if (count === 1) {
        return (
            <div className="col-12 h-100">
                <img src={images[0]} className="w-100 h-100 object-fit-cover rounded" />
            </div>
        );
    }

    // 2 IMAGES
    if (count === 2) {
        return (
            <>
                <div className="col-6 h-100">
                    <img src={images[0]} className="w-100 h-100 object-fit-cover rounded" />
                </div>
                <div className="col-6 h-100">
                    <img src={images[1]} className="w-100 h-100 object-fit-cover rounded" />
                </div>
            </>
        );
    }

    // 3 IMAGES
    if (count === 3) {
        return (
            <>
                <div className="col-6 h-100">
                    <img src={images[0]} className="w-100 h-100 object-fit-cover rounded" />
                </div>
                <div className="col-3 h-100 d-grid gap-1">
                    <img src={images[1]} className="w-100 h-100 object-fit-cover rounded" />
                    <img src={images[2]} className="w-100 h-100 object-fit-cover rounded" />
                </div>
                <div className="col-3 h-100 d-grid gap-1">
                    <div className="h-100"></div>
                    <div className="h-100"></div>
                </div>
            </>
        );
    }

    // 4 IMAGES
    if (count === 4) {
        return (
            <>
                <div className="col-6 h-100">
                    <img src={images[0]} className="w-100 h-100 object-fit-cover rounded" />
                </div>

                <div className="col-3 h-100 d-grid gap-1">
                    <img src={images[1]} className="w-100 h-100 object-fit-cover rounded" />
                    <img src={images[2]} className="w-100 h-100 object-fit-cover rounded" />
                </div>

                <div className="col-3 h-100 d-grid gap-1">
                    <img src={images[3]} className="w-100 h-100 object-fit-cover rounded" />
                    <div className="h-100"></div>
                </div>
            </>
        );
    }

    // 5 IMAGES (MAX LAYOUT)
    return (
        <>
            <div className="col-6 h-100">
                <img src={images[0]} className="w-100 h-100 object-fit-cover rounded" />
            </div>

            <div className="col-3 h-100 d-grid gap-1">
                <img src={images[1]} className="w-100 h-100 object-fit-cover rounded" />
                <img src={images[2]} className="w-100 h-100 object-fit-cover rounded" />
            </div>

            <div className="col-3 h-100 d-grid gap-1">
                <img src={images[3]} className="w-100 h-100 object-fit-cover rounded" />
                <img src={images[4]} className="w-100 h-100 object-fit-cover rounded" />
            </div>
        </>
    );
}

export default function AlbumCard({ album }: AlbumCardProps) {
    const images = useMemo(() => {
        // Limita a 5 imagens, porque o layout máximo é 5
        return album.images.slice(0, 5);
    }, [album.images]);

    return (
        <div
            className="card mb-3 position-relative"
            style={{
                width: "420px",
                height: "300px",
                overflow: "hidden",
                boxShadow: "0 4px 6px -2px rgba(0,0,0,1)",
            }}
        >
            {/* Edit icon */}
            <div className="position-absolute top-0 end-0 m-2 bg-white rounded-circle p-2 shadow-sm">
                ✏️
            </div>

            <div className="card-body p-2">
                <h5 className="card-title mb-1">{album.name}</h5>
                <p className="card-text text-muted mb-2">
                    {album.images.length} Memórias
                </p>
            </div>

            <div className="row g-1 px-2" style={{ height: "220px" }}>
                {renderImages(images)}
            </div>
        </div>
    );
}
