import { io } from "socket.io-client";

export let socket; // Declare a shared socket instance

export const initSocket = async () => {
  if (!socket) {
    const backendURL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
    console.log("🔗 Initializing socket connection to:", backendURL);

    const options = {
      "force new connection": true,
      reconnectionAttempts: "Infinity",
      timeout: 10000,
      transports: ["websocket"],
      connect_timeout: 10000,
    };

    socket = io(backendURL, options);

    socket.on("connect", () => {
      console.log("✅ Socket connected:", socket.id);
    });

    socket.on("connect_error", (error) => {
      console.error("❌ Socket connection error:", error);
    });

    socket.on("disconnect", () => {
      console.log("⏹️ Socket disconnected");
    });

    socket.on("error", (error) => {
      console.error("⚠️ Socket error:", error);
    });
  }
  return socket;
};