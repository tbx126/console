import { useState, useEffect, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Polyline } from '@react-google-maps/api';
import { Plane, MapPin, Loader2, Navigation, Globe, Map, Info } from 'lucide-react';
import api from '../../services/api';

const mapContainerStyle = {
  width: '100%',
  height: '600px'
};

const defaultCenter = {
  lat: 35.0,
  lng: 105.0
};

// Clean map styles - hide POI and transit labels for cleaner look
const cleanMapStyles = [
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] }
];

const baseMapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: true,
  gestureHandling: 'greedy'
};

// Calculate curved path between two points with offset
const calculateCurvedPath = (origin, dest, curveOffset = 0) => {
  const points = [];
  const numPoints = 50;

  // Calculate midpoint
  const midLat = (origin.lat + dest.lat) / 2;
  const midLng = (origin.lng + dest.lng) / 2;

  // Calculate perpendicular offset direction
  const dx = dest.lng - origin.lng;
  const dy = dest.lat - origin.lat;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Perpendicular unit vector (rotated 90 degrees)
  const perpX = -dy / distance;
  const perpY = dx / distance;

  // Control point offset (proportional to distance, with curve offset for multiple routes)
  const baseOffset = distance * 0.15;
  const offset = baseOffset + curveOffset * distance * 0.08;

  // Control point
  const controlLat = midLat + perpY * offset;
  const controlLng = midLng + perpX * offset;

  // Generate quadratic bezier curve points
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const lat = (1 - t) * (1 - t) * origin.lat + 2 * (1 - t) * t * controlLat + t * t * dest.lat;
    const lng = (1 - t) * (1 - t) * origin.lng + 2 * (1 - t) * t * controlLng + t * t * dest.lng;
    points.push({ lat, lng });
  }

  return points;
};

// Country to continent mapping
const COUNTRY_TO_CONTINENT = {
  CN: 'Asia', JP: 'Asia', KR: 'Asia', TW: 'Asia', HK: 'Asia', SG: 'Asia',
  TH: 'Asia', VN: 'Asia', MY: 'Asia', ID: 'Asia', PH: 'Asia', IN: 'Asia',
  AE: 'Asia', SA: 'Asia', QA: 'Asia', TR: 'Asia', IL: 'Asia',
  GB: 'Europe', FR: 'Europe', DE: 'Europe', IT: 'Europe', ES: 'Europe',
  NL: 'Europe', CH: 'Europe', AT: 'Europe', SE: 'Europe', NO: 'Europe',
  DK: 'Europe', FI: 'Europe', IE: 'Europe', PL: 'Europe', CZ: 'Europe',
  GR: 'Europe', RU: 'Europe', PT: 'Europe',
  US: 'North America', CA: 'North America', MX: 'North America',
  BR: 'South America', AR: 'South America', CL: 'South America', CO: 'South America',
  ZA: 'Africa', EG: 'Africa', MA: 'Africa', NG: 'Africa', KE: 'Africa',
  AU: 'Oceania', NZ: 'Oceania', FJ: 'Oceania'
};

// Info Panel Component
const InfoPanel = ({ mousePosition, selectedAirport, selectedRoute, mapData }) => {
  return (
    <div className="w-72 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-700">
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <Info className="h-4 w-4 text-violet-500 dark:text-violet-400" />
          Map Information
        </h3>
      </div>

      {/* Mouse Position */}
      <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 mb-2">
          <Navigation className="h-3 w-3" />
          <span>Cursor Position</span>
        </div>
        {mousePosition ? (
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-zinc-400 dark:text-zinc-500">Lat:</span>
              <span className="text-zinc-700 dark:text-zinc-200 ml-1">{mousePosition.lat.toFixed(4)}°</span>
            </div>
            <div>
              <span className="text-zinc-400 dark:text-zinc-500">Lng:</span>
              <span className="text-zinc-700 dark:text-zinc-200 ml-1">{mousePosition.lng.toFixed(4)}°</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-zinc-400 dark:text-zinc-500">Hover over map</p>
        )}
      </div>

      {/* Selected Info */}
      <div className="flex-1 overflow-auto">
        {selectedAirport ? (
          <AirportInfo airport={selectedAirport} />
        ) : selectedRoute ? (
          <RouteInfo route={selectedRoute} />
        ) : (
          <DefaultInfo mapData={mapData} />
        )}
      </div>
    </div>
  );
};

