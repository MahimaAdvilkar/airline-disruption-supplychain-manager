export const API_BASE_URL = "http://localhost:8002";

export const COHORT_PRIORITIES = {
  P0: { label: "Critical", color: "#dc2626", description: "Medical, special assistance" },
  P1: { label: "High", color: "#ea580c", description: "Tight connections, urgent travel" },
  P2: { label: "Medium", color: "#ca8a04", description: "Premium loyalty, business" },
  P3: { label: "Standard", color: "#16a34a", description: "Flexible travelers" }
};

export const FLIGHT_STATUS = {
  SCHEDULED: { label: "Scheduled", color: "#3b82f6" },
  IN_FLIGHT: { label: "In Flight", color: "#10b981" },
  DELAYED: { label: "Delayed", color: "#f59e0b" },
  CANCELLED: { label: "Cancelled", color: "#ef4444" },
  LANDED: { label: "Landed", color: "#6b7280" }
};

export const SEVERITY_LEVELS = {
  LOW: { label: "Low", color: "#10b981", icon: "▼" },
  MEDIUM: { label: "Medium", color: "#f59e0b", icon: "■" },
  HIGH: { label: "High", color: "#ef4444", icon: "▲" },
  CRITICAL: { label: "Critical", color: "#991b1b", icon: "⚠" }
};
