import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { socketUpdateSession } from "../sessions/sessionSlice";
import { io } from "socket.io-client";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const BACKEND_URL = API_BASE.replace(/\/api$/, "") || "http://localhost:5000";

const useSocket = (sessionId) => {
  const dispatch = useDispatch();
  const socketRef = useRef(null);
  const { user } = useSelector((state) => state.auth);
  const userId = user?._id;

  useEffect(() => {
    if (!userId) return;

    // Don't create a new socket if one already exists and is connected
    if (socketRef.current?.connected) return;

    const socket = io(BACKEND_URL, {
      query: { userId },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      timeout: 20000,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Connected to socket server");
      if (sessionId) socket.emit("joinSession", sessionId);
    });

    socket.on("disconnect", (reason) => {
      console.log("Disconnected from socket server:", reason);
    });

    socket.on("sessionUpdate", (data) => {
      console.log("Received session update:", data);
      dispatch(socketUpdateSession(data));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [userId, sessionId, dispatch]);

  return socketRef.current;
};

export default useSocket;