// Airport Info Sub-component
const AirportInfo = ({ airport }) => {
  const continent = COUNTRY_TO_CONTINENT[airport.country] || 'Unknown';
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
        <MapPin className="h-3 w-3 text-violet-500 dark:text-violet-400" />
        <span>Selected Airport</span>
      </div>
      <div className="text-center py-4">
        <div className="text-3xl font-bold text-violet-600 dark:text-violet-400">{airport.code}</div>
        <div className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{airport.country || 'Unknown'}</div>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-zinc-400 dark:text-zinc-500">Continent</span>
          <span className="text-zinc-700 dark:text-zinc-200">{continent}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-400 dark:text-zinc-500">Latitude</span>
          <span className="text-zinc-700 dark:text-zinc-200">{airport.lat.toFixed(4)}°</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-400 dark:text-zinc-500">Longitude</span>
          <span className="text-zinc-700 dark:text-zinc-200">{airport.lng.toFixed(4)}°</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-400 dark:text-zinc-500">Flights</span>
          <span className="text-violet-600 dark:text-violet-400 font-medium">{airport.flights}</span>
        </div>
      </div>
    </div>
  );
};

// Route Info Sub-component
const RouteInfo = ({ route }) => (
  <div className="p-4 space-y-4">
    <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
      <Plane className="h-3 w-3 text-blue-500 dark:text-blue-400" />
      <span>Selected Route</span>
    </div>
    <div className="text-center py-4">
      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
        {route.origin} → {route.destination}
      </div>
      <div className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{route.airline}</div>
    </div>
    <div className="space-y-2 text-sm">
      {route.flightNumber && (
        <div className="flex justify-between">
          <span className="text-zinc-400 dark:text-zinc-500">Flight</span>
          <span className="text-zinc-700 dark:text-zinc-200">{route.flightNumber}</span>
        </div>
      )}
      <div className="flex justify-between">
        <span className="text-zinc-400 dark:text-zinc-500">Date</span>
        <span className="text-zinc-700 dark:text-zinc-200">{route.date}</span>
      </div>
      {route.distance && (
        <div className="flex justify-between">
          <span className="text-zinc-400 dark:text-zinc-500">Distance</span>
          <span className="text-blue-600 dark:text-blue-400 font-medium">{route.distance.toLocaleString()} km</span>
        </div>
      )}
    </div>
  </div>
);

// Default Info Sub-component
const DefaultInfo = ({ mapData }) => (
  <div className="p-4 space-y-4">
    <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
      <Globe className="h-3 w-3" />
      <span>Overview</span>
    </div>
    <div className="text-center py-6 text-zinc-400 dark:text-zinc-500">
      <Map className="h-12 w-12 mx-auto mb-3 opacity-50" />
      <p className="text-sm">Click an airport or route</p>
      <p className="text-xs mt-1">to view details</p>
    </div>
    <div className="space-y-2 text-sm border-t border-zinc-200 dark:border-zinc-700 pt-4">
      <div className="flex justify-between">
        <span className="text-zinc-400 dark:text-zinc-500">Total Airports</span>
        <span className="text-violet-600 dark:text-violet-400">{mapData.airports.length}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-zinc-400 dark:text-zinc-500">Total Routes</span>
        <span className="text-blue-600 dark:text-blue-400">{mapData.routes.length}</span>
      </div>
    </div>
  </div>
);

