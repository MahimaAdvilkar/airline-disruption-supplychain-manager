import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import "./FlightMap.css";

// Using Mapbox public token - replace with your own for production
mapboxgl.accessToken = "pk.eyJ1IjoiYXNodXRvc2hrdW1hd2F0IiwiYSI6ImNtanRwdWhzMTB4cmMzZHB6bmcyNGNzYnEifQ.nGdbEsskvnvcaWZqe7dSWw";

interface Flight {
  id: string;
  flightNumber: string;
  origin: { code: string; lat: number; lon: number; name: string };
  destination: { code: string; lat: number; lon: number; name: string };
  status: "scheduled" | "boarding" | "in-flight" | "delayed" | "cancelled";
  departureTime: string;
  progress?: number; // 0-100 for in-flight
}

const STATUS_COLORS = {
  scheduled: "#3B82F6",    // Blue - scheduled flights
  boarding: "#10B981",     // Green - boarding now
  "in-flight": "#8B5CF6",  // Purple - currently flying
  delayed: "#F59E0B",      // Amber - delayed flights
  cancelled: "#EF4444"     // Red - cancelled
};

const STATUS_LABELS = {
  scheduled: "Scheduled",
  boarding: "Boarding",
  "in-flight": "In Flight",
  delayed: "Delayed",
  cancelled: "Cancelled"
};

