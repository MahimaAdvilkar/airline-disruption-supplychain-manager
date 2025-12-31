import { useEffect, useState } from "react";
import type { Cohort, RecoveryAction } from "../types.js";
import { fetchCohorts, fetchActions } from "../api.js";
import { COHORT_PRIORITIES } from "../constants.js";
import "./PassengerCohorts.css";

export function PassengerCohorts({ disruptionId }: { disruptionId: string | null }) {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [actions, setActions] = useState<RecoveryAction[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"cohorts" | "actions">("cohorts");

  useEffect(() => {
    if (disruptionId) {
      loadData();
    }
  }, [disruptionId]);

  const loadData = async () => {
    if (!disruptionId) return;

    setLoading(true);
    try {
      const [cohortsData, actionsData] = await Promise.all([
        fetchCohorts(disruptionId),
        fetchActions(disruptionId)
      ]);
      setCohorts(cohortsData.cohorts || []);
      setActions(actionsData.actions || []);
    } catch (error) {
      console.error("Failed to load cohorts/actions:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!disruptionId) {
    return (
      <div className="passenger-cohorts">
        <div className="empty-selection">
          <p>← Select a disruption to view passenger cohorts and recovery actions</p>
        </div>
      </div>
    );
  }

  const totalPassengers = cohorts.reduce((sum, c) => sum + c.passenger_count, 0);

  return (
    <div className="passenger-cohorts">
      <div className="cohorts-header">
        <h2>Passenger Management</h2>
        <div className="tab-switcher">
          <button
            className={activeTab === "cohorts" ? "active" : ""}
            onClick={() => setActiveTab("cohorts")}
          >
            Cohorts ({cohorts.length})
          </button>
          <button
            className={activeTab === "actions" ? "active" : ""}
            onClick={() => setActiveTab("actions")}
          >
            Actions ({actions.length})
          </button>
        </div>
      </div>

      {loading && <div className="loading-state">Loading...</div>}

      {!loading && activeTab === "cohorts" && (
        <div className="cohorts-content">
          <div className="cohorts-summary">
            <div className="summary-stat">
              <span className="stat-value">{totalPassengers}</span>
              <span className="stat-label">Total Passengers</span>
            </div>
            <div className="summary-stat">
              <span className="stat-value">{cohorts.length}</span>
              <span className="stat-label">Priority Groups</span>
            </div>
          </div>

          <div className="cohorts-list">
            {cohorts.map((cohort) => {
              const priority = COHORT_PRIORITIES[cohort.priority as keyof typeof COHORT_PRIORITIES];
              return (
                <div key={cohort.cohort_id} className="cohort-card">
                  <div className="cohort-header">
                    <span
                      className="priority-badge"
                      style={{ background: priority?.color }}
                    >
                      {cohort.priority}
                    </span>
                    <span className="priority-label">{priority?.label}</span>
                  </div>
                  <div className="cohort-details">
                    <div className="detail-row">
                      <span className="detail-label">Reason:</span>
                      <span className="detail-value">{cohort.reason.replace(/_/g, " ")}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Passengers:</span>
                      <span className="detail-value passengers">{cohort.passenger_count}</span>
                    </div>
                    <div className="detail-row description">
                      <span className="detail-description">{priority?.description}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!loading && activeTab === "actions" && (
        <div className="actions-content">
          {actions.length === 0 && (
            <div className="empty-actions">No recovery actions generated yet</div>
          )}

          {actions.map((action) => (
            <div key={action.action_id} className="action-card">
              <div className="action-header">
                <span className={`action-type action-${action.action_type.toLowerCase()}`}>
                  {action.action_type.replace(/_/g, " ")}
                </span>
                <span className={`action-status status-${action.status.toLowerCase()}`}>
                  {action.status}
                </span>
              </div>
              <div className="action-body">
                <div className="action-target">
                  <strong>PNR:</strong> {action.target.pnr} | <strong>Passenger:</strong> {action.target.passenger_id}
                </div>
                {action.details.recommended_option && (
                  <div className="action-recommendation">
                    <strong>Recommendation:</strong> {action.details.recommended_option}
                  </div>
                )}
                {action.details.hotel && (
                  <div className="action-details">
                    <strong>Hotel:</strong> {action.details.hotel} ({action.details.nights} night{action.details.nights === 1 ? "" : "s"})
                  </div>
                )}
                {action.details.notes && (
                  <div className="action-notes">{action.details.notes}</div>
                )}
              </div>
              <div className="action-footer">
                <span className="action-priority">Priority: {action.priority}</span>
                <span className="action-time">
                  {new Date(action.created_at).toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
