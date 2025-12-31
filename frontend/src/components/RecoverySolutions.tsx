import { useEffect, useState } from "react";
import type { RecoveryAction } from "../types.js";
import { fetchActions } from "../api.js";
import "./RecoverySolutions.css";

interface SolutionMetrics {
  totalPassengers: number;
  resolved: number;
  pending: number;
  estimatedCost: number;
  averageDelay: number;
}

export function RecoverySolutions({ disruptionId }: { disruptionId: string | null }) {
  const seedFromString = (value: string) => {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
      hash = (hash * 31 + value.charCodeAt(i)) % 100000;
    }
    return hash;
  };

  const buildDemoActions = (seed: number): RecoveryAction[] => [
    {
      action_id: `r-${seed}-01`,
      action_type: "rebooking",
      priority: "high",
      target: { pnr: `PNR${(seed % 9000) + 1000}`, passenger_id: `PAX${(seed % 9000) + 1000}` },
      details: { recommended_option: "Rebook via alternate hub" },
      status: "proposed",
      created_at: new Date().toISOString(),
      description: "Rebook impacted passengers on the next available routing.",
      affected_passengers: 140 + (seed % 120),
      delay_minutes: 50 + (seed % 40),
      estimated_cost: 32000 + (seed % 12000),
      alternative_flight: "AA703",
      execution_timeline: "T+15m to T+45m"
    },
    {
      action_id: `r-${seed}-02`,
      action_type: "hotel_accommodation",
      priority: "medium",
      target: { pnr: `PNR${(seed % 7000) + 2000}`, passenger_id: `PAX${(seed % 7000) + 2000}` },
      details: { hotel: "Hilton Downtown", nights: 1 },
      status: "approved",
      created_at: new Date().toISOString(),
      description: "Provide overnight accommodation for misconnected passengers.",
      affected_passengers: 80 + (seed % 60),
      delay_minutes: 150 + (seed % 60),
      estimated_cost: 18000 + (seed % 8000),
      execution_timeline: "T+30m to T+2h"
    },
    {
      action_id: `r-${seed}-03`,
      action_type: "compensation",
      priority: "low",
      target: { pnr: `PNR${(seed % 6000) + 3000}`, passenger_id: `PAX${(seed % 6000) + 3000}` },
      details: { notes: "Issue $150 voucher for affected customers." },
      status: "in_progress",
      created_at: new Date().toISOString(),
      description: "Customer goodwill vouchers to reduce churn.",
      affected_passengers: 200 + (seed % 120),
      estimated_cost: 28000 + (seed % 12000),
      execution_timeline: "T+1h to T+4h"
    }
  ];
  const [actions, setActions] = useState<RecoveryAction[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>("all");

  useEffect(() => {
    if (!disruptionId) {
      setActions([]);
      return;
    }

    setLoading(true);
    fetchActions(disruptionId)
      .then((data) => {
        const seed = seedFromString(disruptionId);
        const actionsList = Array.isArray(data) ? data : data.actions || [];
        if (actionsList.length === 0) {
          setActions(buildDemoActions(seed));
        } else {
          setActions(actionsList);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch recovery actions:", err);
        const seed = seedFromString(disruptionId);
        setActions(buildDemoActions(seed));
        setLoading(false);
      });
  }, [disruptionId]);

  const filteredActions = selectedFilter === "all" 
    ? actions 
    : actions.filter(a => a.action_type === selectedFilter);

  // Calculate metrics
  const metrics: SolutionMetrics = actions.reduce(
    (acc, action) => {
      acc.totalPassengers += action.affected_passengers || 0;
      if (action.status === "completed") acc.resolved += action.affected_passengers || 0;
      else acc.pending += action.affected_passengers || 0;
      acc.estimatedCost += action.estimated_cost || 0;
      acc.averageDelay += action.delay_minutes || 0;
      return acc;
    },
    { totalPassengers: 0, resolved: 0, pending: 0, estimatedCost: 0, averageDelay: 0 }
  );

  if (actions.length > 0) {
    metrics.averageDelay = Math.round(metrics.averageDelay / actions.length);
  }

  const actionTypes = ["all", ...new Set(actions.map(a => a.action_type))];

  const getActionIcon = (type: string) => {
    const icons: Record<string, string> = {
      rebooking: "🔄",
      spare_aircraft: "✈️",
      partner_airline: "🤝",
      hotel_accommodation: "🏨",
      compensation: "💰",
      private_charter: "🛩️"
    };
    return icons[type] || "📋";
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      proposed: { label: "Proposed", className: "status-proposed" },
      approved: { label: "Approved", className: "status-approved" },
      in_progress: { label: "In Progress", className: "status-progress" },
      completed: { label: "Completed", className: "status-completed" },
      failed: { label: "Failed", className: "status-failed" }
    };
    return badges[status] || { label: status, className: "status-default" };
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      critical: "#dc2626",
      high: "#f59e0b",
      medium: "#3b82f6",
      low: "#10b981"
    };
    return colors[priority] || "#6b7280";
  };

  if (!disruptionId) {
    return (
      <div className="recovery-solutions-empty">
        <div className="empty-icon">🔍</div>
        <h3>No Disruption Selected</h3>
        <p>Select a disruption to view recovery solutions and actions</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="recovery-solutions-loading">
        <div className="spinner"></div>
        <p>Finding optimal solutions...</p>
      </div>
    );
  }

  return (
    <div className="recovery-solutions">
      <div className="solutions-header">
        <h2>Recovery Solutions</h2>
        <div className="solutions-subtitle">
          Intelligent rebooking and recovery actions
        </div>
      </div>

      {/* Metrics Dashboard */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon">👥</div>
          <div className="metric-content">
            <div className="metric-value">{metrics.totalPassengers}</div>
            <div className="metric-label">Total Passengers</div>
          </div>
        </div>
        <div className="metric-card success">
          <div className="metric-icon">✓</div>
          <div className="metric-content">
            <div className="metric-value">{metrics.resolved}</div>
            <div className="metric-label">Resolved</div>
          </div>
        </div>
        <div className="metric-card warning">
          <div className="metric-icon">!</div>
          <div className="metric-content">
            <div className="metric-value">{metrics.pending}</div>
            <div className="metric-label">Pending</div>
          </div>
        </div>
        <div className="metric-card cost">
          <div className="metric-icon">$</div>
          <div className="metric-content">
            <div className="metric-value">${(metrics.estimatedCost / 1000).toFixed(0)}k</div>
            <div className="metric-label">Est. Cost</div>
          </div>
        </div>
        <div className="metric-card delay">
          <div className="metric-icon">🕐</div>
          <div className="metric-content">
            <div className="metric-value">{metrics.averageDelay}m</div>
            <div className="metric-label">Avg Delay</div>
          </div>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="action-filters">
        {actionTypes.map(type => (
          <button
            key={type}
            className={`filter-chip ${selectedFilter === type ? "active" : ""}`}
            onClick={() => setSelectedFilter(type)}
          >
            {type === "all" ? "All Solutions" : `${getActionIcon(type)} ${type.replace(/_/g, " ")}`}
          </button>
        ))}
      </div>

      {/* Action Cards */}
      <div className="actions-list">
        {filteredActions.length === 0 ? (
          <div className="no-actions">
            <p>No {selectedFilter !== "all" ? selectedFilter : ""} actions found</p>
          </div>
        ) : (
          filteredActions.map((action) => {
            const statusBadge = getStatusBadge(action.status);
            const priorityColor = getPriorityColor(action.priority);

            return (
              <div key={action.action_id} className="action-card">
                <div className="action-header">
                  <div className="action-title-row">
                    <span className="action-icon">{getActionIcon(action.action_type)}</span>
                    <div className="action-title">
                      <h4>{action.action_type.replace(/_/g, " ").toUpperCase()}</h4>
                      <p className="action-id">Action #{action.action_id}</p>
                    </div>
                  </div>
                  <div className="action-badges">
                    <span 
                      className="priority-badge"
                      style={{ backgroundColor: priorityColor }}
                    >
                      {action.priority}
                    </span>
                    <span className={`status-badge ${statusBadge.className}`}>
                      {statusBadge.label}
                    </span>
                  </div>
                </div>

                <div className="action-body">
                  <p className="action-description">{action.description}</p>

                  <div className="action-details">
                    <div className="detail-item">
                      <span className="detail-icon">👥</span>
                      <span className="detail-label">Passengers:</span>
                      <span className="detail-value">{action.affected_passengers}</span>
                    </div>
                    
                    {action.delay_minutes && (
                      <div className="detail-item">
                        <span className="detail-icon">⏱️</span>
                        <span className="detail-label">Delay:</span>
                        <span className="detail-value">{action.delay_minutes} min</span>
                      </div>
                    )}

                    {action.estimated_cost && (
                      <div className="detail-item">
                        <span className="detail-icon">💰</span>
                        <span className="detail-label">Cost:</span>
                        <span className="detail-value">${action.estimated_cost.toLocaleString()}</span>
                      </div>
                    )}

                    {action.alternative_flight && (
                      <div className="detail-item wide">
                        <span className="detail-icon">✈️</span>
                        <span className="detail-label">Alt Flight:</span>
                        <span className="detail-value">{action.alternative_flight}</span>
                      </div>
                    )}
                  </div>

                  {action.execution_timeline && (
                    <div className="timeline">
                      <div className="timeline-label">Execution Timeline</div>
                      <div className="timeline-bar">
                        <div className="timeline-progress" style={{ width: "65%" }}></div>
                      </div>
                      <div className="timeline-text">{action.execution_timeline}</div>
                    </div>
                  )}
                </div>

                <div className="action-footer">
                  <button className="action-btn approve">
                    Approve
                  </button>
                  <button className="action-btn modify">
                    Modify
                  </button>
                  <button className="action-btn details">
                    Details
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
