import { useEffect, useState } from "react";
import type { Disruption } from "../types.js";
import { SEVERITY_LEVELS } from "../constants.js";
import { fetchDisruptions } from "../api.js";
import "./DisruptionOverview.css";

export function DisruptionOverview({ refreshTrigger, onSelectDisruption, selectedAirline }: {
  refreshTrigger: number;
  onSelectDisruption: (id: string) => void;
  selectedAirline?: string;
}) {
  const seedFromString = (value: string) => {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
      hash = (hash * 31 + value.charCodeAt(i)) % 100000;
    }
    return hash;
  };

  const buildDemoDisruptions = (): Disruption[] => {
    const airline = selectedAirline || "AA";
    const seed = seedFromString(airline);
    const airports = ["SFO", "ORD", "MIA", "DFW", "JFK", "LAX"];
    const regions = ["West Coast", "Midwest", "Southeast", "South Central", "Northeast", "West"];
    const idx = seed % airports.length;
    const idx2 = (seed + 2) % airports.length;
    const idx3 = (seed + 4) % airports.length;
    return [
      {
        disruption_id: `demo-${airline}-001`,
        severity: "CRITICAL",
        airport: airports[idx],
        region: regions[idx],
        primary_flight_number: `${airline}${700 + (seed % 20)}`,
        metrics: {
          delayed_flights_count: 14 + (seed % 8),
          cancelled_flights_count: 8 + (seed % 6),
          passengers_impacted_est: 900 + (seed % 500),
          connections_at_risk_est: 120 + (seed % 80)
        },
        last_updated: new Date().toISOString()
      },
      {
        disruption_id: `demo-${airline}-002`,
        severity: "HIGH",
        airport: airports[idx2],
        region: regions[idx2],
        primary_flight_number: `${airline}${710 + (seed % 30)}`,
        metrics: {
          delayed_flights_count: 8 + (seed % 6),
          cancelled_flights_count: 3 + (seed % 4),
          passengers_impacted_est: 520 + (seed % 280),
          connections_at_risk_est: 70 + (seed % 60)
        },
        last_updated: new Date().toISOString()
      },
      {
        disruption_id: `demo-${airline}-003`,
        severity: "MEDIUM",
        airport: airports[idx3],
        region: regions[idx3],
        primary_flight_number: `${airline}${720 + (seed % 40)}`,
        metrics: {
          delayed_flights_count: 4 + (seed % 5),
          cancelled_flights_count: 1 + (seed % 3),
          passengers_impacted_est: 220 + (seed % 180),
          connections_at_risk_est: 30 + (seed % 40)
        },
        last_updated: new Date().toISOString()
      }
    ];
  };
  const [disruptions, setDisruptions] = useState<Disruption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    loadDisruptions();
  }, [refreshTrigger]);

  const loadDisruptions = async () => {
    setLoading(true);
    try {
      const data = await fetchDisruptions();
      const items = data.items || [];
      if (items.length === 0) {
        const demoItems = buildDemoDisruptions();
        setDisruptions(demoItems);
        setSelectedId(demoItems[0].disruption_id);
        onSelectDisruption(demoItems[0].disruption_id);
      } else {
        setDisruptions(items);
      }
    } catch (error) {
      console.error("Failed to load disruptions:", error);
      const demoItems = buildDemoDisruptions();
      setDisruptions(demoItems);
      setSelectedId(demoItems[0].disruption_id);
      onSelectDisruption(demoItems[0].disruption_id);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (id: string) => {
    setSelectedId(id);
    onSelectDisruption(id);
  };

  const totalImpact = disruptions.reduce((sum, d) => sum + d.metrics.passengers_impacted_est, 0);
  const totalCancelled = disruptions.reduce((sum, d) => sum + d.metrics.cancelled_flights_count, 0);
  const totalDelayed = disruptions.reduce((sum, d) => sum + d.metrics.delayed_flights_count, 0);

  return (
    <div className="disruption-overview">
      <div className="overview-header">
        <div className="header-content">
          <h2>Active Disruptions</h2>
          <span className="disruption-count">{disruptions.length} Active</span>
        </div>
        <button onClick={loadDisruptions} className="btn-refresh" disabled={loading}>
          {loading ? "⟳" : "↻"} Refresh
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{totalImpact.toLocaleString()}</div>
          <div className="stat-label">Passengers Impacted</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalCancelled}</div>
          <div className="stat-label">Flights Cancelled</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalDelayed}</div>
          <div className="stat-label">Flights Delayed</div>
        </div>
      </div>

      <div className="disruption-list">
        {loading && <div className="loading-state">Loading disruptions...</div>}
        
        {!loading && disruptions.length === 0 && (
          <div className="empty-state">
            <p>No active disruptions</p>
            <span>All operations running smoothly</span>
          </div>
        )}

        {!loading && disruptions.map((disruption) => {
          const severity = SEVERITY_LEVELS[disruption.severity as keyof typeof SEVERITY_LEVELS] || SEVERITY_LEVELS.LOW;
          const isSelected = selectedId === disruption.disruption_id;

          return (
            <div
              key={disruption.disruption_id}
              className={`disruption-card ${isSelected ? "selected" : ""}`}
              onClick={() => handleSelect(disruption.disruption_id)}
            >
              <div className="card-header">
                <div className="header-left">
                  <span
                    className="severity-badge"
                    style={{ background: severity.color }}
                  >
                    {severity.icon} {severity.label}
                  </span>
                  <span className="airport-code">{disruption.airport}</span>
                </div>
                <span className="flight-number">{disruption.primary_flight_number}</span>
              </div>

              <div className="card-metrics">
                <div className="metric">
                  <span className="metric-value">{disruption.metrics.delayed_flights_count}</span>
                  <span className="metric-label">Delayed</span>
                </div>
                <div className="metric">
                  <span className="metric-value">{disruption.metrics.cancelled_flights_count}</span>
                  <span className="metric-label">Cancelled</span>
                </div>
                <div className="metric">
                  <span className="metric-value">{disruption.metrics.passengers_impacted_est}</span>
                  <span className="metric-label">Passengers</span>
                </div>
                <div className="metric">
                  <span className="metric-value">{disruption.metrics.connections_at_risk_est}</span>
                  <span className="metric-label">At Risk</span>
                </div>
              </div>

              <div className="card-footer">
                <span className="region-tag">{disruption.region}</span>
                <span className="timestamp">
                  {new Date(disruption.last_updated).toLocaleTimeString()}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
