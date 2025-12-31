import { useState } from "react";
import { simulateDisruption } from "../api.js";
import "./CrisisSimulator.css";

const CRISIS_SCENARIOS = [
  {
    id: "weather",
    name: "Severe Weather - DEL Hub",
    description: "Simulate massive delays at Delhi hub due to fog",
    data: { flight_number: "AI191", airport: "DEL", delay_minutes: 180, reason: "SEVERE_WEATHER" }
  }
];

export function CrisisSimulator({ onCrisisTriggered }: { onCrisisTriggered: () => void }) {
  const [loading, setLoading] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [customData, setCustomData] = useState({
    flight_number: "",
    airport: "",
    delay_minutes: 60,
    reason: "OPERATIONAL"
  });

  const triggerScenario = async (scenario: typeof CRISIS_SCENARIOS[0]) => {
    if (scenario.id === "custom") {
      setShowCustom(true);
      return;
    }

    setLoading(true);
    try {
      await simulateDisruption(scenario.data!);
      onCrisisTriggered();
    } catch (error) {
      console.error("Failed to trigger crisis:", error);
      alert("Failed to simulate crisis");
    } finally {
      setLoading(false);
    }
  };

  const triggerCustom = async () => {
    if (!customData.flight_number || !customData.airport) {
      alert("Please fill all required fields");
      return;
    }

    setLoading(true);
    try {
      await simulateDisruption(customData);
      setShowCustom(false);
      onCrisisTriggered();
    } catch (error) {
      console.error("Failed to trigger custom crisis:", error);
      alert("Failed to simulate crisis");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="crisis-simulator">
      <div className="crisis-header">
        <h2>Crisis Simulation Control</h2>
        <p className="crisis-subtitle">Trigger disruption scenarios to test recovery systems</p>
      </div>

      <div className="scenario-grid">
        {CRISIS_SCENARIOS.map((scenario) => (
          <div key={scenario.id} className="scenario-card">
            <h3>{scenario.name}</h3>
            <p>{scenario.description}</p>
            <button
              onClick={() => triggerScenario(scenario)}
              disabled={loading}
              className="btn-scenario"
            >
              {loading ? "Triggering..." : "Activate Scenario"}
            </button>
          </div>
        ))}
      </div>

      {showCustom && (
        <div className="custom-modal">
          <div className="modal-content">
            <h3>Custom Disruption</h3>
            <div className="form-group">
              <label>Flight Number</label>
              <input
                type="text"
                placeholder="e.g., UA123"
                value={customData.flight_number}
                onChange={(e) => setCustomData({ ...customData, flight_number: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Airport Code</label>
              <input
                type="text"
                placeholder="e.g., LAX"
                maxLength={3}
                value={customData.airport}
                onChange={(e) => setCustomData({ ...customData, airport: e.target.value.toUpperCase() })}
              />
            </div>
            <div className="form-group">
              <label>Delay Minutes: {customData.delay_minutes}</label>
              <input
                type="range"
                min="30"
                max="480"
                step="30"
                value={customData.delay_minutes}
                onChange={(e) => setCustomData({ ...customData, delay_minutes: parseInt(e.target.value) })}
              />
            </div>
            <div className="form-group">
              <label>Reason</label>
              <select
                value={customData.reason}
                onChange={(e) => setCustomData({ ...customData, reason: e.target.value })}
              >
                <option value="WEATHER">Weather</option>
                <option value="TECHNICAL_FAILURE">Technical Failure</option>
                <option value="OPERATIONAL">Operational</option>
                <option value="CONGESTION">Congestion</option>
                <option value="CREW">Crew Issue</option>
              </select>
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowCustom(false)} className="btn-secondary">Cancel</button>
              <button onClick={triggerCustom} disabled={loading} className="btn-primary">
                {loading ? "Triggering..." : "Trigger Crisis"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
