import { useEffect, useState } from "react";
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
  const [loading, setLoading] = useState(true);
  const [selectedFlight, setSelectedFlight] = useState<string>("");

  useEffect(() => {
    fetchAllFlights();
  }, []);

  const fetchAllFlights = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:8002/amadeus/all-flights");
      const data = await response.json();
      setFlights(data.flights || []);
    } catch (error) {
      console.error("Failed to fetch flights:", error);
      setFlights([]);
    } finally {
      setLoading(false);
    }
  };

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
        disabled={loading}
      >
        <option value="">
          {loading ? "Loading flights..." : "Choose a flight to track"}
        </option>
        {flights.map((flight) => (
          <option key={flight.flightNumber} value={flight.flightNumber}>
            {flight.flightNumber} - {flight.origin} → {flight.destination} ({flight.status})
          </option>
        ))}
      </select>
    </div>
  );
}
