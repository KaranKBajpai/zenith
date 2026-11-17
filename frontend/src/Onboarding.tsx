import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { apiDelete, apiGet, apiPut, errorText } from "./api";
import type { LocationListResponse, SatelliteListResponse } from "./types";
import AddPlacePanel from "./AddPlacePanel";
import SatelliteChecklist from "./SatelliteChecklist";
import "./Onboarding.css";

// What a step looks like: still to do, done, or not open yet.
type StepState = "current" | "done" | "locked";

function Onboarding() {
    const [locations, setLocations] = useState<LocationListResponse | null>(null);
    const [satellites, setSatellites] = useState<SatelliteListResponse | null>(null);
    const [busyId, setBusyId] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    // Bump to refetch after adding a place or following a satellite.
    const [reloadKey, setReloadKey] = useState(0);
    const navigate = useNavigate();

    // The page is driven by what's actually saved on the backend, so a
    // refresh halfway through lands on the right step.
    useEffect(() => {
        Promise.all([
            apiGet<LocationListResponse>("/api/locations"),
            apiGet<SatelliteListResponse>("/api/satellites"),
        ])
            .then(([locationsData, satellitesData]) => {
                setLocations(locationsData);
                setSatellites(satellitesData);
            })
            .catch((err) => setError(errorText(err)));
    }, [reloadKey]);

    // Same as on the Followed Satellites page.
    async function setFollow(satelliteId: number, follow: boolean) {
        setBusyId(satelliteId);
        try {
            if (follow) {
                await apiPut(`/api/satellites/${satelliteId}/follow`);
            } else {
                await apiDelete(`/api/satellites/${satelliteId}/follow`);
            }
            setReloadKey((k) => k + 1);
        } catch (err) {
            setError(errorText(err));
        } finally {
            setBusyId(null);
        }
    }

    if (error) {
        return (
            <main className="page">
                <p className="message">Something went wrong: {error}</p>
            </main>
        );
    }

    if (locations === null || satellites === null) {
        return (
            <main className="page">
                <p className="message">Loading…</p>
            </main>
        );
    }

    // The place they've set (the first one is made active automatically).
    const place = locations.locations.find((l) => l.is_active) ?? null;
    const followedCount = satellites.satellites.filter((s) => s.is_followed).length;
    const hasPlace = place !== null;
    const ready = hasPlace && followedCount > 0;

    // Work out each step's look.
    const step1State: StepState = hasPlace ? "done" : "current";
    let step2State: StepState = "locked";
    if (hasPlace) {
        step2State = followedCount > 0 ? "done" : "current";
    }

    // The button's label, and the "Step N of 3" counter.
    let buttonLabel = "See my week";
    let stepNumber = 3;
    if (!hasPlace) {
        buttonLabel = "Set a location first";
        stepNumber = 1;
    } else if (followedCount === 0) {
        buttonLabel = "Pick a satellite first";
        stepNumber = 2;
    }

    return (
        <main className="page onboarding">
            <p className="eyebrow">Zenith</p>
            <h1 className="location-name">Know when a satellite crosses your sky.</h1>
            <p className="summary">
                Two things to set up: where you watch from, and what you want to watch.
                About a minute, and you can change both later.
            </p>

            <ol className="onboard-steps">
                {/* Step 1: a place */}
                <li className={`onboard-step ${step1State}`}>
                    <span className="onboard-num">{hasPlace ? "✓" : "1"}</span>
                    <div className="onboard-body">
                        <h2 className="onboard-title">Where do you watch from?</h2>
                        {hasPlace ? (
                            <p className="onboard-sub">
                                Watching from <strong>{place.nickname}</strong>. You can add more
                                places later.
                            </p>
                        ) : (
                            <>
                                <p className="onboard-sub">
                                    A satellite visible from one town can be below the horizon in
                                    the next one, so this has to be close to your real spot.
                                </p>
                                {/* embedded: no heading. No onCancel: no Close button. */}
                                <AddPlacePanel embedded onAdded={() => setReloadKey((k) => k + 1)} />
                            </>
                        )}
                    </div>
                </li>

                {/* Step 2: satellites */}
                <li className={`onboard-step ${step2State}`}>
                    <span className="onboard-num">{step2State === "done" ? "✓" : "2"}</span>
                    <div className="onboard-body">
                        <h2 className="onboard-title">What do you want to see?</h2>
                        <p className="onboard-sub">
                            Start with one. The space station is the easiest first sighting.
                        </p>
                        <SatelliteChecklist
                            satellites={satellites.satellites}
                            busyId={busyId}
                            // Ticked -> unfollow, unticked -> follow
                            onToggle={(s) => setFollow(s.id, !s.is_followed)}
                            disabled={!hasPlace}
                        />
                    </div>
                </li>

                {/* Step 3: go */}
                <li className={`onboard-step ${ready ? "current" : "locked"}`}>
                    <span className="onboard-num">3</span>
                    <div className="onboard-body">
                        <h2 className="onboard-title">Ready</h2>
                        <p className="onboard-sub">
                            {ready
                                ? "Your week is ready."
                                : "Finish the two steps above and this unlocks."}
                        </p>
                        <button
                            type="button"
                            className="onboard-go"
                            disabled={!ready}
                            onClick={() => navigate("/")}
                        >
                            {buttonLabel}
                        </button>
                    </div>
                </li>
            </ol>

            <p className="onboard-count">Step {stepNumber} of 3</p>
        </main>
    );
}

export default Onboarding;