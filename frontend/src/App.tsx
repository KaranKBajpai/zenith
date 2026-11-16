
import { BrowserRouter, Route, Routes } from "react-router";
import { Show, UserButton } from "@clerk/react";
import Home from "./Home";
import Locations from "./Locations";
import Satellites from "./Satellites";
import PassDetail from "./PassDetail";
import SignedOutPage from "./SignedOutPage";

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
                {/* Clerk's avatar button: account settings and Sign out.
                    Temporary spot; it moves into the navbar later. */}
                <div className="account-corner">
                    <UserButton />
                </div>

                {/* Which page shows for which address. */}
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/satellites" element={<Satellites />} />
                    <Route path="/locations" element={<Locations />} />
                    <Route path="/passes/:id" element={<PassDetail />} />
                </Routes>
            </Show>
        </BrowserRouter>
    );
}

export default App;