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

  useEffect(() => {
    if (!disruptionId) {
      setRecommendations([]);
      return;
    }

    // Mock AI recommendations - in production, this would call your AI/ML service
    const mockRecommendations: Recommendation[] = [
      {
        id: "rec1",
        category: "operational",
        title: "Deploy Spare Aircraft from Atlanta Hub",
        description: "A Boeing 737-800 is available at ATL with 2-hour positioning time. This can service 85% of affected passengers on the cancelled JFK route.",
        impact: "high",
        confidence: 92,
        actionable: true,
        estimatedSavings: "$45k in compensation costs"
      },
      {
        id: "rec2",
        category: "customer",
        title: "Prioritize Premium Cabin Passengers",
        description: "58 First/Business class passengers detected. Immediate rebooking on partner airlines (Virgin Atlantic, Air France) available within 4 hours.",
        impact: "high",
        confidence: 88,
        actionable: true
      },
      {
        id: "rec3",
        category: "financial",
        title: "Negotiate Bulk Hotel Rates",
        description: "Contact Marriott Bonvoy for emergency corporate rates. Historical data shows 30% savings vs individual bookings for 150+ room nights.",
        impact: "medium",
        confidence: 85,
        actionable: true,
        estimatedSavings: "$12k on accommodations"
      },
      {
        id: "rec4",
        category: "operational",
        title: "Activate Code-Share Partners",
        description: "SkyTeam alliance partners have 12 available seats on similar routes in next 6 hours. Automated rebooking can process 45 passengers immediately.",
        impact: "high",
        confidence: 90,
        actionable: true
      },
      {
        id: "rec5",
        category: "strategic",
        title: "Implement Dynamic Pricing for Overflow",
        description: "92 passengers in 'flexible' cohort willing to wait 24-48hrs. Offer $200 vouchers + hotel vs $600 immediate rebooking cost.",
        impact: "medium",
        confidence: 78,
        actionable: true,
        estimatedSavings: "$37k net savings"
      },
      {
        id: "rec6",
        category: "customer",
        title: "Proactive Communication Campaign",
        description: "Send personalized SMS/email with rebooking options before passengers arrive at airport. Reduces call center load by 65%.",
        impact: "medium",
        confidence: 94,
        actionable: true
      },
      {
        id: "rec7",
        category: "operational",
        title: "Charter Private Jet for VIPs",
        description: "8 high-value customers identified (lifetime value >$50k each). NetJets has Citation X available for $28k vs $400k potential churn risk.",
        impact: "low",
        confidence: 82,
        actionable: true,
        estimatedSavings: "Prevents $372k churn risk"
      },
      {
        id: "rec8",
        category: "strategic",
        title: "Learn from Historical Pattern",
        description: "Similar weather-related JFK disruptions occurred 4 times in past 18 months. Consider pre-positioning spare aircraft during winter storm forecasts.",
        impact: "low",
        confidence: 76,
        actionable: false
      }
    ];

    setRecommendations(mockRecommendations);
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
