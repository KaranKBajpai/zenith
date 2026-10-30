// The backend's address. Comes from VITE_API_URL in .env.development
// locally, and from Vercel's settings once deployed.
const API_URL = import.meta.env.VITE_API_URL;

// Call a GET endpoint on the backend and return its JSON.
// <T> = "the shape of the response", supplied by whoever calls this,
// e.g. apiGet<PassesResponse>("/api/passes").
export async function apiGet<T>(path: string): Promise<T> {
    const response = await fetch(`${API_URL}${path}`);

    // fetch only fails by itself if the backend can't be reached at all.
    // A 404 or 500 still succeeds, so we check the status ourselves
    if (!response.ok) {
        throw new Error(`GET ${path} failed with status ${response.status}`);
    }

    return (await response.json()) as T;
}