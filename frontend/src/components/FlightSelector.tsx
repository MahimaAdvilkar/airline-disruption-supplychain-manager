import { useState } from "react";
import { API_BASE_URL } from "../constants";
import { useQuery } from "@tanstack/react-query";
import "./FlightSelector.css";

interface Flight {
  flightNumber: string;
  airline: string;
  origin: string;
  destination: string;
  scheduledDeparture: string;
  status: string;
}

interface FlightSelectorProps {
  onFlightSelect: (flightNumber: string) => void;
}

export function FlightSelector({ onFlightSelect }: FlightSelectorProps) {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [selectedFlight, setSelectedFlight] = useState<string>("");

  const { data, isLoading } = useQuery({
    queryKey: ["all-flights"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/amadeus/all-flights`);
      const data = await response.json();
      return (data.flights || []) as Flight[];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // keep local state in sync when data loads
  if (data && flights.length === 0) {
    setFlights(data);
  }

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const flightNumber = e.target.value;
    setSelectedFlight(flightNumber);
    if (flightNumber) {
      onFlightSelect(flightNumber);
    }
  };

  return (
    <div className="flight-selector-container">
      <label htmlFor="flight-select" className="flight-selector-label">
        Select Flight:
      </label>
      <select
        id="flight-select"
        className="flight-selector-dropdown"
        value={selectedFlight}
        onChange={handleChange}
        disabled={isLoading}
      >
        <option value="">
          {isLoading ? "Loading flights..." : "Choose a flight to track"}
        </option>
        {(data || flights).map((flight) => (
          <option key={flight.flightNumber} value={flight.flightNumber}>
            {flight.flightNumber} - {flight.origin} → {flight.destination} ({flight.status})
          </option>
        ))}
      </select>
    </div>
  );
}
