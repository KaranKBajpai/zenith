import { BrowserRouter, Route, Routes } from "react-router";
import Home from "./Home";
import Satellites from "./Satellites";

// Which page shows for which address.
function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/satellites" element={<Satellites />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;