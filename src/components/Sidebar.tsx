"use client";

import { useState } from "react";
import { api, Geofence, Vehicle, Violation } from "../lib/api";

type Tab = "vehicles" | "geofences" | "simulate" | "violations";

interface SidebarProps {
  vehicles: Vehicle[];
  geofences: Geofence[];
  onVehiclesChanged: () => void;
  onGeofencesChanged: () => void;
  drawMode: boolean;
  onToggleDrawMode: () => void;
  drawPoints: [number, number][];
  onFinishDraw: (name: string, description: string, category: string) => Promise<void>;
  onCancelDraw: () => void;
  simulateMode: boolean;
  onToggleSimulateMode: () => void;
  simulateVehicleId: string;
  onSimulateVehicleIdChange: (id: string) => void;
  pendingSimulatePoint: [number, number] | null;
  onSendSimulatedLocation: () => Promise<void>;
}

const tabLabels: { key: Tab; label: string }[] = [
  { key: "vehicles", label: "Vehicles" },
  { key: "geofences", label: "Geofences" },
  { key: "simulate", label: "Simulate" },
  { key: "violations", label: "History" },
];

export default function Sidebar(props: SidebarProps) {
  const [tab, setTab] = useState<Tab>("vehicles");

  return (
    <div className="w-[380px] h-screen overflow-y-auto bg-white border-r border-gray-200 shadow-xl flex flex-col text-sm">
      <div className="p-4 border-b border-gray-200">
        <h1 className="font-bold text-lg">Geofence Monitor</h1>
        <p className="text-gray-500 text-xs mt-1">
          Register vehicles, draw geofences, simulate movement, and review violations.
        </p>
      </div>

      <div className="flex border-b border-gray-200">
        {tabLabels.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 text-xs font-semibold ${
              tab === t.key ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-500"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {tab === "vehicles" && (
          <VehiclesPanel vehicles={props.vehicles} onChanged={props.onVehiclesChanged} />
        )}
        {tab === "geofences" && (
          <GeofencesPanel
            geofences={props.geofences}
            onGeofencesChanged={props.onGeofencesChanged}
            drawMode={props.drawMode}
            onToggleDrawMode={props.onToggleDrawMode}
            drawPoints={props.drawPoints}
            onFinishDraw={props.onFinishDraw}
            onCancelDraw={props.onCancelDraw}
          />
        )}
        {tab === "simulate" && (
          <SimulatePanel
            vehicles={props.vehicles}
            simulateMode={props.simulateMode}
            onToggleSimulateMode={props.onToggleSimulateMode}
            simulateVehicleId={props.simulateVehicleId}
            onSimulateVehicleIdChange={props.onSimulateVehicleIdChange}
            pendingSimulatePoint={props.pendingSimulatePoint}
            onSendSimulatedLocation={props.onSendSimulatedLocation}
          />
        )}
        {tab === "violations" && <ViolationsPanel vehicles={props.vehicles} geofences={props.geofences} />}
      </div>
    </div>
  );
}

