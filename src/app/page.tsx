"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { LiveVehicle } from "../components/Map";
import Sidebar from "../components/Sidebar";
import { api, Geofence, Vehicle, WS_URL } from "../lib/api";

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
  const [activeVehicles, setActiveVehicles] = useState<Record<string, LiveVehicle>>({});

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [geofences, setGeofences] = useState<Geofence[]>([]);

  const [drawMode, setDrawMode] = useState(false);
  const [drawPoints, setDrawPoints] = useState<[number, number][]>([]);

  const [simulateMode, setSimulateMode] = useState(false);
  const [simulateVehicleId, setSimulateVehicleId] = useState("");
  const [pendingSimulatePoint, setPendingSimulatePoint] = useState<[number, number] | null>(null);

  const refreshVehicles = useCallback(async () => {
    const res = await api.listVehicles();
    setVehicles(res.vehicles);
  }, []);

  const refreshGeofences = useCallback(async () => {
    const res = await api.listGeofences();
    setGeofences(res.geofences);
  }, []);

  useEffect(() => {
    let cancelled = false;

    Promise.all([api.listVehicles(), api.listGeofences()]).then(([v, g]) => {
      if (cancelled) return;
      setVehicles(v.vehicles);
      setGeofences(g.geofences);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Real-time alert delivery over WebSocket
  useEffect(() => {
    const ws = new WebSocket(WS_URL);

    ws.onmessage = (event) => {
      const data: AlertPayload = JSON.parse(event.data);
      setLatestAlert(data);

      setActiveVehicles((prev) => ({
        ...prev,
        [data.vehicle_id]: {
          id: data.vehicle_id,
          number: data.vehicle_number,
          lat: data.latitude,
          lng: data.longitude,
        },
      }));

      setTimeout(() => setLatestAlert(null), 6000);
    };

    return () => ws.close();
  }, []);

  const handleMapClick = (lat: number, lng: number) => {
    if (drawMode) {
      setDrawPoints((prev) => [...prev, [lat, lng]]);
    } else if (simulateMode) {
      setPendingSimulatePoint([lat, lng]);
    }
  };

  const finishDraw = async (name: string, description: string, category: string) => {
    // Close the polygon by repeating the first point, as the backend requires >= 4 coordinates.
    const closed = [...drawPoints, drawPoints[0]];
    await api.createGeofence({ name, description, category, coordinates: closed });
    setDrawPoints([]);
    setDrawMode(false);
  };

  const cancelDraw = () => {
    setDrawPoints([]);
    setDrawMode(false);
  };

  const sendSimulatedLocation = async () => {
    if (!simulateVehicleId || !pendingSimulatePoint) return;
    const [lat, lng] = pendingSimulatePoint;
    const vehicle = vehicles.find((v) => v.id === simulateVehicleId);

    await api.updateLocation({
      vehicle_id: simulateVehicleId,
      latitude: lat,
      longitude: lng,
      timestamp: new Date().toISOString(),
    });

    // Reflect the move on the map immediately, even if no alert rule fired for it.
    setActiveVehicles((prev) => ({
      ...prev,
      [simulateVehicleId]: {
        id: simulateVehicleId,
        number: vehicle?.vehicle_number || simulateVehicleId,
        lat,
        lng,
      },
    }));

    setPendingSimulatePoint(null);
    setSimulateMode(false);
  };

  const vehicleArray = Object.values(activeVehicles);
  const clickMode = drawMode ? "draw-geofence" : simulateMode ? "simulate-location" : "none";

  return (
    <main className="relative w-full h-screen flex">
      <Sidebar
        vehicles={vehicles}
        geofences={geofences}
        onVehiclesChanged={refreshVehicles}
        onGeofencesChanged={refreshGeofences}
        drawMode={drawMode}
        onToggleDrawMode={() => {
          setDrawMode((v) => !v);
          setDrawPoints([]);
        }}
        drawPoints={drawPoints}
        onFinishDraw={finishDraw}
        onCancelDraw={cancelDraw}
        simulateMode={simulateMode}
        onToggleSimulateMode={() => {
          setSimulateMode((v) => !v);
          setPendingSimulatePoint(null);
        }}
        simulateVehicleId={simulateVehicleId}
        onSimulateVehicleIdChange={setSimulateVehicleId}
        pendingSimulatePoint={pendingSimulatePoint}
        onSendSimulatedLocation={sendSimulatedLocation}
      />

      <div className="relative flex-1 h-full">
        <DynamicMap
          vehicles={vehicleArray}
          geofences={geofences}
          clickMode={clickMode}
          drawPoints={drawPoints}
          onMapClick={handleMapClick}
        />

        {latestAlert && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[1000] bg-red-600 text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-4 animate-bounce">
            <span className="text-4xl">🚨</span>
            <div className="font-sans">
              <h3 className="font-bold text-xl uppercase tracking-wider">
                Zone {latestAlert.event_type === "exit" ? "Exit" : "Breach"}
              </h3>
              <p className="text-lg mt-1">
                Vehicle{" "}
                <strong className="bg-red-800 px-2 py-1 rounded">
                  {latestAlert.vehicle_number || latestAlert.vehicle_id}
                </strong>{" "}
                {latestAlert.event_type === "exit" ? "left" : "entered"}{" "}
                <strong>{latestAlert.geofence_name}</strong>!
              </p>
              <p className="text-sm text-red-200 mt-2">
                Time: {new Date(latestAlert.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
