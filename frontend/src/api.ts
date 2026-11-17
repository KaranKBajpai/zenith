// The backend's address. Comes from VITE_API_URL in .env.development
// locally, and from Vercel's settings once deployed.
const API_URL = import.meta.env.VITE_API_URL;

// ---- Sign-in token ----
// Clerk's getToken comes from a React hook (useAuth), and hooks only work
// inside components. These helpers are plain functions, so AuthBridge
// (in App.tsx) hands getToken over to us here.
type TokenGetter = () => Promise<string | null>;
let getToken: TokenGetter | null = null;

export function setTokenGetter(getter: TokenGetter | null): void {
    getToken = getter;
}

// The Authorization header for the current user, or no header if signed out.
// Clerk refreshes the token for us, so asking each time always gets a fresh one.
async function authHeaders(): Promise<Record<string, string>> {
    const token = getToken ? await getToken() : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
}

// Build the error for a failed request. FastAPI sends errors as
// {"detail": "..."}. If there's a readable sentence, use it, so the user
// sees "You need at least one location" instead of "status 409".
async function requestError(
    method: string,
    path: string,
    response: Response,
): Promise<Error> {
    try {
        const body = await response.json();
        // detail is a string for our own HTTPExceptions (404, 409).
        // For a 422 (failed validation) it's a list of problems,
        // which isn't readable, so we skip it.
        if (typeof body.detail === "string") {
            return new Error(body.detail);
        }
    } catch {
        // The body wasn't JSON (e.g. the server crashed). Fall through.
    }
    return new Error(`${method} ${path} failed with status ${response.status}`);
}

// Turn whatever was thrown into a message for the screen.
// String(err) would give "Error: You need..."; .message drops the "Error: ".
export function errorText(err: unknown): string {
    return err instanceof Error ? err.message : String(err);
}

// Call a GET endpoint on the backend and return its JSON.
// <T> = "the shape of the response", supplied by whoever calls this,
// e.g. apiGet<PassesResponse>("/api/passes").
export async function apiGet<T>(path: string): Promise<T> {
    const response = await fetch(`${API_URL}${path}`, {
        headers: { ...(await authHeaders()) },
    });

    // fetch only fails by itself if the backend can't be reached at all.
    // A 404 or 500 still "succeeds", so we check the status ourselves.
    if (!response.ok) {
        throw await requestError("GET", path, response);
    }

    return (await response.json()) as T;
}

// Call a PUT endpoint (e.g. follow, switch location) and return its JSON.
export async function apiPut<T>(path: string): Promise<T> {
    const response = await fetch(`${API_URL}${path}`, {
        method: "PUT",
        headers: { ...(await authHeaders()) },
    });
    
    if (!response.ok) {
        throw await requestError("PUT", path, response);
    }
    return (await response.json()) as T;
}

// Call a PATCH endpoint (change part of something, e.g. rename) with a
// JSON body, and return the JSON the backend sends back.
export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`${API_URL}${path}`, {
        method: "PATCH",
        // Tells FastAPI the body is JSON, so it can read it into LocationUpdate.
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        // fetch sends text, so turn the object into a JSON string.
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        throw await requestError("PATCH", path, response);
    }
    return (await response.json()) as T;
}

// Call a POST endpoint (create something) with a JSON body, and return
// the JSON the backend sends back. Same as apiPatch, different method.
export async function apiPost<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`${API_URL}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify(body),
    });
    if (!response.ok) {
        throw await requestError("POST", path, response);
    }
    return (await response.json()) as T;
}

// Call a DELETE endpoint (e.g. unfollow, remove location). Returns nothing:
// the backend answers 204 No Content, so there's no body to read.
export async function apiDelete(path: string): Promise<void> {
    const response = await fetch(`${API_URL}${path}`, {
        method: "DELETE",
        headers: { ...(await authHeaders()) },
    });
    
    if (!response.ok) {
        throw await requestError("DELETE", path, response);
    }
}