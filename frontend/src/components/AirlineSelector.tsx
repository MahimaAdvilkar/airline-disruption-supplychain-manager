import { useState } from 'react';
import './AirlineSelector.css';
import { API_BASE_URL } from '../constants';
import { useQuery } from '@tanstack/react-query';

interface Airline {
  iataCode: string;
  businessName: string;
}

interface AirlineSelectorProps {
  onAirlineSelect: (airlineCode: string) => void;
}

export function AirlineSelector({ onAirlineSelect }: AirlineSelectorProps) {
  const [selectedAirline, setSelectedAirline] = useState<string>('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['airlines'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/amadeus/bootstrap`);
      if (!response.ok) throw new Error('Failed to fetch airlines');
      const data = await response.json();
      return (data.airlines || []) as Airline[];
    },
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    setSelectedAirline(code);
    if (code) {
      onAirlineSelect(code);
    }
  };

  if (isLoading) {
    return <div className="airline-selector-loading">Loading airlines...</div>;
  }

  if (error) {
    return <div className="airline-selector-error">Failed to load airlines</div>;
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
        {(data || []).map((airline) => (
          <option key={airline.iataCode} value={airline.iataCode}>
            {airline.iataCode} - {airline.businessName}
          </option>
        ))}
      </select>
    </div>
  );
}
