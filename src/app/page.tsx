"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { LiveVehicle } from "../components/Map";

const DynamicMap = dynamic(() => import("../components/Map"), {
  ssr: false,
});

interface AlertPayload {
  id: string;
  vehicle_id: string;
  vehicle_number: string;
  geofence_name: string;
  event_type: string;
  latitude: number;
  longitude: number;
  timestamp: string;
}

export default function Home() {
  const [latestAlert, setLatestAlert] = useState<AlertPayload | null>(null);
  
  // 1. Create a state to track all live vehicles on the map
  // We use a Record (dictionary) so we can easily update existing vehicles without duplicating them
  const [activeVehicles, setActiveVehicles] = useState<Record<string, LiveVehicle>>({});

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8080/ws");

    ws.onmessage = (event) => {
      const data: AlertPayload = JSON.parse(event.data);
      setLatestAlert(data);

      // 2. Update the vehicle's live position in our state
      setActiveVehicles((prev) => ({
        ...prev,
        [data.vehicle_id]: {
          id: data.vehicle_id,
          number: data.vehicle_number,
          lat: data.latitude,
          lng: data.longitude,
        },
      }));

      setTimeout(() => {
        setLatestAlert(null);
      }, 6000);
    };

    return () => {
      ws.close();
    };
  }, []);

  // 3. Convert the dictionary of vehicles into an array to pass to the Map component
  const vehicleArray = Object.values(activeVehicles);

  return (
    <main className="relative w-full h-screen">
      {/* 4. Pass the vehicles down to the Map */}
      <DynamicMap vehicles={vehicleArray} />

      {latestAlert && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[9999] bg-red-600 text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-4 animate-bounce">
          <span className="text-4xl">🚨</span>
          <div className="font-sans">
            <h3 className="font-bold text-xl uppercase tracking-wider">
              Zone Breach
            </h3>
            <p className="text-lg mt-1">
              Vehicle <strong className="bg-red-800 px-2 py-1 rounded">{latestAlert.vehicle_number || latestAlert.vehicle_id}</strong> entered <strong>{latestAlert.geofence_name}</strong>!
            </p>
            <p className="text-sm text-red-200 mt-2">
              Time: {new Date(latestAlert.timestamp).toLocaleTimeString()}
            </p>
          </div>
        </div>
      )}
    </main>
  );
}