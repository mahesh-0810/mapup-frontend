// Central place for the backend base URL so nothing hardcodes "localhost:8080".
// Set NEXT_PUBLIC_API_URL (e.g. https://your-backend.onrender.com) when deploying the frontend.
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8080";

export const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL || API_BASE_URL.replace(/^http/, "ws") + "/ws";

export interface Vehicle {
  id: string;
  vehicle_number: string;
  driver_name: string;
  vehicle_type: string;
  phone: string;
  status: string;
  created_at: string;
}

export interface Geofence {
  id: string;
  name: string;
  description: string;
  category: string;
  coordinates: [number, number][];
  created_at: string;
}

export interface CurrentGeofence {
  geofence_id: string;
  geofence_name: string;
  status: string;
}

export interface Violation {
  id: string;
  vehicle_id: string;
  vehicle_number: string;
  geofence_id: string;
  geofence_name: string;
  event_type: string;
  latitude: number;
  longitude: number;
  timestamp: string;
}

export interface AlertRule {
  alert_id: string;
  geofence_id: string;
  geofence_name: string;
  vehicle_id: string;
  vehicle_number: string;
  event_type: string;
  status: string;
  created_at: string;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request to ${path} failed with ${res.status}`);
  }
  return res.json();
}

export const api = {
  listVehicles: () => request<{ vehicles: Vehicle[] }>("/vehicles"),
  registerVehicle: (body: {
    vehicle_number: string;
    driver_name: string;
    vehicle_type: string;
    phone: string;
  }) => request("/vehicles", { method: "POST", body: JSON.stringify(body) }),

  listGeofences: () => request<{ geofences: Geofence[] }>("/geofences"),
  createGeofence: (body: {
    name: string;
    description: string;
    category: string;
    coordinates: [number, number][];
  }) => request("/geofences", { method: "POST", body: JSON.stringify(body) }),

  updateLocation: (body: {
    vehicle_id: string;
    latitude: number;
    longitude: number;
    timestamp: string;
  }) =>
    request<{ vehicle_id: string; location_updated: boolean; current_geofences: CurrentGeofence[] }>(
      "/vehicles/location",
      { method: "POST", body: JSON.stringify(body) }
    ),

  configureAlert: (body: { geofence_id: string; vehicle_id?: string; event_type: string }) =>
    request("/alerts/configure", { method: "POST", body: JSON.stringify(body) }),
  listAlerts: () => request<{ alerts: AlertRule[] }>("/alerts"),

  listViolations: (params: Record<string, string | undefined>) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v) qs.set(k, v);
    });
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return request<{ violations: Violation[]; total_count: number }>(`/violations/history${suffix}`);
  },
};
