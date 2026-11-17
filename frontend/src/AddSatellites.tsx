import type { SatelliteListItem } from "./types";
import { plural } from "./format";
import SatelliteChecklist from "./SatelliteChecklist";

type AddSatellitesProps = {
    satellites: SatelliteListItem[]; // the whole catalog
    busyId: number | null; // which satellite is saving right now
    onToggle: (satellite: SatelliteListItem) => void; // follow/unfollow it
    onClose: () => void; // close the panel
};

function AddSatellites({ satellites, busyId, onToggle, onClose }: AddSatellitesProps) {
    const followedCount = satellites.filter((s) => s.is_followed).length;

    return (
        <section>
            <div className="add-header">
                <h1 className="page-title">Add satellites</h1>
                <button type="button" className="close-button" onClick={onClose}>
                    ✕
                </button>
            </div>

            <SatelliteChecklist satellites={satellites} busyId={busyId} onToggle={onToggle} />

            <div className="add-footer">
                <span className="message">
                    Following {plural(followedCount, "satellite")}. Changes save as you tap.
                </span>
                <button type="button" className="add-button" onClick={onClose}>
                    Done
                </button>
            </div>
        </section>
    );
}

export default AddSatellites;