// Inner component that uses the Google Maps hook
const FlightMapInner = ({ apiKey, mapData }) => {
  const [selectedAirport, setSelectedAirport] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [map, setMap] = useState(null);
  const [mousePosition, setMousePosition] = useState(null);

  const mapOptions = {
    ...baseMapOptions,
    styles: cleanMapStyles
  };

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey
  });

  const onLoad = useCallback((map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const onMouseMove = useCallback((e) => {
    if (e.latLng) {
      setMousePosition({
        lat: e.latLng.lat(),
        lng: e.latLng.lng()
      });
    }
  }, []);

  const onMouseOut = useCallback(() => {
    setMousePosition(null);
  }, []);

  // Fit bounds to show all airports
  useEffect(() => {
    if (map && mapData.airports.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      mapData.airports.forEach(airport => {
        bounds.extend({ lat: airport.lat, lng: airport.lng });
      });
      map.fitBounds(bounds, { padding: 50 });
    }
  }, [map, mapData.airports]);

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-96 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
        <div className="text-center text-red-500">
          <p className="font-medium">Failed to load Google Maps</p>
          <p className="text-sm mt-1">Please check your API key</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-96 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="flex gap-4 items-stretch" style={{ minHeight: '600px' }}>
      {/* Map Container */}
      <div className="flex-1 flex flex-col">
        {/* Google Map */}
        <div className="flex-1 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700">
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%' }}
            center={defaultCenter}
            zoom={3}
            options={mapOptions}
            onLoad={onLoad}
            onUnmount={onUnmount}
            onMouseMove={onMouseMove}
            onMouseOut={onMouseOut}
          >
          {/* Airport Markers */}
          {mapData.airports.map((airport) => (
            <Marker
              key={airport.code}
              position={{ lat: airport.lat, lng: airport.lng }}
              onClick={() => { setSelectedAirport(airport); setSelectedRoute(null); }}
              icon={{
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: Math.min(6 + airport.flights, 12),
                fillColor: '#8b5cf6',
                fillOpacity: 0.9,
                strokeColor: '#ffffff',
                strokeWeight: 2
              }}
            />
          ))}

          {/* Flight Routes */}
          {mapData.routes.map((route, index) => {
            // Calculate curve offset for routes with same origin-destination pair
            const routeKey = [route.origin, route.destination].sort().join('-');
            const sameRoutes = mapData.routes.filter(r =>
              [r.origin, r.destination].sort().join('-') === routeKey
            );
            const routeIndex = sameRoutes.findIndex(r => r.id === route.id);
            const curveOffset = routeIndex - (sameRoutes.length - 1) / 2;

            const origin = { lat: route.originCoords[0], lng: route.originCoords[1] };
            const dest = { lat: route.destCoords[0], lng: route.destCoords[1] };
            const curvedPath = calculateCurvedPath(origin, dest, curveOffset);

            return (
              <Polyline
                key={route.id}
                path={curvedPath}
                options={{
                  strokeColor: selectedRoute?.id === route.id ? '#f59e0b' : '#3b82f6',
                  strokeOpacity: selectedRoute?.id === route.id ? 1 : 0.6,
                  strokeWeight: selectedRoute?.id === route.id ? 3 : 2
                }}
                onClick={() => { setSelectedRoute(route); setSelectedAirport(null); }}
              />
            );
          })}
        </GoogleMap>
      </div>

      {/* Legend */}
      <div className="flex gap-6 text-xs text-zinc-500 dark:text-zinc-400 mt-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-violet-500"></div>
          <span>Airport</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-0.5 bg-blue-500"></div>
          <span>Route</span>
        </div>
      </div>
    </div>

    {/* Info Panel */}
    <InfoPanel
      mousePosition={mousePosition}
      selectedAirport={selectedAirport}
      selectedRoute={selectedRoute}
      mapData={mapData}
    />
  </div>
  );
};

// Outer component that handles API key loading
const FlightMap = () => {
  const [mapData, setMapData] = useState({ airports: [], routes: [] });
  const [loading, setLoading] = useState(true);
  const [apiKey, setApiKey] = useState('');
  const [keyLoading, setKeyLoading] = useState(true);

  // Fetch API key from backend
  useEffect(() => {
    const fetchApiKey = async () => {
      try {
        const response = await api.get('/config/google-maps-key');
        setApiKey(response.data.key || '');
      } catch (error) {
        console.error('Failed to fetch Google Maps API key:', error);
      } finally {
        setKeyLoading(false);
      }
    };
    fetchApiKey();
  }, []);

  // Fetch map data
  useEffect(() => {
    const fetchMapData = async () => {
      try {
        const response = await api.get('/travel/map-data');
        setMapData(response.data);
      } catch (error) {
        console.error('Failed to fetch map data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchMapData();
  }, []);

  if (keyLoading || loading) {
    return (
      <div className="flex items-center justify-center h-96 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    );
  }

  if (!apiKey) {
    return (
      <div className="flex items-center justify-center h-96 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
        <div className="text-center text-zinc-500 dark:text-zinc-400">
          <MapPin className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium">Google Maps API Key Required</p>
          <p className="text-sm mt-1">Configure your API key in Settings &gt; API Keys</p>
        </div>
      </div>
    );
  }

  // Only render FlightMapInner when apiKey is ready
  return <FlightMapInner apiKey={apiKey} mapData={mapData} />;
};

export default FlightMap;
