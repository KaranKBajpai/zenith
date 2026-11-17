import type { SatelliteListItem } from "./types";

type Props = {
    satellites: SatelliteListItem[]; // the whole catalog
    busyId: number | null;           // which satellite is saving right now
    onToggle: (satellite: SatelliteListItem) => void; // follow/unfollow it
    disabled?: boolean;              // grey out every row (e.g. a step that isn't open yet)
};

// The checkbox rows, shared by the Add satellites panel and Onboarding.
// Like PlaceEditPanel, it only reports taps; the parent does the requests.
function SatelliteChecklist({ satellites, busyId, onToggle, disabled = false }: Props) {
    return (
        // <> </> groups the rows without adding a wrapper element
        <>
            {satellites.map((s) => (
                // A <label> around the checkbox makes the whole row clickable
                <label key={s.id} className={s.is_followed ? "add-row followed" : "add-row"}>
                    <input
                        type="checkbox"
                        checked={s.is_followed}
                        onChange={() => onToggle(s)}
                        // Disabled while ANY request runs, so taps can't overlap
                        disabled={disabled || busyId !== null}
                    />
                    <span className="add-name">{s.name}</span>
                    {busyId === s.id && <span className="message">Saving…</span>}
                </label>
            ))}
        </>
    );
}

export default SatelliteChecklist;