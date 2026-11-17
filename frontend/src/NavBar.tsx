import { Link, useLocation } from "react-router";
import { UserButton } from "@clerk/react";
import "./NavBar.css";

// ---- Icons (simple line drawings; currentColor = the text color around them) ----
// aria-hidden: screen readers skip them, since the label next to them says it all.

function CalendarIcon() {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
    );
}

function PlanetIcon() {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="5" />
            <ellipse cx="12" cy="12" rx="10" ry="3.5" transform="rotate(-25 12 12)" />
        </svg>
    );
}

function PinIcon() {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
            <circle cx="12" cy="9.5" r="2.5" />
        </svg>
    );
}

// The pages in the bar. To add Settings later, add one line here.
// label = the top bar's text; short = the phone tab's text.
const TABS = [
    { to: "/", label: "Your week", short: "Week", icon: <CalendarIcon /> },
    { to: "/satellites", label: "Satellites", short: "Satellites", icon: <PlanetIcon /> },
    { to: "/locations", label: "Places", short: "Places", icon: <PinIcon /> },
];

// Is this tab the current page?
// "Your week" also counts for Pass Detail (/passes/...), since that's where you came from.
function isActive(tabPath: string, currentPath: string): boolean {
    if (tabPath === "/") {
        return currentPath === "/" || currentPath.startsWith("/passes");
    }
    return currentPath.startsWith(tabPath);
}

function NavBar() {
    // The current address, e.g. "/passes/1389". Redraws when it changes.
    const { pathname } = useLocation();
    // During onboarding, show only the name and the avatar: finish setup first.
    const onboarding = pathname === "/welcome";

    return (
        <>
            {/* Top bar: shown in full on wide screens. On phones, only the avatar shows. */}
            <header className="topbar">
                <Link to="/" className="topbar-brand">
                    <span className="brand-dot" />
                    Zenith
                </Link>

                {!onboarding && (
                    <nav className="topbar-links" aria-label="Main">
                        {TABS.map((tab) => (
                            <Link
                                key={tab.to}
                                to={tab.to}
                                className={isActive(tab.to, pathname) ? "topbar-link active" : "topbar-link"}
                            >
                                {tab.label}
                            </Link>
                        ))}
                    </nav>
                )}

                {/* Clerk's avatar button: manage account / sign out */}
                <div className="topbar-account">
                    <UserButton />
                </div>
            </header>

            {/* Bottom tab bar: phones only (hidden on wide screens by the CSS). */}
            {!onboarding && (
                <nav className="tabbar" aria-label="Main">
                    {TABS.map((tab) => (
                        <Link
                            key={tab.to}
                            to={tab.to}
                            className={isActive(tab.to, pathname) ? "tabbar-link active" : "tabbar-link"}
                        >
                            <span className="tabbar-icon">{tab.icon}</span>
                            <span>{tab.short}</span>
                        </Link>
                    ))}
                </nav>
            )}
        </>
    );
}

export default NavBar;