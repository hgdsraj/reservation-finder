import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
// CSS is imported in main.jsx to avoid lazy-load timing issues
import { PlatformBadge } from './PlatformBadge.jsx';
import { StarRating } from './StarRating.jsx';
import { ExternalLink } from 'lucide-react';

// Fix Leaflet default marker icon (broken in bundlers)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const PLATFORM_COLORS = {
  opentable: '#DA3743',
  resy: '#0F5AE6',
  tock: '#7C3AED',
  sevenrooms: '#00897B',
  thefork: '#00AA6C',
};

function createPlatformIcon(platform) {
  const color = PLATFORM_COLORS[platform] || '#F59E0B';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
    <path d="M14 0C6.3 0 0 6.3 0 14c0 9.8 14 22 14 22s14-12.2 14-22C28 6.3 21.7 0 14 0z" fill="${color}"/>
    <circle cx="14" cy="14" r="6" fill="white"/>
  </svg>`;
  return L.divIcon({
    html: svg,
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -36],
    className: '',
  });
}

function FitBounds({ markers, center }) {
  const map = useMap();
  useEffect(() => {
    if (markers.length > 1) {
      const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng]));
      map.fitBounds(bounds, { padding: [40, 40] });
    } else if (markers.length === 1) {
      map.setView([markers[0].lat, markers[0].lng], 14);
    } else if (center) {
      map.setView([center.lat, center.lng], 13);
    }
  }, [markers, center, map]);
  return null;
}

export function MapView({ restaurants, cityData, searchParams, onCardClick }) {
  const withCoords = useMemo(
    () => restaurants.filter((r) => r.lat && r.lng),
    [restaurants]
  );

  const center = cityData?.lat ? { lat: cityData.lat, lng: cityData.lng } : { lat: 40.7128, lng: -74.006 };

  if (withCoords.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="text-4xl mb-3">🗺️</div>
        <p className="text-slate-400 font-medium">No restaurants with location data</p>
        <p className="text-slate-600 text-sm mt-1">Switch to list view to see all results</p>
      </div>
    );
  }

  return (
    <div className="isolate rounded-2xl overflow-hidden border border-card-border" style={{ height: '600px' }}>
      <MapContainer
        key={`${center.lat},${center.lng}`}
        center={[center.lat, center.lng]}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
      >
        <TileLayer
          attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitBounds markers={withCoords} center={center} />

        {withCoords.map((r) => (
          <Marker
            key={r.id}
            position={[r.lat, r.lng]}
            icon={createPlatformIcon(r.platform)}
          >
            <Popup maxWidth={280}>
              <div className="text-gray-900 min-w-[200px]">
                {r.photos?.[0] && (
                  <img
                    src={r.photos[0]}
                    alt={r.name}
                    className="w-full h-28 object-cover rounded-t mb-2 -mx-3 -mt-2 w-[calc(100%+24px)]"
                    style={{ width: 'calc(100% + 24px)', margin: '-8px -12px 8px' }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                )}
                <div className="font-semibold text-sm mb-0.5">{r.name}</div>
                <div className="text-xs text-gray-500 mb-1">{r.cuisine}{r.neighborhood ? ` · ${r.neighborhood}` : ''}</div>
                {r.rating && <div className="text-xs text-amber-600 font-semibold mb-1">★ {r.rating}</div>}
                {r.price && <div className="text-xs text-gray-500 mb-2">{r.price}</div>}
                {r.slots?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {r.slots.slice(0, 4).map((s, i) => (
                      <a
                        key={i}
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-0.5 text-xs bg-amber-100 text-amber-800 rounded-full font-semibold hover:bg-amber-200 transition-colors"
                      >
                        {formatTime(s.time)}
                      </a>
                    ))}
                  </div>
                )}
                <a
                  href={r.bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  Book now <ExternalLink size={10} />
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

function formatTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}
