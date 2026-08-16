import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Leaflet's default marker icons rely on image paths that break under most
// bundlers (Vite included) unless you manually patch them. Rather than
// fight that, we build our own markers as simple colored dots via
// L.divIcon — full styling control, and it sidesteps the broken-icon-image
// problem entirely.
function createDivIcon(colorClass) {
  return L.divIcon({
    className: '',
    html: `<div class="w-4 h-4 rounded-full border-2 border-white shadow-lg ${colorClass}"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

const pickupIcon = createDivIcon('bg-emerald-500');
const dropIcon = createDivIcon('bg-rose-500');
const driverIcon = createDivIcon('bg-blue-500');

const DEFAULT_CENTER = [23.2599, 77.4126];

export function LiveMap({ pickup, drop, driverPosition, center, zoom = 14 }) {
  const mapCenter = center || (pickup ? [pickup.latitude, pickup.longitude] : DEFAULT_CENTER);

  return (
    <MapContainer center={mapCenter} zoom={zoom} className="w-full h-80 rounded-lg overflow-hidden z-0">
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />

      {pickup && (
        <Marker position={[pickup.latitude, pickup.longitude]} icon={pickupIcon} />
      )}

      {drop && (
        <Marker position={[drop.latitude, drop.longitude]} icon={dropIcon} />
      )}

      {driverPosition && (
        <Marker position={[driverPosition.latitude, driverPosition.longitude]} icon={driverIcon} />
      )}

      {/* NOTE: this is a straight line, not a real routed path — we don't
          have a routing API (OSRM/Mapbox Directions) wired up. It's a
          visual approximation of "pickup connects to drop," not turn-by-turn
          driving directions. */}
      {pickup && drop && (
        <Polyline
          positions={[
            [pickup.latitude, pickup.longitude],
            [drop.latitude, drop.longitude],
          ]}
          pathOptions={{ color: '#71717a', dashArray: '6 6', weight: 2 }}
        />
      )}
    </MapContainer>
  );
}