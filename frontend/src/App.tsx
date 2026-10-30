import { useEffect, useState } from "react";
import { apiGet } from "./api";

// Only the fields this test page uses. Full types come in Week 3.
type PassesResponse = {
  location: {
    nickname: string;
    timezone: string;
  };
  days: {
    date: string;
    passes: unknown[]; // we only count them here
  }[];
};

function App() {
  // The three states every data screen has:
  // data = null and error = null  -> still loading
  // error has a message           -> something failed
  // data has the response         -> success
  const [data, setData] = useState<PassesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Runs once when the page first appears (the empty [] means "only once").
  useEffect(() => {
    apiGet<PassesResponse>("/api/passes")
      .then(setData)
      .catch((err) => setError(String(err)));
  }, []);

  if (error) {
    return <p>Backend error: {error}</p>;
  }

  if (data === null) {
    return <p>Connecting to backend…</p>;
  }

  // Add up the passes across all 7 days.
  const totalPasses = data.days.reduce((sum, day) => sum + day.passes.length, 0);

  return (
    <main>
      <h1>Backend connected</h1>
      <p>
        Active location: {data.location.nickname} ({data.location.timezone})
      </p>
      <p>Visible passes this week: {totalPasses}</p>
    </main>
  );
}

export default App;