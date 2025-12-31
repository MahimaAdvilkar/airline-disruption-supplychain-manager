import { API_BASE_URL } from "./constants";

export async function fetchDisruptions(airport?: string, severity?: string) {
  const params = new URLSearchParams();
  if (airport) params.append("airport", airport);
  if (severity) params.append("severity", severity);
  
  const response = await fetch(`${API_BASE_URL}/disruptions?${params}`);
  if (!response.ok) throw new Error("Failed to fetch disruptions");
  return response.json();
}

export async function fetchDisruptionDetail(id: string) {
  const response = await fetch(`${API_BASE_URL}/disruptions/${id}`);
  if (!response.ok) throw new Error("Failed to fetch disruption detail");
  return response.json();
}

export async function fetchCohorts(id: string) {
  const response = await fetch(`${API_BASE_URL}/disruptions/${id}/cohorts`);
  if (!response.ok) throw new Error("Failed to fetch cohorts");
  return response.json();
}

export async function fetchActions(id: string) {
  const response = await fetch(`${API_BASE_URL}/disruptions/${id}/actions`);
  if (!response.ok) throw new Error("Failed to fetch actions");
  return response.json();
}

export async function simulateDisruption(data: {
  flight_number: string;
  airport: string;
  delay_minutes: number;
  reason: string;
}) {
  const response = await fetch(`${API_BASE_URL}/simulate/flight-disruption`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error("Failed to simulate disruption");
  return response.json();
}

export async function searchFlightOffers(
  origin: string,
  destination: string,
  departureDate?: string,
  adults = 1,
  maxResults = 5
) {
  const params = new URLSearchParams({
    origin,
    destination,
    adults: adults.toString(),
    max_results: maxResults.toString()
  });
  if (departureDate) params.append("departure_date", departureDate);
  
  const response = await fetch(`${API_BASE_URL}/amadeus/flight-offers?${params}`);
  if (!response.ok) throw new Error("Failed to search flights");
  return response.json();
}
