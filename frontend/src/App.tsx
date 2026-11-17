
import { BrowserRouter, Route, Routes } from "react-router";
import { Show, useAuth } from "@clerk/react";
import { setTokenGetter } from "./api";
import Home from "./Home";
import NavBar from "./NavBar";
import Locations from "./Locations";
import Satellites from "./Satellites";
import PassDetail from "./PassDetail";
import SignedOutPage from "./SignedOutPage";
import Onboarding from "./Onboarding";

// Hands Clerk's getToken to api.ts, so every request can carry the token.
// It draws nothing on screen.
function AuthBridge() {
    const { getToken } = useAuth();
    // Set during the draw, not in a useEffect, so it's guaranteed to be in
    // place before any page's useEffect sends its first request.
    setTokenGetter(getToken);
    return null;
}

// Which page shows for which address.
function App() {
    return (
        <BrowserRouter>
            {/* Signed out: show only the sign-in page. The routes below are inside the
              signed-in branch, so typing /locations or /passes/5 still lands here. */}
            <Show when="signed-out">
                <SignedOutPage />
            </Show>

            {/* Signed in: the real app. */}
            <Show when="signed-in">
                {/* Must come before the pages, so the token is ready for their requests. */}
                <AuthBridge />
                {/* Top bar on wide screens, tab bar on phones. Holds the avatar too. */}
                <NavBar />

                {/* Which page shows for which address. */}
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/satellites" element={<Satellites />} />
                    <Route path="/locations" element={<Locations />} />
                    <Route path="/passes/:id" element={<PassDetail />} />
                    <Route path="/welcome" element={<Onboarding />} />
                </Routes>
            </Show>
        </BrowserRouter>
    );
}

export default App;