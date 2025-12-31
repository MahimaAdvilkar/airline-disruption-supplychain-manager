import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import "./FlightMap.css";

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

  useEffect(() => {
    const fetchAllFlights = async () => {
      if (!selectedAirline) {
        setAllFlights([]);
        return;
      }
      
      try {
        const response = await fetch(`http://localhost:8002/amadeus/all-flights`);
        const data = await response.json();
        const airlineFlights = data.flights.filter((f: any) => f.airline === selectedAirline);
        setAllFlights(airlineFlights);
      } catch (error) {
        console.error("Failed to fetch flights:", error);
        setAllFlights([]);
      }
    };

    fetchAllFlights();
  }, [selectedAirline]);

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





    const currentMap = map.current;

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
      } catch (e) {
      }

      const positions = flightTrajectory.positions;
      const lineCoordinates = positions.map((p: any) => [p.longitude, p.latitude]);

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

      const currentPos = flightTrajectory.currentPosition;
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

      [flightTrajectory.origin, flightTrajectory.destination].forEach((airport: any) => {
        new mapboxgl.Marker({
          color: '#3b82f6',
          scale: 1
        })
          .setLngLat([airport.lon, airport.lat])
          .setPopup(
            new mapboxgl.Popup({ offset: 25 }).setHTML(`
              <div style="color: #1F2937; padding: 8px;">
                <strong style="font-size: 16px;">${airport.code}</strong><br/>
                <span style="font-size: 14px;">${airport.name}</span><br/>
                <small style="color: #6B7280;">${flightTrajectory.flightNumber}</small>
              </div>
            `)
          )
          .addTo(currentMap);
      });

      // Fit map to trajectory
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

  }, [flightTrajectory]);

  return (
    <div className="flight-map-container">
      <div className="map-header">
        <h2>
          {flightTrajectory 
            ? `Flight ${flightTrajectory.flightNumber} - ${flightTrajectory.origin.code} → ${flightTrajectory.destination.code}` 
            : selectedAirline 
              ? `${selectedAirline} Flights - Select to Track` 
              : 'Select an Airline to View Flights'}
        </h2>
        {flightTrajectory && (
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
