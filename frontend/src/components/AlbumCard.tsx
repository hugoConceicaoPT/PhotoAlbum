export default function AlbumCard() {
    return (
        <div
            className="card mb-3"
            style={{ width: "420px", height: "300px", overflow: "hidden" }}
        >
            <div className="card-body p-2">
                <h5 className="card-title mb-1">Férias</h5>
                <p className="card-text text-muted mb-2">2 Memórias</p>
            </div>

            <div className="row g-1 p-2" style={{ height: "220px" }}>
                {/* Left: Large image */}
                <div className="col-6 h-100">
                    <img
                        src="image1.jpg"
                        className="img-fluid rounded h-100"
                        style={{ objectFit: "cover", width: "100%" }}
                        alt="..."
                    />
                </div>

                {/* Right: 2x2 small images */}
                <div className="col-6 h-100">
                    <div className="row g-1 mb-1 h-50">
                        <div className="col-6 h-100">
                            <img
                                src="image2.png"
                                className="img-fluid rounded h-100"
                                style={{ objectFit: "cover", width: "100%" }}
                                alt="..."
                            />
                        </div>
                        <div className="col-6 h-100">
                            <img
                                src="image3.png"
                                className="img-fluid rounded h-100"
                                style={{ objectFit: "cover", width: "100%" }}
                                alt="..."
                            />
                        </div>
                    </div>
                    <div className="row g-1 h-50">
                        <div className="col-6 h-100">
                            <img
                                src="image4.png"
                                className="img-fluid rounded h-100"
                                style={{ objectFit: "cover", width: "100%" }}
                                alt="..."
                            />
                        </div>
                        <div className="col-6 h-100">
                            <img
                                src="image5.png"
                                className="img-fluid rounded h-100"
                                style={{ objectFit: "cover", width: "100%" }}
                                alt="..."
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
