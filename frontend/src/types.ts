export interface Disruption {
  disruption_id: string;
  severity: string;
  airport: string;
  region: string;
  primary_flight_number: string;
  metrics: {
    delayed_flights_count: number;
    cancelled_flights_count: number;
    passengers_impacted_est: number;
    connections_at_risk_est: number;
    avg_delay_minutes?: number;
  };
  last_updated: string;
}

export interface Cohort {
  cohort_id: string;
  priority: string;
  reason: string;
  passenger_count: number;
}

export interface RecoveryAction {
  action_id: string;
  action_type: string;
  priority: string;
  target: {
    pnr: string;
    passenger_id: string;
  };
  details: {
    recommended_option?: string;
    notes?: string;
    hotel?: string;
    nights?: number;
  };
  status: string;
  created_at: string;
  description?: string;
  affected_passengers?: number;
  delay_minutes?: number;
  estimated_cost?: number;
  alternative_flight?: string;
  execution_timeline?: string;
}

export interface FlightOffer {
  id: string;
  price: {
    total: string;
    currency: string;
  };
  itineraries: Array<{
    duration: string;
    segments: Array<{
      departure: {
        iataCode: string;
        at: string;
      };
      arrival: {
        iataCode: string;
        at: string;
      };
      carrierCode: string;
      number: string;
    }>;
  }>;
  validatingAirlineCodes: string[];
}