export function FlightMap({ crisisInfo }: { crisisInfo: string | null }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  useEffect(() => {
    // Mock flight data - replace with real API call
    const mockFlights: Flight[] = [
      {
        id: "f1",
        flightNumber: "DL888",
        origin: { code: "JFK", lat: 40.6413, lon: -73.7781, name: "New York JFK" },
        destination: { code: "LAX", lat: 33.9416, lon: -118.4085, name: "Los Angeles" },
        status: "cancelled",
        departureTime: "2025-12-30T14:30:00Z"
      },
      {
        id: "f2",
        flightNumber: "DL101",
        origin: { code: "ATL", lat: 33.6407, lon: -84.4277, name: "Atlanta" },
        destination: { code: "LHR", lat: 51.4700, lon: -0.4543, name: "London Heathrow" },
        status: "in-flight",
        departureTime: "2025-12-30T10:00:00Z",
        progress: 45
      },
      {
        id: "f3",
        flightNumber: "DL205",
        origin: { code: "SEA", lat: 47.4502, lon: -122.3088, name: "Seattle" },
        destination: { code: "NRT", lat: 35.7720, lon: 140.3929, name: "Tokyo Narita" },
        status: "in-flight",
        departureTime: "2025-12-30T11:15:00Z",
        progress: 60
      },
      {
        id: "f4",
        flightNumber: "DL456",
        origin: { code: "ORD", lat: 41.9742, lon: -87.9073, name: "Chicago O'Hare" },
        destination: { code: "MIA", lat: 25.7959, lon: -80.2870, name: "Miami" },
        status: "boarding",
        departureTime: "2025-12-30T15:45:00Z"
      },
      {
        id: "f5",
        flightNumber: "DL789",
        origin: { code: "DFW", lat: 32.8998, lon: -97.0403, name: "Dallas Fort Worth" },
        destination: { code: "CDG", lat: 49.0097, lon: 2.5479, name: "Paris Charles de Gaulle" },
        status: "delayed",
        departureTime: "2025-12-30T16:20:00Z"
      },
      {
        id: "f6",
        flightNumber: "DL321",
        origin: { code: "BOS", lat: 42.3656, lon: -71.0096, name: "Boston" },
        destination: { code: "SFO", lat: 37.6213, lon: -122.3790, name: "San Francisco" },
        status: "scheduled",
        departureTime: "2025-12-30T18:00:00Z"
      },
      {
        id: "f7",
        flightNumber: "DL567",
        origin: { code: "LAX", lat: 33.9416, lon: -118.4085, name: "Los Angeles" },
        destination: { code: "SYD", lat: -33.9399, lon: 151.1753, name: "Sydney" },
        status: "scheduled",
        departureTime: "2025-12-30T22:30:00Z"
      },
      {
        id: "f8",
        flightNumber: "DL234",
        origin: { code: "MSP", lat: 44.8848, lon: -93.2223, name: "Minneapolis" },
        destination: { code: "AMS", lat: 52.3105, lon: 4.7683, name: "Amsterdam" },
        status: "in-flight",
        departureTime: "2025-12-30T12:00:00Z",
        progress: 70
      }
    ];
    setFlights(mockFlights);
  }, []);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Initialize map
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [0, 20],
      zoom: 1.5,
      projection: { name: "globe" }
    });

    map.current.on("style.load", () => {
      // Ensure all map layers are visible
      if (map.current) {
        map.current.setFog({
          color: "rgb(186, 210, 235)",
          "high-color": "rgb(36, 92, 223)",
          "horizon-blend": 0.02,
          "space-color": "rgb(11, 11, 25)",
          "star-intensity": 0.6
        });
      }
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

  }, []);

  useEffect(() => {
    if (!map.current || flights.length === 0) return;

    const currentMap = map.current;

    // Wait for map to load
    const addFlightRoutes = () => {
      if (!currentMap.isStyleLoaded()) {
        setTimeout(addFlightRoutes, 100);
        return;
      }
      const filteredFlights = selectedStatus 
        ? flights.filter(f => f.status === selectedStatus)
        : flights;

      // Remove existing layers and sources
      flights.forEach((_, idx) => {
        try {
          if (currentMap.getLayer(`route-${idx}`)) currentMap.removeLayer(`route-${idx}`);
          if (currentMap.getLayer(`route-arrow-${idx}`)) currentMap.removeLayer(`route-arrow-${idx}`);
          if (currentMap.getLayer(`plane-${idx}`)) currentMap.removeLayer(`plane-${idx}`);
          if (currentMap.getSource(`route-${idx}`)) currentMap.removeSource(`route-${idx}`);
          if (currentMap.getSource(`plane-${idx}`)) currentMap.removeSource(`plane-${idx}`);
        } catch (e) {
          // Ignore errors during cleanup
        }
      });

      // Add flight routes
      filteredFlights.forEach((flight, idx) => {
        const color = STATUS_COLORS[flight.status];
        
        // Create curved arc between airports
        const start = [flight.origin.lon, flight.origin.lat];
        const end = [flight.destination.lon, flight.destination.lat];
        
        // Calculate arc points
        const arcPoints = createGreatCircleArc(start, end, 50);

        // Add route line
        currentMap.addSource(`route-${idx}`, {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: arcPoints
            }
          }
        });

        currentMap.addLayer({
          id: `route-${idx}`,
          type: "line",
          source: `route-${idx}`,
          layout: {
            "line-join": "round",
            "line-cap": "round"
          },
          paint: {
            "line-color": color,
            "line-width": 3,
            "line-opacity": 0.9,
            "line-blur": 1
          }
        });

        // Add plane marker for in-flight flights
        if (flight.status === "in-flight" && flight.progress !== undefined) {
          const planePos = interpolatePosition(start, end, flight.progress / 100);
          
          currentMap.addSource(`plane-${idx}`, {
            type: "geojson",
            data: {
              type: "Feature",
              properties: {
                flightNumber: flight.flightNumber
              },
              geometry: {
                type: "Point",
                coordinates: planePos
              }
            }
          });

          currentMap.addLayer({
            id: `plane-${idx}`,
            type: "circle",
            source: `plane-${idx}`,
            paint: {
              "circle-radius": 8,
              "circle-color": color,
              "circle-stroke-width": 2,
              "circle-stroke-color": "#ffffff"
            }
          });
        }

        // Add airport markers with popups
        [flight.origin, flight.destination].forEach((airport) => {
          new mapboxgl.Marker({
            color: flight.status === "cancelled" ? "#EF4444" : "#10B981",
            scale: 0.8
          })
            .setLngLat([airport.lon, airport.lat])
            .setPopup(
              new mapboxgl.Popup({ offset: 25 }).setHTML(`
                <div style="color: #1F2937; padding: 4px;">
                  <strong>${airport.code}</strong><br/>
                  ${airport.name}<br/>
                  <small>${flight.flightNumber} - ${STATUS_LABELS[flight.status]}</small>
                </div>
              `)
            )
            .addTo(currentMap);
        });
      });
    };

    if (currentMap.loaded()) {
      addFlightRoutes();
    } else {
      currentMap.on("load", addFlightRoutes);
    }

  }, [flights, selectedStatus]);

  // Helper function to create great circle arc
  function createGreatCircleArc(start: number[], end: number[], numPoints: number): number[][] {
    const points: number[][] = [];
    for (let i = 0; i <= numPoints; i++) {
      const fraction = i / numPoints;
      const point = interpolatePosition(start, end, fraction);
      points.push(point);
    }
    return points;
  }

  // Interpolate position along great circle
  function interpolatePosition(start: number[], end: number[], fraction: number): number[] {
    const lat1 = (start[1] * Math.PI) / 180;
    const lon1 = (start[0] * Math.PI) / 180;
    const lat2 = (end[1] * Math.PI) / 180;
    const lon2 = (end[0] * Math.PI) / 180;

    const d = 2 * Math.asin(
      Math.sqrt(
        Math.pow(Math.sin((lat1 - lat2) / 2), 2) +
        Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin((lon1 - lon2) / 2), 2)
      )
    );

    const a = Math.sin((1 - fraction) * d) / Math.sin(d);
    const b = Math.sin(fraction * d) / Math.sin(d);
    const x = a * Math.cos(lat1) * Math.cos(lon1) + b * Math.cos(lat2) * Math.cos(lon2);
    const y = a * Math.cos(lat1) * Math.sin(lon1) + b * Math.cos(lat2) * Math.sin(lon2);
    const z = a * Math.sin(lat1) + b * Math.sin(lat2);

    const lat = Math.atan2(z, Math.sqrt(x * x + y * y));
    const lon = Math.atan2(y, x);

    return [(lon * 180) / Math.PI, (lat * 180) / Math.PI];
  }

  const statusCounts = flights.reduce((acc, flight) => {
    acc[flight.status] = (acc[flight.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="flight-map-container">
      <div className="map-header">
        <h2>Live Flight Tracker - Next 24 Hours</h2>
        <div className="flight-stats">
          {!selectedStatus ? (
            <div className="flight-list">
              {flights.map(flight => {
                const departureTime = new Date(flight.departureTime);
                const timeStr = departureTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                const eta = flight.status === 'in-flight' && flight.progress 
                  ? `${Math.round((100 - flight.progress) * 0.08)}h remaining`
                  : timeStr;
                
                return (
                  <div key={flight.id} className="flight-detail-item">
                    <div className="flight-detail-header">
                      <span className="flight-number">{flight.flightNumber}</span>
                      <span 
                        className="flight-status-badge" 
                        style={{ 
                          backgroundColor: STATUS_COLORS[flight.status] + '20',
                          color: STATUS_COLORS[flight.status],
                          borderColor: STATUS_COLORS[flight.status]
                        }}
                      >
                        {STATUS_LABELS[flight.status]}
                      </span>
                    </div>
                    <div className="flight-detail-route">
                      <span className="route-text">{flight.origin.code} → {flight.destination.code}</span>
                    </div>
                    <div className="flight-detail-time">
                      <span className="time-label">{flight.status === 'in-flight' ? 'ETA:' : 'Departs:'}</span>
                      <span className="time-value">{eta}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <>
              <div className="filter-active">
                <span className="filter-badge" style={{ borderColor: STATUS_COLORS[selectedStatus as keyof typeof STATUS_COLORS] }}>
                  <span className="status-dot" style={{ backgroundColor: STATUS_COLORS[selectedStatus as keyof typeof STATUS_COLORS] }}></span>
                  {STATUS_LABELS[selectedStatus as keyof typeof STATUS_LABELS]}
                </span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Flights:</span>
                <span className="stat-value">{flights.filter(f => f.status === selectedStatus).length}</span>
              </div>
              <div className="flight-list">
                {flights.filter(f => f.status === selectedStatus).map(flight => {
                  const departureTime = new Date(flight.departureTime);
                  const timeStr = departureTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                  const eta = flight.status === 'in-flight' && flight.progress 
                    ? `${Math.round((100 - flight.progress) * 0.08)}h remaining`
                    : timeStr;
                  
                  return (
                    <div key={flight.id} className="flight-detail-item">
                      <div className="flight-detail-header">
                        <span className="flight-number">{flight.flightNumber}</span>
                        <span 
                          className="flight-status-badge" 
                          style={{ 
                            backgroundColor: STATUS_COLORS[flight.status] + '20',
                            color: STATUS_COLORS[flight.status],
                            borderColor: STATUS_COLORS[flight.status]
                          }}
                        >
                          {STATUS_LABELS[flight.status]}
                        </span>
                      </div>
                      <div className="flight-detail-route">
                        <span className="route-text">{flight.origin.code} → {flight.destination.code}</span>
                      </div>
                      <div className="flight-detail-time">
                        <span className="time-label">{flight.status === 'in-flight' ? 'ETA:' : 'Departs:'}</span>
                        <span className="time-value">{eta}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="map-controls">
        <button 
          className={`filter-btn ${!selectedStatus ? "active" : ""}`}
          onClick={() => setSelectedStatus(null)}
        >
          All Flights
        </button>
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <button
            key={status}
            className={`filter-btn ${selectedStatus === status ? "active" : ""}`}
            onClick={() => setSelectedStatus(status)}
            style={{ borderColor: color }}
          >
            <span className="status-dot" style={{ backgroundColor: color }}></span>
            {STATUS_LABELS[status as keyof typeof STATUS_LABELS]} ({statusCounts[status] || 0})
          </button>
        ))}
      </div>

      <div ref={mapContainer} className="map-canvas" />
    </div>
  );
}
