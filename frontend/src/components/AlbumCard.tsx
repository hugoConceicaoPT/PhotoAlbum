export default function AlbumCard() {
    return (
        <div
            className="card mb-3"
            style={{ width: "420px", height: "300px", overflow: "hidden", boxShadow: "0 4px 6px -2px rgba(0,0,0,1)" }}
        >
            <div className="card-body p-2">
                <h5 className="card-title mb-1">Férias</h5>
                <p className="card-text text-muted mb-2">2 Memórias</p>
            </div>

            <div className="row p-1 g-1 mb-2 mx-1" style={{ height: "220px" }}>
                {/* Left: Large image */}
                <div className="col-6 h-100">
                    <img
                        src="image1.jpg"
                        className="w-100 h-100"
                        style={{ objectFit: "cover", borderBottomLeftRadius: "8px" }}
                        alt=""
                    />
                </div>

                {/* Right column 1 */}
                <div
                    className="col-3 h-100 d-grid row-gap-1"
                    style={{ gridTemplateRows: "1fr 1fr" }}
                >
                    <img
                        src="image2.jpg"
                        className="w-100 h-100"
                        style={{ objectFit: "cover" }}
                        alt=""
                    />
                    <img
                        src="image3.jpg"
                        className="w-100 h-100"
                        style={{ objectFit: "cover" }}
                        alt=""
                    />
                </div>

                {/* Right column 2 */}
                <div
                    className="col-3 h-100 d-grid row-gap-1"
                    style={{ gridTemplateRows: "1fr 1fr" }}
                >
                    <div className="img-cell">
                        <img src="image4.jpg" alt="" />
                    </div>

                    <div className="img-cell">
                        <img src="image5.jpg" alt="" />
                    </div>
                </div>


            </div>
        </div>
    );
}
