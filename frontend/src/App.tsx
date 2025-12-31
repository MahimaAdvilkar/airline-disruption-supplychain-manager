import { useState } from "react";
import { AirlineSelector } from "./components/AirlineSelector.js";
import { FlightSelector } from "./components/FlightSelector.js";
import { DisruptionOverview } from "./components/DisruptionOverview.js";
import { PassengerCohorts } from "./components/PassengerCohorts.js";
import { FlightMap } from "./components/FlightMap.js";
import { RecoverySolutions } from "./components/RecoverySolutions.js";
import { AIRecommendations } from "./components/AIRecommendations.js";
import { simulateDisruption } from "./api.js";
import { API_BASE_URL } from "./constants";
import "./App.css";

function App() {
  const demoFlights = [
    { flightNumber: "AA701", airline: "AA", origin: "SFO", destination: "JFK", scheduledDeparture: new Date().toISOString(), status: "SCHEDULED" },
    { flightNumber: "AA702", airline: "AA", origin: "LAX", destination: "SEA", scheduledDeparture: new Date().toISOString(), status: "DELAYED" },
    { flightNumber: "AA703", airline: "AA", origin: "ORD", destination: "MIA", scheduledDeparture: new Date().toISOString(), status: "SCHEDULED" },
    { flightNumber: "AA704", airline: "AA", origin: "DFW", destination: "BOS", scheduledDeparture: new Date().toISOString(), status: "SCHEDULED" },
    { flightNumber: "AA705", airline: "AA", origin: "ATL", destination: "DEN", scheduledDeparture: new Date().toISOString(), status: "SCHEDULED" }
  ];

  const fallbackCoords = (code: string) => {
    let hash = 0;
    for (let i = 0; i < code.length; i += 1) {
      hash = (hash * 31 + code.charCodeAt(i)) % 100000;
    }
    const lat = ((hash % 120) - 60) + 0.5;
    const lon = (((hash / 120) % 360) - 180) + 0.5;
    return { lat, lon };
  };

  const buildDemoTrajectory = (flightNumber: string) => {
    const flight = flights24h.find(f => f.flightNumber === flightNumber);
    const originCode = flight?.origin || "SFO";
    const destCode = flight?.destination || "JFK";
    const origin = fallbackCoords(originCode);
    const dest = fallbackCoords(destCode);
    const now = new Date();
    const positions = Array.from({ length: 25 }).map((_, idx) => {
      const progress = idx / 24;
      return {
        timestamp: new Date(now.getTime() + (idx - 12) * 60 * 60 * 1000).toISOString(),
        latitude: origin.lat + (dest.lat - origin.lat) * progress,
        longitude: origin.lon + (dest.lon - origin.lon) * progress,
        altitude: idx === 0 || idx === 24 ? 0 : 32000,
        speed: idx === 0 || idx === 24 ? 0 : 460,
        hourOffset: idx - 12
      };
    });
    return {
      flightNumber,
      airline: flightNumber.slice(0, 2),
      origin: { code: originCode, name: originCode, lat: origin.lat, lon: origin.lon },
      destination: { code: destCode, name: destCode, lat: dest.lat, lon: dest.lon },
      departureTime: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      arrivalTime: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(),
      positions,
      currentPosition: positions[12]
    };
  };
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedDisruption, setSelectedDisruption] = useState<string | null>(null);
  const [activeMainTab, setActiveMainTab] = useState<"tracker" | "operations">("tracker");
  const [activeSubTab, setActiveSubTab] = useState<"overview" | "recovery" | "ai">("overview");
  const [crisisInfo, setCrisisInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedAirline, setSelectedAirline] = useState<string>("");
  const [flights24h, setFlights24h] = useState<any[]>([]);
  const [selectedFlight, setSelectedFlight] = useState<string>("");
  const [flightTrajectory, setFlightTrajectory] = useState<any>(null);

  const fetchFlightsForAirline = async (airlineCode: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/amadeus/all-flights?airline=${airlineCode}`);
      const data = await response.json();
      const flights = data.flights || [];
      if (flights.length === 0) {
        setFlights24h(demoFlights.map(f => ({ ...f, airline: airlineCode, flightNumber: airlineCode + f.flightNumber.slice(2) })));
      } else {
        setFlights24h(flights);
      }
    } catch (error) {
      console.error("Failed to fetch flights:", error);
      setFlights24h(demoFlights.map(f => ({ ...f, airline: airlineCode, flightNumber: airlineCode + f.flightNumber.slice(2) })));
    }
  };

  const handleCrisisTriggered = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleAirlineSelect = (airlineCode: string) => {
    setSelectedAirline(airlineCode);
    setFlights24h([]);
    setFlightTrajectory(null);
  };

  const handleSearchFlights = async () => {
    if (!selectedAirline) return;
    
    setLoading(true);
    try {
      await fetchFlightsForAirline(selectedAirline);
      setSelectedFlight("");
      setFlightTrajectory(null);
    } catch (error) {
      console.error("Failed to fetch flights:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFlightSelect = async (flightNumber: string) => {
    setSelectedFlight(flightNumber);
    try {
      const response = await fetch(`${API_BASE_URL}/amadeus/flight-trajectory/${flightNumber}`);
      if (!response.ok) {
        setFlightTrajectory(buildDemoTrajectory(flightNumber));
        return;
      }
      const data = await response.json();
      if (!data || !data.positions) {
        setFlightTrajectory(buildDemoTrajectory(flightNumber));
        return;
      }
      setFlightTrajectory(data);
    } catch (error) {
      console.error("Failed to fetch flight trajectory:", error);
      setFlightTrajectory(buildDemoTrajectory(flightNumber));
    }
  };

  const handleActivateScenario = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/simulate/activate-crisis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          crisis_type: "SEVERE_WEATHER",
          affected_airlines: ["AA", "DL", "UA"]
        })
      });
      if (!response.ok) {
        setCrisisInfo("Failed to activate scenario");
        return;
      }
      const data = await response.json();
      if (!data || !data.crisis) {
        setCrisisInfo("Failed to activate scenario");
        return;
      }
      
      setCrisisInfo(`CRISIS ACTIVATED: ${data.crisis.crisis_type} - Affecting ${data.crisis.affected_airlines.join(", ")}`);
      handleCrisisTriggered();
      setActiveMainTab("tracker");
      setSelectedFlight("");
      setFlightTrajectory(null);
      const targetAirline = selectedAirline || data.crisis.affected_airlines?.[0];
      if (targetAirline) {
        if (!selectedAirline) {
          setSelectedAirline(targetAirline);
        }
        await fetchFlightsForAirline(targetAirline);
      }
      setFlights24h(prev =>
        prev.map(flight => ({
          ...flight,
          status: "CANCELLED",
          delayMinutes: flight.delayMinutes ?? 0
        }))
      );
      
      // Removed page reload to avoid duplicate API calls
    } catch (error) {
      console.error("Failed to trigger crisis:", error);
      setCrisisInfo("Failed to activate scenario");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-strip">
          <div className="brand-compact">
            <h1>Airline Crisis Command Center</h1>
          </div>
          
          <div className="main-tab-navigation">
            <button 
              className={`main-tab-btn ${activeMainTab === "tracker" ? "active" : ""}`}
              onClick={() => setActiveMainTab("tracker")}
            >
              Flight Tracker
            </button>
            <button 
              className={`main-tab-btn ${activeMainTab === "operations" ? "active" : ""}`}
              onClick={() => setActiveMainTab("operations")}
            >
              Operations Center
            </button>
          </div>

          <div className="header-actions">
            <AirlineSelector onAirlineSelect={handleAirlineSelect} />
            <button 
              className="header-btn search-flights-btn"
              onClick={handleSearchFlights}
              disabled={!selectedAirline || loading}
            >
              {loading ? "Searching..." : "Search Flights"}
            </button>
            <div className="status-indicator">
              <span className="status-dot online"></span>
              <span className="status-text">All Systems Operational</span>
            </div>
            <button 
              className="header-btn activate-crisis-btn"
              onClick={handleActivateScenario}
              disabled={loading}
            >
              {loading ? "Activating..." : "Activate Scenario"}
            </button>
            <button className="header-btn">
              Settings
            </button>
          </div>
        </div>
      </header>

      <main className="app-main">
        {activeMainTab === "tracker" && (
          <>
            <section className="section-map">
              <FlightMap 
                crisisInfo={crisisInfo} 
                flights24h={flights24h} 
                selectedAirline={selectedAirline}
                flightTrajectory={flightTrajectory}
                onFlightSelect={handleFlightSelect}
              />
            </section>
          </>
        )}

        {activeMainTab === "operations" && (
          <div className="operations-container">
            <div className="sub-tab-navigation">
              <button 
                className={`sub-tab-btn ${activeSubTab === "overview" ? "active" : ""}`}
                onClick={() => setActiveSubTab("overview")}
              >
                Disruptions & Passengers
              </button>
              <button 
                className={`sub-tab-btn ${activeSubTab === "recovery" ? "active" : ""}`}
                onClick={() => setActiveSubTab("recovery")}
              >
                Recovery Solutions
              </button>
              <button 
                className={`sub-tab-btn ${activeSubTab === "ai" ? "active" : ""}`}
                onClick={() => setActiveSubTab("ai")}
              >
                AI Recommendations
              </button>
            </div>

            <div className="operations-content">
              {activeSubTab === "overview" && (
                <>
                  <AirlineSelector onAirlineSelect={handleAirlineSelect} />
                  <div className="operations-grid">
                    <section className="section-disruptions">
                      <DisruptionOverview 
                        refreshTrigger={refreshTrigger}
                        onSelectDisruption={setSelectedDisruption}
                        selectedAirline={selectedAirline}
                      />
                    </section>

                    <section className="section-cohorts">
                      <PassengerCohorts disruptionId={selectedDisruption} />
                    </section>
                  </div>
                </>
              )}

              {activeSubTab === "recovery" && (
                <section className="section-recovery">
                  <RecoverySolutions disruptionId={selectedDisruption} />
                </section>
              )}

              {activeSubTab === "ai" && (
                <section className="section-ai">
                  <AIRecommendations disruptionId={selectedDisruption} />
                </section>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
