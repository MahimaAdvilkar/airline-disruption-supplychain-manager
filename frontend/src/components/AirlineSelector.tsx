import { useState, useEffect } from 'react';
import './AirlineSelector.css';

interface Airline {
  iataCode: string;
  businessName: string;
}

interface AirlineSelectorProps {
  onAirlineSelect: (airlineCode: string) => void;
}

export function AirlineSelector({ onAirlineSelect }: AirlineSelectorProps) {
  const [airlines, setAirlines] = useState<Airline[]>([]);
  const [selectedAirline, setSelectedAirline] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAirlines();
  }, []);

  const fetchAirlines = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8002/amadeus/airlines');
      if (!response.ok) throw new Error('Failed to fetch airlines');
      const data = await response.json();
      setAirlines(data.airlines || []);
      setError(null);
    } catch (err) {
      setError('Failed to load airlines');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    setSelectedAirline(code);
    if (code) {
      onAirlineSelect(code);
    }
  };

  if (loading) {
    return <div className="airline-selector-loading">Loading airlines...</div>;
  }

  if (error) {
    return <div className="airline-selector-error">{error}</div>;
  }

  return (
    <div className="airline-selector">
      <select 
        id="airline-select"
        value={selectedAirline}
        onChange={handleSelect}
        className="airline-dropdown"
      >
        <option value="">Choose an airline...</option>
        {airlines.map((airline) => (
          <option key={airline.iataCode} value={airline.iataCode}>
            {airline.iataCode} - {airline.businessName}
          </option>
        ))}
      </select>
    </div>
  );
}
