import { useEffect, useState } from "react";
import type { Cohort, RecoveryAction } from "../types.js";
import { fetchCohorts, fetchActions } from "../api.js";
import { COHORT_PRIORITIES } from "../constants.js";
import "./PassengerCohorts.css";

export function PassengerCohorts({ disruptionId }: { disruptionId: string | null }) {
  const seedFromString = (value: string) => {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
      hash = (hash * 31 + value.charCodeAt(i)) % 100000;
    }
    return hash;
  };

  const buildDemoCohorts = (seed: number): Cohort[] => [
    { cohort_id: `c-${seed}-1`, priority: "P1", reason: "UNACCOMPANIED_MINOR", passenger_count: 35 + (seed % 12) },
    { cohort_id: `c-${seed}-2`, priority: "P2", reason: "CONNECTING_INTERNATIONAL", passenger_count: 150 + (seed % 80) },
    { cohort_id: `c-${seed}-3`, priority: "P3", reason: "FAMILY_GROUP", passenger_count: 200 + (seed % 90) }
  ];

  const buildDemoActions = (seed: number): RecoveryAction[] => [
    {
      action_id: `a-${seed}-01`,
      action_type: "REBOOKING",
      priority: "HIGH",
      target: { pnr: `PNR${(seed % 9000) + 1000}`, passenger_id: `PAX${(seed % 9000) + 1000}` },
      details: { recommended_option: "Rebook via alternate hub", notes: "Auto-assign seats 12A/12B" },
      status: "PROPOSED",
      created_at: new Date().toISOString()
    },
    {
      action_id: `a-${seed}-02`,
      action_type: "HOTEL_ACCOMMODATION",
      priority: "MEDIUM",
      target: { pnr: `PNR${(seed % 7000) + 2000}`, passenger_id: `PAX${(seed % 7000) + 2000}` },
      details: { hotel: "Hyatt Regency", nights: 1, notes: "Meal voucher included" },
      status: "APPROVED",
      created_at: new Date().toISOString()
    }
  ];
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
      const seed = seedFromString(disruptionId);
      const [cohortsData, actionsData] = await Promise.all([
        fetchCohorts(disruptionId),
        fetchActions(disruptionId)
      ]);
      const cohortsList = cohortsData.cohorts || [];
      const actionsList = actionsData.actions || [];
      if (cohortsList.length === 0 && actionsList.length === 0) {
        setCohorts(buildDemoCohorts(seed));
        setActions(buildDemoActions(seed));
      } else {
        setCohorts(cohortsList);
        setActions(actionsList);
      }
    } catch (error) {
      console.error("Failed to load cohorts/actions:", error);
      const seed = seedFromString(disruptionId);
      setCohorts(buildDemoCohorts(seed));
      setActions(buildDemoActions(seed));
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
