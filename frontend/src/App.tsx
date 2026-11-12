import { BrowserRouter, Route, Routes } from "react-router";
import Home from "./Home";
import Locations from "./Locations";
import Satellites from "./Satellites";

// Which page shows for which address.
function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/satellites" element={<Satellites />} />
                <Route path="/locations" element={<Locations />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;