function VehiclesPanel({ vehicles, onChanged }: { vehicles: Vehicle[]; onChanged: () => void }) {
  const [form, setForm] = useState({ vehicle_number: "", driver_name: "", vehicle_type: "truck", phone: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!form.vehicle_number.trim()) {
      setError("Vehicle number is required");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await api.registerVehicle(form);
      setForm({ vehicle_number: "", driver_name: "", vehicle_type: "truck", phone: "" });
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to register vehicle");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h2 className="font-semibold">Register a vehicle</h2>
        <input
          className="w-full border rounded px-2 py-1"
          placeholder="Vehicle number (e.g. KA01AB1234)"
          value={form.vehicle_number}
          onChange={(e) => setForm({ ...form, vehicle_number: e.target.value })}
        />
        <input
          className="w-full border rounded px-2 py-1"
          placeholder="Driver name"
          value={form.driver_name}
          onChange={(e) => setForm({ ...form, driver_name: e.target.value })}
        />
        <select
          className="w-full border rounded px-2 py-1"
          value={form.vehicle_type}
          onChange={(e) => setForm({ ...form, vehicle_type: e.target.value })}
        >
          <option value="truck">Truck</option>
          <option value="van">Van</option>
          <option value="car">Car</option>
          <option value="bike">Bike</option>
        </select>
        <input
          className="w-full border rounded px-2 py-1"
          placeholder="Phone"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        {error && <p className="text-red-600 text-xs">{error}</p>}
        <button
          disabled={submitting}
          onClick={submit}
          className="w-full bg-blue-600 text-white rounded py-1.5 font-semibold disabled:opacity-50"
        >
          {submitting ? "Registering..." : "Register vehicle"}
        </button>
      </div>

      <div>
        <h2 className="font-semibold mb-2">Registered vehicles ({vehicles.length})</h2>
        <div className="space-y-1 max-h-72 overflow-y-auto">
          {vehicles.map((v) => (
            <div key={v.id} className="border rounded px-2 py-1">
              <div className="font-semibold">{v.vehicle_number}</div>
              <div className="text-gray-500 text-xs">
                {v.driver_name || "—"} · {v.vehicle_type} · {v.id}
              </div>
            </div>
          ))}
          {vehicles.length === 0 && <p className="text-gray-400 text-xs">No vehicles yet.</p>}
        </div>
      </div>
    </div>
  );
}

function GeofencesPanel({
  geofences,
  onGeofencesChanged,
  drawMode,
  onToggleDrawMode,
  drawPoints,
  onFinishDraw,
  onCancelDraw,
}: {
  geofences: Geofence[];
  onGeofencesChanged: () => void;
  drawMode: boolean;
  onToggleDrawMode: () => void;
  drawPoints: [number, number][];
  onFinishDraw: (name: string, description: string, category: string) => Promise<void>;
  onCancelDraw: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("restricted");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const finish = async () => {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (drawPoints.length < 3) {
      setError("Click at least 3 points on the map to form a polygon");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await onFinishDraw(name, description, category);
      setName("");
      setDescription("");
      onGeofencesChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create geofence");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h2 className="font-semibold">Draw a geofence</h2>
        {!drawMode ? (
          <button
            onClick={onToggleDrawMode}
            className="w-full bg-blue-600 text-white rounded py-1.5 font-semibold"
          >
            Start drawing on map
          </button>
        ) : (
          <div className="space-y-2 bg-blue-50 border border-blue-200 rounded p-2">
            <p className="text-xs text-blue-700">
              Click on the map to add points ({drawPoints.length} added). Add at least 3, then fill in
              details and save.
            </p>
            <input
              className="w-full border rounded px-2 py-1"
              placeholder="Name (e.g. Warehouse Zone)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="w-full border rounded px-2 py-1"
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <select
              className="w-full border rounded px-2 py-1"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="restricted">Restricted</option>
              <option value="delivery">Delivery Zone</option>
              <option value="warehouse">Warehouse</option>
              <option value="customer">Customer Site</option>
            </select>
            {error && <p className="text-red-600 text-xs">{error}</p>}
            <div className="flex gap-2">
              <button
                disabled={submitting}
                onClick={finish}
                className="flex-1 bg-green-600 text-white rounded py-1.5 font-semibold disabled:opacity-50"
              >
                {submitting ? "Saving..." : "Save geofence"}
              </button>
              <button
                onClick={() => {
                  onCancelDraw();
                  setError("");
                }}
                className="flex-1 bg-gray-200 rounded py-1.5 font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div>
        <h2 className="font-semibold mb-2">Saved geofences ({geofences.length})</h2>
        <div className="space-y-1 max-h-72 overflow-y-auto">
          {geofences.map((g) => (
            <GeofenceRow key={g.id} geofence={g} />
          ))}
          {geofences.length === 0 && <p className="text-gray-400 text-xs">No geofences yet.</p>}
        </div>
      </div>
    </div>
  );
}

function GeofenceRow({ geofence }: { geofence: Geofence }) {
  const [eventType, setEventType] = useState("both");
  const [status, setStatus] = useState<string | null>(null);

  const configureAlert = async () => {
    setStatus("Saving...");
    try {
      await api.configureAlert({ geofence_id: geofence.id, event_type: eventType });
      setStatus("Alert rule active");
    } catch {
      setStatus("Failed");
    }
  };

  return (
    <div className="border rounded px-2 py-1">
      <div className="font-semibold">{geofence.name}</div>
      <div className="text-gray-500 text-xs mb-1">{geofence.category} · {geofence.id}</div>
      <div className="flex gap-1 items-center">
        <select
          className="border rounded text-xs px-1 py-0.5 flex-1"
          value={eventType}
          onChange={(e) => setEventType(e.target.value)}
        >
          <option value="entry">Alert on entry</option>
          <option value="exit">Alert on exit</option>
          <option value="both">Alert on both</option>
        </select>
        <button onClick={configureAlert} className="text-xs bg-gray-800 text-white px-2 py-0.5 rounded">
          Set alert
        </button>
      </div>
      {status && <p className="text-xs text-gray-500 mt-1">{status}</p>}
    </div>
  );
}

function SimulatePanel({
  vehicles,
  simulateMode,
  onToggleSimulateMode,
  simulateVehicleId,
  onSimulateVehicleIdChange,
  pendingSimulatePoint,
  onSendSimulatedLocation,
}: {
  vehicles: Vehicle[];
  simulateMode: boolean;
  onToggleSimulateMode: () => void;
  simulateVehicleId: string;
  onSimulateVehicleIdChange: (id: string) => void;
  pendingSimulatePoint: [number, number] | null;
  onSendSimulatedLocation: () => Promise<void>;
}) {
  const [sending, setSending] = useState(false);

  const send = async () => {
    setSending(true);
    try {
      await onSendSimulatedLocation();
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-3">
      <h2 className="font-semibold">Simulate vehicle movement</h2>
      <p className="text-xs text-gray-500">
        Pick a vehicle, then click anywhere on the map to send that point as its new GPS location. If it
        crosses a geofence with an active alert rule, a real-time alert fires.
      </p>
      <select
        className="w-full border rounded px-2 py-1"
        value={simulateVehicleId}
        onChange={(e) => onSimulateVehicleIdChange(e.target.value)}
      >
        <option value="">Select a vehicle...</option>
        {vehicles.map((v) => (
          <option key={v.id} value={v.id}>
            {v.vehicle_number}
          </option>
        ))}
      </select>

      <button
        disabled={!simulateVehicleId}
        onClick={onToggleSimulateMode}
        className={`w-full rounded py-1.5 font-semibold disabled:opacity-50 ${
          simulateMode ? "bg-amber-500 text-white" : "bg-blue-600 text-white"
        }`}
      >
        {simulateMode ? "Click the map to place vehicle" : "Start simulating"}
      </button>

      {pendingSimulatePoint && (
        <div className="bg-amber-50 border border-amber-200 rounded p-2 space-y-2">
          <p className="text-xs">
            New point: {pendingSimulatePoint[0].toFixed(5)}, {pendingSimulatePoint[1].toFixed(5)}
          </p>
          <button
            disabled={sending}
            onClick={send}
            className="w-full bg-green-600 text-white rounded py-1.5 font-semibold disabled:opacity-50"
          >
            {sending ? "Sending..." : "Send location update"}
          </button>
        </div>
      )}
    </div>
  );
}

function ViolationsPanel({ vehicles, geofences }: { vehicles: Vehicle[]; geofences: Geofence[] }) {
  const [filters, setFilters] = useState({ vehicle_id: "", geofence_id: "", start_date: "", end_date: "" });
  const [violations, setViolations] = useState<Violation[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    setLoading(true);
    try {
      const res = await api.listViolations(filters);
      setViolations(res.violations);
      setTotal(res.total_count);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <h2 className="font-semibold">Violation history</h2>
      <div className="space-y-2">
        <select
          className="w-full border rounded px-2 py-1"
          value={filters.vehicle_id}
          onChange={(e) => setFilters({ ...filters, vehicle_id: e.target.value })}
        >
          <option value="">All vehicles</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.vehicle_number}
            </option>
          ))}
        </select>
        <select
          className="w-full border rounded px-2 py-1"
          value={filters.geofence_id}
          onChange={(e) => setFilters({ ...filters, geofence_id: e.target.value })}
        >
          <option value="">All geofences</option>
          {geofences.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <input
            type="date"
            className="w-1/2 border rounded px-2 py-1"
            value={filters.start_date}
            onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
          />
          <input
            type="date"
            className="w-1/2 border rounded px-2 py-1"
            value={filters.end_date}
            onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
          />
        </div>
        <button onClick={search} className="w-full bg-blue-600 text-white rounded py-1.5 font-semibold">
          {loading ? "Loading..." : "Search"}
        </button>
      </div>

      <div>
        <p className="text-xs text-gray-500 mb-1">{total} total match(es)</p>
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {violations.map((v) => (
            <div key={v.id} className="border rounded px-2 py-1">
              <div className="flex justify-between">
                <span className="font-semibold">{v.vehicle_number || v.vehicle_id}</span>
                <span
                  className={`text-xs font-bold uppercase ${
                    v.event_type === "entry" ? "text-red-600" : "text-amber-600"
                  }`}
                >
                  {v.event_type}
                </span>
              </div>
              <div className="text-gray-500 text-xs">{v.geofence_name}</div>
              <div className="text-gray-400 text-xs">{new Date(v.timestamp).toLocaleString()}</div>
            </div>
          ))}
          {violations.length === 0 && <p className="text-gray-400 text-xs">No results yet — run a search.</p>}
        </div>
      </div>
    </div>
  );
}
