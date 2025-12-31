import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import "./FlightMap.css";
import { API_BASE_URL } from "../constants";

mapboxgl.accessToken = "pk.eyJ1IjoiYXNodXRvc2hrdW1hd2F0IiwiYSI6ImNtanRwdWhzMTB4cmMzZHB6bmcyNGNzYnEifQ.nGdbEsskvnvcaWZqe7dSWw";

export function FlightMap({ crisisInfo, flights24h, selectedAirline, flightTrajectory, onFlightSelect }: { 
  crisisInfo: string | null;
  flights24h?: any[];
  selectedAirline?: string;
  flightTrajectory?: any;
  onFlightSelect?: (flightNumber: string) => void;
}) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [allFlights, setAllFlights] = useState<any[]>([]);
  const airportCache = useRef<Record<string, { lat: number; lon: number }>>({});
  const hasTrajectory =
    Boolean(flightTrajectory && flightTrajectory.positions && flightTrajectory.positions.length > 0);
  const trajectoryOrigin = hasTrajectory ? (flightTrajectory.origin?.code || "UNK") : "";
  const trajectoryDest = hasTrajectory ? (flightTrajectory.destination?.code || "UNK") : "";

  useEffect(() => {
    if (flights24h && flights24h.length > 0) {
      setAllFlights(flights24h);
    }
  }, [flights24h]);

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





  }, []);

  useEffect(() => {
    const currentMap = map.current;
    if (!currentMap || !hasTrajectory) return;

    const displayTrajectory = () => {
      if (!currentMap.isStyleLoaded()) {
        setTimeout(displayTrajectory, 100);
        return;
      }

      try {
        if (currentMap.getLayer('trajectory-line')) currentMap.removeLayer('trajectory-line');
        if (currentMap.getLayer('trajectory-points')) currentMap.removeLayer('trajectory-points');
        if (currentMap.getLayer('current-position')) currentMap.removeLayer('current-position');
        if (currentMap.getLayer('trajectory-labels')) currentMap.removeLayer('trajectory-labels');
        if (currentMap.getSource('trajectory')) currentMap.removeSource('trajectory');
        if (currentMap.getSource('trajectory-points')) currentMap.removeSource('trajectory-points');
        if (currentMap.getSource('current-position')) currentMap.removeSource('current-position');
        if (currentMap.getLayer("route-lines")) currentMap.removeLayer("route-lines");
        if (currentMap.getSource("route-lines")) currentMap.removeSource("route-lines");
      } catch (e) {
      }

      const positions = flightTrajectory.positions;
      const lineCoordinates = positions.map((p: any) => [p.longitude, p.latitude]);

      try {
        currentMap.addSource('trajectory', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: lineCoordinates
            }
          }
        });

        currentMap.addLayer({
          id: 'trajectory-line',
          type: 'line',
          source: 'trajectory',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#3b82f6',
            'line-width': 4,
            'line-opacity': 0.8
          }
        });
      } catch (e) {
      }

      const pointsData = {
        type: 'FeatureCollection',
        features: positions.map((p: any) => ({
          type: 'Feature',
          properties: {
            hourOffset: p.hourOffset,
            altitude: p.altitude,
            speed: p.speed,
            time: new Date(p.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
          },
          geometry: {
            type: 'Point',
            coordinates: [p.longitude, p.latitude]
          }
        }))
      };

      try {
        currentMap.addSource('trajectory-points', {
          type: 'geojson',
          data: pointsData as any
        });

        currentMap.addLayer({
          id: 'trajectory-points',
          type: 'circle',
          source: 'trajectory-points',
          paint: {
            'circle-radius': [
              'interpolate',
              ['linear'],
              ['get', 'hourOffset'],
              -12, 4,
              0, 6,
              12, 4
            ],
            'circle-color': [
              'interpolate',
              ['linear'],
              ['get', 'hourOffset'],
              -12, '#64748b',
              0, '#10b981',
              12, '#3b82f6'
            ],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff'
          }
        });
      } catch (e) {
      }

      const currentPos = flightTrajectory.currentPosition;
      if (!currentPos) return;
      try {
        currentMap.addSource('current-position', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {
              flightNumber: flightTrajectory.flightNumber,
              altitude: currentPos.altitude,
              speed: currentPos.speed
            },
            geometry: {
              type: 'Point',
              coordinates: [currentPos.longitude, currentPos.latitude]
            }
          }
        });

        currentMap.addLayer({
          id: 'current-position',
          type: 'circle',
          source: 'current-position',
          paint: {
            'circle-radius': 12,
            'circle-color': '#10b981',
            'circle-stroke-width': 3,
            'circle-stroke-color': '#ffffff',
            'circle-opacity': 0.9
          }
        });
      } catch (e) {
      }

      [flightTrajectory.origin, flightTrajectory.destination].forEach((airport: any) => {
        if (!airport || airport.lat === undefined || airport.lon === undefined) {
          return;
        }
        new mapboxgl.Marker({
          color: '#3b82f6',
          scale: 1
        })
          .setLngLat([airport.lon, airport.lat])
          .setPopup(
            new mapboxgl.Popup({ offset: 25 }).setHTML(`
              <div style="color: #1F2937; padding: 8px;">
                <strong style="font-size: 16px;">${airport.code || "UNK"}</strong><br/>
                <span style="font-size: 14px;">${airport.name || "Unknown Airport"}</span><br/>
                <small style="color: #6B7280;">${flightTrajectory.flightNumber}</small>
              </div>
            `)
          )
          .addTo(currentMap);
      });

      const bounds = lineCoordinates.reduce(
        (bounds, coord) => bounds.extend(coord as [number, number]),
        new mapboxgl.LngLatBounds(lineCoordinates[0] as [number, number], lineCoordinates[0] as [number, number])
      );

      currentMap.fitBounds(bounds, {
        padding: 100,
        duration: 1000
      });
    };

    if (currentMap.loaded()) {
      displayTrajectory();
    } else {
      currentMap.on('load', displayTrajectory);
    }
  }, [flightTrajectory, hasTrajectory]);

  useEffect(() => {
    const currentMap = map.current;
    if (!currentMap) return;
    if (!allFlights || allFlights.length === 0) return;
    if (flightTrajectory) {
      try {
        if (currentMap.getLayer("route-lines")) currentMap.removeLayer("route-lines");
        if (currentMap.getSource("route-lines")) currentMap.removeSource("route-lines");
      } catch (e) {
      }
      return;
    }

    const fallbackCoords = (code: string) => {
      let hash = 0;
      for (let i = 0; i < code.length; i += 1) {
        hash = (hash * 31 + code.charCodeAt(i)) % 100000;
      }
      const lat = ((hash % 120) - 60) + 0.5;
      const lon = (((hash / 120) % 360) - 180) + 0.5;
      return { lat, lon };
    };

    const getCoords = async (code: string) => {
      if (airportCache.current[code]) return airportCache.current[code];
      try {
        const response = await fetch(`${API_BASE_URL}/amadeus/airports/${code}`);
        if (!response.ok) {
          const fallback = fallbackCoords(code);
          airportCache.current[code] = fallback;
          return fallback;
        }
        const data = await response.json();
        if (!data || data.lat === undefined || data.lon === undefined) {
          const fallback = fallbackCoords(code);
          airportCache.current[code] = fallback;
          return fallback;
        }
        airportCache.current[code] = { lat: data.lat, lon: data.lon };
        return airportCache.current[code];
      } catch (error) {
        const fallback = fallbackCoords(code);
        airportCache.current[code] = fallback;
        return fallback;
      }
    };

    const renderRoutes = async () => {
      if (!currentMap.isStyleLoaded()) {
        setTimeout(renderRoutes, 100);
        return;
      }

      const features = [];
      for (const flight of allFlights) {
        const origin = await getCoords(flight.origin);
        const destination = await getCoords(flight.destination);
        if (!origin || !destination) continue;
        features.push({
          type: "Feature",
          properties: {
            status: flight.status || "SCHEDULED"
          },
          geometry: {
            type: "LineString",
            coordinates: [
              [origin.lon, origin.lat],
              [destination.lon, destination.lat]
            ]
          }
        });
      }

      try {
        if (currentMap.getLayer("route-lines")) currentMap.removeLayer("route-lines");
        if (currentMap.getSource("route-lines")) currentMap.removeSource("route-lines");
      } catch (e) {
      }

      try {
        currentMap.addSource("route-lines", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features
          }
        });

        currentMap.addLayer({
          id: "route-lines",
          type: "line",
          source: "route-lines",
          layout: {
            "line-join": "round",
            "line-cap": "round"
          },
          paint: {
            "line-color": [
              "match",
              ["get", "status"],
              "CANCELLED", "#ef4444",
              "DELAYED", "#f59e0b",
              "BOARDING", "#10b981",
              "#3b82f6"
            ],
            "line-width": 2,
            "line-opacity": 0.7
          }
        });
      } catch (e) {
      }
    };

    renderRoutes();
  }, [allFlights, flightTrajectory]);

  return (
    <div className="flight-map-container">
      <div className="map-header">
        <h2>
          {hasTrajectory 
            ? `Flight ${flightTrajectory.flightNumber} - ${trajectoryOrigin} → ${trajectoryDest}` 
            : selectedAirline 
              ? `${selectedAirline} Flights - Select to Track` 
              : 'Select an Airline to View Flights'}
        </h2>
        {hasTrajectory && (
          <div className="trajectory-info">
            <div className="trajectory-detail">
              <span className="label">Departure:</span>
              <span className="value">{new Date(flightTrajectory.departureTime).toLocaleString()}</span>
            </div>
            <div className="trajectory-detail">
              <span className="label">Arrival:</span>
              <span className="value">{new Date(flightTrajectory.arrivalTime).toLocaleString()}</span>
            </div>
            <div className="trajectory-detail">
              <span className="label">Current Altitude:</span>
              <span className="value">{flightTrajectory.currentPosition.altitude.toLocaleString()} ft</span>
            </div>
            <div className="trajectory-detail">
              <span className="label">Current Speed:</span>
              <span className="value">{flightTrajectory.currentPosition.speed} mph</span>
            </div>
          </div>
        )}
        <div className="flight-stats">
          {allFlights.length > 0 ? (
            <div className="flight-list">
              {allFlights.map((flight, index) => {
                const departureTime = new Date(flight.scheduledDeparture);
                const timeStr = departureTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                const statusColor = flight.status === 'CANCELLED' ? '#EF4444' :
                                   flight.status === 'DELAYED' ? '#F59E0B' : 
                                   flight.status === 'BOARDING' ? '#10B981' : '#3B82F6';
                
                return (
                  <div 
                    key={flight.flightNumber} 
                    className={`flight-detail-item clickable ${flight.status === 'CANCELLED' ? 'cancelled' : ''}`}
                    onClick={() => onFlightSelect && onFlightSelect(flight.flightNumber)}
                  >
                    <div className="flight-detail-header">
                      <span className="flight-number">{flight.flightNumber}</span>
                      <span 
                        className="flight-status-badge" 
                        style={{ 
                          backgroundColor: statusColor + '20',
                          color: statusColor,
                          borderColor: statusColor
                        }}
                      >
                        {flight.status}
                      </span>
                    </div>
                    <div className="flight-detail-route">
                      <span className="route-text">{flight.origin} → {flight.destination}</span>
                    </div>
                    <div className="flight-detail-time">
                      <span className="time-label">Departs:</span>
                      <span className="time-value">{timeStr}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : selectedAirline ? (
            <div className="flight-list-empty">No flights available</div>
          ) : (
            <div className="flight-list-empty">Select an airline to view flights</div>
          )}
        </div>
      </div>

      <div ref={mapContainer} className="map-canvas" />
    </div>
  );
}
