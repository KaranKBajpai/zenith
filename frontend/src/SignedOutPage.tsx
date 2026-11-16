import { SignInButton, SignUpButton } from "@clerk/react";

// What signed-out visitors see. A placeholder: the real Signed-Out
// Landing page (hero, how it works, etc.) replaces this later.
function SignedOutPage() {
    return (
        <main className="page signed-out">
            <p className="eyebrow">Zenith</p>
            <h1 className="location-name">Look up tonight.</h1>
            <p className="summary">
                Know exactly when satellites pass over you, and where to look.
            </p>

            <div className="signed-out-actions">
                {/* mode="modal": Clerk's form opens over this page.
                    The <button> inside is ours; Clerk just makes it open the form. */}
                <SignUpButton mode="modal">
                    <button className="edit-save">Create an account</button>
                </SignUpButton>
                <SignInButton mode="modal">
                    <button className="edit-cancel">Sign in</button>
                </SignInButton>
            </div>
        </main>
    );
}

export default SignedOutPage;