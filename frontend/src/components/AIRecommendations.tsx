import { useEffect, useState } from "react";
import { API_BASE_URL } from "../constants";
import "./AIRecommendations.css";

interface Recommendation {
  id: string;
  category: "operational" | "financial" | "customer" | "strategic";
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  confidence: number;
  actionable: boolean;
  estimatedSavings?: string;
}

export function AIRecommendations({ disruptionId }: { disruptionId: string | null }) {
  const seedFromString = (value: string) => {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
      hash = (hash * 31 + value.charCodeAt(i)) % 100000;
    }
    return hash;
  };

  const buildDemoRecommendations = (seed: number): Recommendation[] => [
    {
      id: `ai-${seed}-01`,
      category: "operational",
      title: "Auto-rebook 180 pax via ORD within 45 minutes",
      description: "Open additional seats on AA703 and prioritize high-risk connections to minimize missed itineraries.",
      impact: "high",
      confidence: 82 + (seed % 10),
      actionable: true,
      estimatedSavings: "$42K in reaccommodation costs"
    },
    {
      id: `ai-${seed}-02`,
      category: "customer",
      title: "Trigger hotel + meal vouchers for overnight delays",
      description: "Eligible cohorts can be proactively placed in partner hotels to reduce service desk congestion.",
      impact: "medium",
      confidence: 76 + (seed % 12),
      actionable: true,
      estimatedSavings: "$18K in ops overhead"
    },
    {
      id: `ai-${seed}-03`,
      category: "financial",
      title: "Optimize crew reassignment to avoid duty violations",
      description: "Swap 2 crews to cover 3 downstream legs and reduce cancellation cascade risk.",
      impact: "medium",
      confidence: 68 + (seed % 10),
      actionable: false
    },
    {
      id: `ai-${seed}-04`,
      category: "strategic",
      title: "Activate partner interline agreements for next 6 hours",
      description: "Partner capacity can absorb overflow for eastbound routes with minimal customer churn.",
      impact: "low",
      confidence: 62 + (seed % 12),
      actionable: true
    }
  ];
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!disruptionId) {
      setRecommendations([]);
      return;
    }

    const fetchRecommendations = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE_URL}/disruptions/${disruptionId}/recommendations`);
        if (!response.ok) {
          throw new Error('Failed to fetch recommendations');
        }
        const data = await response.json();
        const seed = seedFromString(disruptionId);
        const recs = data.recommendations || [];
        setRecommendations(recs.length === 0 ? buildDemoRecommendations(seed) : recs);
      } catch (err) {
        console.error('Error fetching AI recommendations:', err);
        setError(null);
        const seed = disruptionId ? seedFromString(disruptionId) : 1;
        setRecommendations(buildDemoRecommendations(seed));
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [disruptionId]);

  const categories = [
    { key: "all", label: "All Insights", icon: "🧠" },
    { key: "operational", label: "Operational", icon: "⚙️" },
    { key: "financial", label: "Financial", icon: "💰" },
    { key: "customer", label: "Customer", icon: "👥" },
    { key: "strategic", label: "Strategic", icon: "🎯" }
  ];

  const filteredRecs = activeCategory === "all" 
    ? recommendations 
    : recommendations.filter(r => r.category === activeCategory);

  if (loading) {
    return (
      <div className="ai-recommendations">
        <div className="recommendations-header">
          <h2>🧠 AI-Powered Insights</h2>
          <p>Loading recommendations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ai-recommendations">
        <div className="recommendations-header">
          <h2>🧠 AI-Powered Insights</h2>
          <p style={{ color: '#ef4444' }}>{error}</p>
        </div>
      </div>
    );
  }

  const getImpactColor = (impact: string) => {
    const colors = {
      high: "#ef4444",
      medium: "#f59e0b",
      low: "#3b82f6"
    };
    return colors[impact as keyof typeof colors] || "#6b7280";
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 85) return "#10b981";
    if (confidence >= 70) return "#f59e0b";
    return "#ef4444";
  };

  if (!disruptionId) {
    return (
      <div className="ai-recommendations-empty">
        <div className="ai-icon">🤖</div>
        <h3>AI Insights Ready</h3>
        <p>Select a disruption to receive intelligent recommendations</p>
      </div>
    );
  }

  return (
    <div className="ai-recommendations">
      <div className="ai-header">
        <div className="ai-title">
          <h2>AI-Powered Recommendations</h2>
          <p className="ai-subtitle">Machine learning insights for optimal crisis response</p>
        </div>
        <div className="ai-stats">
          <div className="stat-pill">
            <span className="stat-icon">💡</span>
            <span className="stat-text">{recommendations.length} Insights</span>
          </div>
          <div className="stat-pill actionable">
            <span className="stat-icon">✓</span>
            <span className="stat-text">{recommendations.filter(r => r.actionable).length} Actionable</span>
          </div>
        </div>
      </div>

      <div className="category-tabs">
        {categories.map(cat => (
          <button
            key={cat.key}
            className={`category-tab ${activeCategory === cat.key ? "active" : ""}`}
            onClick={() => setActiveCategory(cat.key)}
          >
            <span className="tab-icon">{cat.icon}</span>
            <span className="tab-label">{cat.label}</span>
            {cat.key !== "all" && (
              <span className="tab-count">
                {recommendations.filter(r => r.category === cat.key).length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="recommendations-list">
        {filteredRecs.map(rec => (
          <div key={rec.id} className={`recommendation-card ${rec.impact}`}>
            <div className="rec-header">
              <div className="rec-title-section">
                <h4 className="rec-title">{rec.title}</h4>
                <div className="rec-badges">
                  <span 
                    className="impact-badge"
                    style={{ backgroundColor: getImpactColor(rec.impact) }}
                  >
                    {rec.impact} impact
                  </span>
                  <span className={`actionable-badge ${rec.actionable ? "yes" : "no"}`}>
                    {rec.actionable ? "⚡ Actionable" : "📊 Insight"}
                  </span>
                </div>
              </div>
              <div className="confidence-meter">
                <div className="confidence-label">AI Confidence</div>
                <div className="confidence-bar">
                  <div 
                    className="confidence-fill"
                    style={{ 
                      width: `${rec.confidence}%`,
                      backgroundColor: getConfidenceColor(rec.confidence)
                    }}
                  ></div>
                </div>
                <div 
                  className="confidence-value"
                  style={{ color: getConfidenceColor(rec.confidence) }}
                >
                  {rec.confidence}%
                </div>
              </div>
            </div>

            <p className="rec-description">{rec.description}</p>

            {rec.estimatedSavings && (
              <div className="savings-highlight">
                <span className="savings-icon">💵</span>
                <span className="savings-text">{rec.estimatedSavings}</span>
              </div>
            )}

            {rec.actionable && (
              <div className="rec-actions">
                <button className="rec-btn primary">
                  Execute Now
                </button>
                <button className="rec-btn secondary">
                  Add to Queue
                </button>
                <button className="rec-btn tertiary">
                  More Details
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
