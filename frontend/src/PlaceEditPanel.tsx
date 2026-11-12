import { useState, type FormEvent } from "react";
import type { LocationListItem } from "./types";

type Props = {
    location: LocationListItem;
    canRemove: boolean;   // false when this is the only saved place
    busy: boolean;        // a save or remove is in flight
    error: string | null; // message from the last failed save/remove
    onSave: (nickname: string) => void;
    onRemove: () => void;
    onCancel: () => void;
};

// The panel under a row: rename the place, or remove it.
// It only shows the form and reports what was tapped. Locations.tsx
// does the actual requests (same pattern as SatelliteCard's onToggle).
function PlaceEditPanel({ location, canRemove, busy, error, onSave, onRemove, onCancel }: Props) {
    // What's typed in the box. Starts as the saved name. The panel is
    // drawn fresh every time it opens, so this always starts from it.
    const [draft, setDraft] = useState(location.nickname);

    // Removing takes two taps: the first asks, the second does it.
    const [confirming, setConfirming] = useState(false);

    // Spaces at the ends don't count (the backend strips them too).
    const trimmed = draft.trim();
    // Nothing to save if it's empty or the same as before.
    const canSave = trimmed !== "" && trimmed !== location.nickname;

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        // A form's default is to reload the page. Stop that.
        event.preventDefault();
        if (canSave) onSave(trimmed);
    }

    return (
        // Using a <form> means pressing Enter in the box also saves.
        <form className="edit-panel" onSubmit={handleSubmit}>
            <label className="edit-label" htmlFor={`name-${location.id}`}>
                Name
            </label>
            <input
                id={`name-${location.id}`}
                className="edit-input"
                value={draft}
                // Every keystroke updates draft, which redraws the box.
                onChange={(event) => setDraft(event.target.value)}
                disabled={busy}
            />

            {error && <p className="edit-error">{error}</p>}

            <div className="edit-actions">
                {/* The only submit button. Enter in the box presses this. */}
                <button type="submit" className="edit-save" disabled={busy || !canSave}>
                    Save
                </button>
                {/* type="button" so it doesn't also submit the form. */}
                <button type="button" className="edit-cancel" onClick={onCancel} disabled={busy}>
                    Cancel
                </button>
            </div>

            <div className="edit-remove">
                {!canRemove ? (
                    <p className="edit-hint">This is your only place, so it can't be removed.</p>
                ) : confirming ? (
                    // <> </> groups several elements without adding a wrapper.
                    <>
                        <p className="edit-hint">
                            Remove {location.nickname}? Its passes go with it.
                        </p>
                        <button type="button" className="edit-danger" onClick={onRemove} disabled={busy}>
                            Yes, remove
                        </button>
                        <button
                            type="button"
                            className="edit-cancel"
                            onClick={() => setConfirming(false)}
                            disabled={busy}
                        >
                            Keep it
                        </button>
                    </>
                ) : (
                    <button
                        type="button"
                        className="edit-danger-link"
                        onClick={() => setConfirming(true)}
                        disabled={busy}
                    >
                        Remove this place
                    </button>
                )}
            </div>
        </form>
    );
}

export default PlaceEditPanel;