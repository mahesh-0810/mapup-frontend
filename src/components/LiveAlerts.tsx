"use client";

import { useEffect } from "react";
import toast, { Toaster } from "react-hot-toast";

export default function LiveAlerts() {
  useEffect(() => {
    // 1. Establish the WebSocket connection directly to the Go server
    const ws = new WebSocket("ws://localhost:8080/ws");

    // 2. Log when the connection is successful
    ws.onopen = () => {
      console.log("🟢 Connected to Go WebSocket Alerts");
    };

    // 3. Listen for incoming messages from the Go backend
    ws.onmessage = (event) => {
      const alertData = JSON.parse(event.data);
      
      // 4. Trigger a highly visible UI toast notification
      toast.error(
        `🚨 RESTRICTED ZONE ALERT!
        Vehicle: ${alertData.vehicle_id}
        Zone: ${alertData.geofence_name}
        Event: ${alertData.event_type.toUpperCase()}`,
        { 
          duration: 8000,
          style: { border: '2px solid red', padding: '16px', fontWeight: 'bold' } 
        }
      );
    };

    ws.onerror = (error) => {
      console.error("WebSocket Error:", error);
    };

    // 5. Cleanup function to close the connection if the component unmounts
    return () => {
      ws.close();
    };
  }, []);

  // 6. Return the Toaster provider so the popups have a place to render
  return <Toaster position="top-right" />;
}