import { useState } from "react";
import { AirlineSelector } from "./components/AirlineSelector.js";
import { FlightSelector } from "./components/FlightSelector.js";
import { DisruptionOverview } from "./components/DisruptionOverview.js";
import { PassengerCohorts } from "./components/PassengerCohorts.js";
import { FlightMap } from "./components/FlightMap.js";
import { RecoverySolutions } from "./components/RecoverySolutions.js";
import { AIRecommendations } from "./components/AIRecommendations.js";
import { simulateDisruption } from "./api.js";
import "./App.css";

function App() {
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
      const response = await fetch(`http://localhost:8002/amadeus/all-flights?airline=${selectedAirline}`);
      const data = await response.json();
      setFlights24h(data.flights || []);
    } catch (error) {
      console.error("Failed to fetch flights:", error);
      setFlights24h([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFlightSelect = async (flightNumber: string) => {
    setSelectedFlight(flightNumber);
    try {
      const response = await fetch(`http://localhost:8002/amadeus/flight-trajectory/${flightNumber}`);
      const data = await response.json();
      setFlightTrajectory(data);
    } catch (error) {
      console.error("Failed to fetch flight trajectory:", error);
      setFlightTrajectory(null);
    }
  };

  const handleActivateScenario = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:8002/simulate/activate-crisis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          crisis_type: "SEVERE_WEATHER",
          affected_airlines: ["AA", "DL", "UA"]
        })
      });
      
      const data = await response.json();
      
      setCrisisInfo(`CRISIS ACTIVATED: ${data.crisis.crisis_type} - Affecting ${data.crisis.affected_airlines.join(", ")}`);
      handleCrisisTriggered();
      setActiveMainTab("tracker");
      
      setTimeout(() => {
        window.location.reload();
      }, 1000);
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
