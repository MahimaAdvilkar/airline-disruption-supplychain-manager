import { useEffect, useState } from "react";

type Disruption = {
  disruption_id: string;
  severity: string;
  airport: string;
  region: string;
  primary_flight_number: string;
  metrics: {
    delayed_flights_count: number;
    cancelled_flights_count: number;
    passengers_impacted_est: number;
    connections_at_risk_est: number;
  };
  last_updated: string;
};

function App() {
  const [items, setItems] = useState<Disruption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setError(null);
        const res = await fetch("http://127.0.0.1:8000/disruptions");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setItems(data.items ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h1>Airline Disruption Manager</h1>

      {loading && <p>Loading disruptions…</p>}
      {error && (
        <p style={{ color: "crimson" }}>
          Error loading disruptions: {error}
        </p>
      )}

      {!loading && !error && (
        <table border={1} cellPadding={8} style={{ marginTop: 12 }}>
          <thead>
            <tr>
              <th>Airport</th>
              <th>Flight</th>
              <th>Severity</th>
              <th>Delayed</th>
              <th>Cancelled</th>
              <th>Passengers</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {items.map((d) => (
              <tr key={d.disruption_id}>
                <td>{d.airport}</td>
                <td>{d.primary_flight_number}</td>
                <td>{d.severity}</td>
                <td>{d.metrics.delayed_flights_count}</td>
                <td>{d.metrics.cancelled_flights_count}</td>
                <td>{d.metrics.passengers_impacted_est}</td>
                <td>{new Date(d.last_updated).toLocaleTimeString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default App;
