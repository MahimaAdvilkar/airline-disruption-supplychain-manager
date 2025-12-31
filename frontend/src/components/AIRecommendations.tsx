import { useEffect, useState } from "react";
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
        const response = await fetch(`http://localhost:8002/disruptions/${disruptionId}/recommendations`);
        if (!response.ok) {
          throw new Error('Failed to fetch recommendations');
        }
        const data = await response.json();
        setRecommendations(data.recommendations || []);
      } catch (err) {
        console.error('Error fetching AI recommendations:', err);
        setError('Unable to load AI recommendations. Please try again later.');
        setRecommendations([]);
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
