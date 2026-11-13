"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Polygon, Popup, Marker } from "react-leaflet";
import L from "leaflet";

// 1. Fix the famous Next.js + Leaflet missing icon bug using Leaflet's CDN
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface Geofence {
  id: string;
  name: string;
  category: string;
  coordinates: [number, number][];
}

// 2. Define the expected shape of our live vehicles
export interface LiveVehicle {
  id: string;
  number: string;
  lat: number;
  lng: number;
}

// 3. Add props so the Map can receive the vehicles from page.tsx
interface MapProps {
  vehicles: LiveVehicle[];
}

export default function Map({ vehicles }: MapProps) {
  const [geofences, setGeofences] = useState<Geofence[]>([]);

  useEffect(() => {
    const fetchGeofences = async () => {
      try {
        const response = await fetch("/api/geofences");
        const data = await response.json();
        if (data.geofences) setGeofences(data.geofences);
      } catch (error) {
        console.error("Failed to fetch geofences:", error);
      }
    };
    fetchGeofences();
  }, []);

  return (
    <MapContainer center={[37.7749, -122.4194]} zoom={13}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap contributors'
      />

      {/* Render Geofences */}
      {geofences.map((geo) => (
        <Polygon
          key={geo.id}
          positions={geo.coordinates}
          pathOptions={{ color: "red", fillColor: "red", fillOpacity: 0.3 }}
        >
          <Popup>
            <div className="font-sans">
              <strong className="text-lg">{geo.name}</strong> <br />
              <span className="text-gray-600">Category: {geo.category}</span>
            </div>
          </Popup>
        </Polygon>
      ))}

      {/* 4. Render Live Vehicle Markers */}
      {vehicles.map((veh) => (
        <Marker key={veh.id} position={[veh.lat, veh.lng]}>
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