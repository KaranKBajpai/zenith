import { Link } from "react-router";

// Placeholder: the real page comes in part 2.
function Satellites() {
    return (
        <main className="page">
            <Link to="/" className="back-link">
                ← Your week
            </Link>
            <h1>Followed satellites</h1>
            <p className="message">Coming next.</p>
        </main>
    );
}

export default Satellites;