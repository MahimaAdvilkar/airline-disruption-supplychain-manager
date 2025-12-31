import { useState } from "react";
import { CrisisSimulator } from "./components/CrisisSimulator.js";
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

  const handleCrisisTriggered = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleActivateScenario = async () => {
    setLoading(true);
    try {
      const scenarioData = { 
        flight_number: "AI191", 
        airport: "DEL", 
        delay_minutes: 180, 
        reason: "SEVERE_WEATHER" 
      };
      await simulateDisruption(scenarioData);
      setCrisisInfo("Severe Weather Crisis at DEL Hub - 180min delay activated");
      handleCrisisTriggered();
      setActiveMainTab("operations");
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
            {/* Flight Map - Full screen background */}
            <section className="section-map">
              <FlightMap crisisInfo={crisisInfo} />
            </section>
          </>
        )}

        {activeMainTab === "operations" && (
          <div className="operations-container">
            {/* Sub-tab Navigation */}
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

            {/* Operations Content */}
            <div className="operations-content">
              {activeSubTab === "overview" && (
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
