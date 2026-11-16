import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/react";
import "./index.css";
import App from "./App.tsx";

// The publishable key from .env.development. It's safe in the browser:
// it only tells Clerk which app this is. (The Secret key never goes here.)
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Fail fast with a clear message, like config.py does on the backend.
if (!PUBLISHABLE_KEY) {
    throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in frontend/.env.development");
}

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        {/* Everything inside can ask Clerk "who's signed in?" */}
        <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
            <App />
        </ClerkProvider>
    </StrictMode>,
);