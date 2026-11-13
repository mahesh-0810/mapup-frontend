"use client";

import { MapContainer, TileLayer, Polygon, Popup, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { Geofence } from "../lib/api";

// 1. Fix the famous Next.js + Leaflet missing icon bug using Leaflet's CDN
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// 2. Define the expected shape of our live vehicles
export interface LiveVehicle {
  id: string;
  number: string;
  lat: number;
  lng: number;
}

type ClickMode = "none" | "draw-geofence" | "simulate-location";

interface MapProps {
  vehicles: LiveVehicle[];
  geofences: Geofence[];
  clickMode: ClickMode;
  drawPoints: [number, number][];
  onMapClick: (lat: number, lng: number) => void;
}

function ClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function Map({ vehicles, geofences, clickMode, drawPoints, onMapClick }: MapProps) {
  return (
    <MapContainer center={[37.7749, -122.4194]} zoom={13}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap contributors'
      />

      {clickMode !== "none" && <ClickHandler onMapClick={onMapClick} />}

      {/* Render saved Geofences. Non-interactive while drawing/simulating so clicks pass
          through to the map instead of being swallowed by the polygon's popup. react-leaflet
          only applies `interactive` at layer construction, not on prop updates, so the mode
          is baked into the key to force a remount whenever it flips. */}
      {geofences.map((geo) => (
        <Polygon
          key={`${geo.id}:${clickMode === "none" ? "interactive" : "passthrough"}`}
          positions={geo.coordinates}
          pathOptions={{ color: "red", fillColor: "red", fillOpacity: 0.3 }}
          interactive={clickMode === "none"}
        >
          <Popup>
            <div className="font-sans">
              <strong className="text-lg">{geo.name}</strong> <br />
              <span className="text-gray-600">Category: {geo.category}</span>
            </div>
          </Popup>
        </Polygon>
      ))}

      {/* Geofence currently being drawn */}
      {drawPoints.length > 0 && (
        <Polygon
          positions={drawPoints}
          pathOptions={{ color: "#2563eb", fillColor: "#2563eb", fillOpacity: 0.25, dashArray: "6" }}
        />
      )}
      {drawPoints.map((p, i) => (
        <Marker key={`draw-${i}`} position={p} />
      ))}

      {/* Live Vehicle Markers */}
      {vehicles.map((veh) => (
        <Marker
          key={`${veh.id}:${clickMode === "none" ? "interactive" : "passthrough"}`}
          position={[veh.lat, veh.lng]}
          interactive={clickMode === "none"}
        >
          <Popup>
            <div className="font-sans font-bold">
              Vehicle: {veh.number}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
