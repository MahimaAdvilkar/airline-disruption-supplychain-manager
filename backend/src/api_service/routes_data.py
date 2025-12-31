"""
Fetch airline route data from OpenFlights.org
Free, comprehensive database of airline routes worldwide
"""
import httpx
import logging
from typing import List, Tuple, Set, Optional
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

# Cache routes data
_routes_cache: Optional[List[dict]] = None
_cache_expiry: Optional[datetime] = None

def fetch_openflights_routes() -> List[dict]:
    """
    Fetch routes from OpenFlights.org database
    Format: Airline,Airline ID,Source,Source ID,Dest,Dest ID,Codeshare,Stops,Equipment
    """
    global _routes_cache, _cache_expiry
    
    # Return cached data if still valid (cache for 24 hours)
    if _routes_cache and _cache_expiry and datetime.now() < _cache_expiry:
        logger.info(f"Using cached routes data ({len(_routes_cache)} routes)")
        return _routes_cache
    
    logger.info("Fetching fresh routes data from OpenFlights.org")
    
    try:
        url = "https://raw.githubusercontent.com/jpatokal/openflights/master/data/routes.dat"
        
        with httpx.Client(timeout=30.0) as client:
            response = client.get(url)
            response.raise_for_status()
            
            routes = []
            lines = response.text.strip().split('\n')
            
            for line in lines:
                parts = line.split(',')
                if len(parts) >= 7:
                    routes.append({
                        'airline': parts[0],      # IATA code
                        'source': parts[2],       # Origin airport IATA
                        'dest': parts[4],         # Destination airport IATA
                        'codeshare': parts[6],    # Y if codeshare
                        'stops': parts[7] if len(parts) > 7 else '0'
                    })
            
            _routes_cache = routes
            _cache_expiry = datetime.now() + timedelta(hours=24)
            
            logger.info(f"Successfully cached {len(routes)} routes from OpenFlights")
            return routes
            
    except Exception as e:
        logger.error(f"Failed to fetch OpenFlights routes: {e}")
        
        # Return stale cache if available
        if _routes_cache:
            logger.warning("Using stale routes cache")
            return _routes_cache
        
        return []


def get_airline_routes(airline_iata: str, max_routes: int = 50) -> Set[Tuple[str, str]]:
    """
    Get all routes for a specific airline
    Returns set of (origin, destination) tuples
    """
    all_routes = fetch_openflights_routes()
    
    if not all_routes:
        logger.warning(f"No routes data available for {airline_iata}")
        return set()
    
    # Filter routes for this airline
    airline_routes = set()
    
    for route in all_routes:
        if route['airline'] == airline_iata:
            origin = route['source']
            dest = route['dest']
            
            # Skip routes with missing data or not direct (stops > 0)
            if origin and dest and origin != '\\N' and dest != '\\N':
                if route.get('stops', '0') == '0':  # Direct flights only
                    # Only international routes (simple heuristic)
                    if len(origin) == 3 and len(dest) == 3:
                        if origin[0] != dest[0]:  # Different region
                            airline_routes.add((origin, dest))
    
    logger.info(f"Found {len(airline_routes)} routes for airline {airline_iata}")
    
    # Return limited set to avoid too many API calls
    return set(list(airline_routes)[:max_routes])


def get_routes_from_airport(airport_iata: str, airline_iata: Optional[str] = None) -> Set[str]:
    """
    Get all destinations from a specific airport
    Optionally filter by airline
    """
    all_routes = fetch_openflights_routes()
    
    destinations = set()
    
    for route in all_routes:
        if route['source'] == airport_iata:
            if airline_iata is None or route['airline'] == airline_iata:
                dest = route['dest']
                if dest and dest != '\\N':
                    destinations.add(dest)
    
    return destinations
