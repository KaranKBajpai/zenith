import { useState, type FormEvent } from "react";
import { apiGet, apiPost, errorText } from "./api";
import { formatCoordinates } from "./format";
import type { GeocodeSearchResponse, Location, ReverseGeocodeResponse } from "./types";

type Props = {
    onAdded: () => void;  // called after a place is saved
    onCancel: () => void; // called when the user closes the panel
};

// A place the user has picked but not saved yet.
// name is null if we only have coordinates (town lookup found nothing).
type Candidate = {
    name: string | null;
    latitude: number;
    longitude: number;
};

// "Bozeman, Montana, US" -> "Bozeman". Used as the default nickname.
function townFrom(placeName: string): string {
    return placeName.split(",")[0].trim();
}

// The browser's location API calls a function when it's done, instead of
// returning a Promise. Wrapping it in a Promise lets us `await` it.
// resolve = "it worked, here's the position"; reject = "it failed".
function getDevicePosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
    });
}

// Location failures aren't Error objects, so errorText can't read them.
// Check for that type first and give a message a person can act on.
function locationErrorText(err: unknown): string {
    if (err instanceof GeolocationPositionError) {
        if (err.code === err.PERMISSION_DENIED) {
            return "Location access is off. Allow it in your browser, or search instead.";
        }
        return "Couldn't get your location. Try again, or search instead.";
    }
    return errorText(err);
}

// Round to 2 decimal places (about 1 km). 45.67943 -> 45.68
function roundCoord(value: number): number {
    return Math.round(value * 100) / 100;
}

function AddPlacePanel({ onAdded, onCancel }: Props) {
    const [query, setQuery] = useState("");
    // null = haven't searched yet. [] = searched, found nothing.
    const [results, setResults] = useState<Candidate[] | null>(null);
    // The place picked from search or "my location". null = not picked yet.
    const [chosen, setChosen] = useState<Candidate | null>(null);
    const [nickname, setNickname] = useState("");
    // What we're waiting on, shown on screen. null = not waiting.
    const [busyText, setBusyText] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // One true/false for "lock the buttons".
    const busy = busyText !== null;

    // Move to the "name it and save" step.
    function pick(candidate: Candidate) {
        setChosen(candidate);
        setNickname(candidate.name ? townFrom(candidate.name) : "My location");
        setError(null);
    }

    async function locateMe() {
        setError(null);
        setBusyText("Finding you…");
        try {
            const position = await getDevicePosition();
            const latitude = roundCoord(position.coords.latitude);
            const longitude = roundCoord(position.coords.longitude);

            // Ask our backend (which asks Nominatim) what town this is.
            // If that fails, we still have coordinates, so keep going.
            let name: string | null = null;
            try {
                const reverse = await apiGet<ReverseGeocodeResponse>(
                    `/api/geocode/reverse?lat=${latitude}&lon=${longitude}`,
                );
                name = reverse.name;
            } catch {
                // Town name is a nice-to-have. Coordinates are enough to save.
            }

            pick({ name, latitude, longitude });
        } catch (err) {
            setError(locationErrorText(err));
        } finally {
            setBusyText(null);
        }
    }

    // Runs only when the search form is submitted (button or Enter),
    // never while typing: Nominatim doesn't allow autocomplete.
    async function search(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const q = query.trim();
        if (q.length < 2) return; // the backend requires at least 2 characters

        setError(null);
        setBusyText("Searching…");
        try {
            const response = await apiGet<GeocodeSearchResponse>(
                // encodeURIComponent makes spaces, commas, & etc. safe in a URL.
                `/api/geocode/search?q=${encodeURIComponent(q)}`,
            );
            setResults(response.results);
        } catch (err) {
            setError(errorText(err));
        } finally {
            setBusyText(null);
        }
    }

    async function save(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (chosen === null || nickname.trim() === "") return;

        setError(null);
        // The backend works out the week's passes before answering.
        setBusyText("Saving and working out its passes…");
        try {
            await apiPost<Location>("/api/locations", {
                nickname: nickname.trim(),
                latitude: chosen.latitude,
                longitude: chosen.longitude,
                place_name: chosen.name,
            });
            // The parent closes this panel and refetches the list.
            // We're leaving, so no need to reset busyText.
            onAdded();
        } catch (err) {
            setError(errorText(err));
            setBusyText(null);
        }
    }

    return (
        // Reuses the edit panel's look from Locations.css.
        <div className="edit-panel">
            <p className="add-heading">Add a place</p>

            {chosen === null ? (
                // Step 1: find a place.
                <>
                    <button type="button" className="edit-cancel" onClick={locateMe} disabled={busy}>
                        Use my current location
                    </button>

                    <p className="edit-hint">or search for a town</p>

                    <form className="add-search" onSubmit={search}>
                        <input
                            className="edit-input"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="e.g. Bend, Oregon"
                            aria-label="Search for a place"
                            disabled={busy}
                        />
                        <button
                            type="submit"
                            className="edit-save"
                            disabled={busy || query.trim().length < 2}
                        >
                            Search
                        </button>
                    </form>

                    {results !== null &&
                        (results.length === 0 ? (
                            <p className="edit-hint">No places found. Try adding the state or country.</p>
                        ) : (
                            <div className="add-results">
                                {results.map((result, index) => (
                                    <button
                                        // The list never reorders, so position is a safe key.
                                        key={index}
                                        type="button"
                                        className="add-result"
                                        onClick={() => pick(result)}
                                        disabled={busy}
                                    >
                                        {result.name}
                                    </button>
                                ))}
                            </div>
                        ))}
                </>
            ) : (
                // Step 2: name it and save.
                <form className="add-confirm" onSubmit={save}>
                    <p className="edit-hint">
                        {chosen.name ?? formatCoordinates(chosen.latitude, chosen.longitude)}
                    </p>
                    <label className="edit-label" htmlFor="new-place-name">
                        Name
                    </label>
                    <input
                        id="new-place-name"
                        className="edit-input"
                        value={nickname}
                        onChange={(event) => setNickname(event.target.value)}
                        disabled={busy}
                    />
                    <div className="edit-actions">
                        <button
                            type="submit"
                            className="edit-save"
                            disabled={busy || nickname.trim() === ""}
                        >
                            Save place
                        </button>
                        {/* Back to step 1, keeping the search results. */}
                        <button
                            type="button"
                            className="edit-cancel"
                            onClick={() => setChosen(null)}
                            disabled={busy}
                        >
                            Back
                        </button>
                    </div>
                </form>
            )}

            {busyText && <p className="edit-hint">{busyText}</p>}
            {error && <p className="edit-error">{error}</p>}

            <div className="add-footer">
                {/* Required by OpenStreetMap's license: credit them where their data shows. */}
                <p className="add-credit">
                    Search by{" "}
                    <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
                        © OpenStreetMap contributors
                    </a>
                </p>
                <button type="button" className="edit-cancel" onClick={onCancel} disabled={busy}>
                    Close
                </button>
            </div>
        </div>
    );
}

export default AddPlacePanel;