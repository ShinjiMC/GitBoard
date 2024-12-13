import React, { useEffect, useRef, useState } from "react"

export default function CollaborativeSession() {
  const wsRef = useRef<WebSocket | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [cursors, setCursors] = useState<{
    [sessionId: string]: { x: number; y: number; color: string };
  }>({});

  useEffect(() => {
    const storedSessionId = sessionStorage.getItem("sessionId");
    wsRef.current = new WebSocket("ws://localhost:5000");
    // wsRef.current = new WebSocket("wss://2m2w0zf1-3001.brs.devtunnels.ms/")
    
    wsRef.current.onopen = () => {
      console.log("Connected to WebSocket server");
      wsRef.current?.send(
        JSON.stringify({
          type: "initialize",
          sessionId: storedSessionId,
        })
      );
    };

    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("Received from server:", data);

      if (data.type === "session") {
        sessionStorage.setItem("sessionId", data.sessionId);
        setSessionId(data.sessionId);
      } else if (data.type === "cursor") {
        setCursors((prevCursors) => ({
          ...prevCursors,
          [data.sessionId]: {
            x: data.x,
            y: data.y,
            color: data.color, // Guardar el color
          },
        }));
      }
    };

    wsRef.current.onclose = () => {
      console.log("Disconnected from WebSocket server");
    };

    return () => {
      wsRef.current?.close();
    };
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "cursor",
          sessionId,
          x: clientX,
          y: clientY,
        })
      );
    }
  };

  return (
    <div onMouseMove={handleMouseMove} style={{ position: "relative", height: "100vh", width: "100vw" }} className="#ff0000">
      <p>Session ID: {sessionId ?? "Loading..."}</p>
      <p>Move your mouse to see other users&apos; cursors!</p>

      {Object.keys(cursors).map((userSessionId) => (
        <div
          key={userSessionId}
          style={{
            position: "absolute",
            top: cursors[userSessionId].y,
            left: cursors[userSessionId].x,
            width: "10px",
            height: "10px",
            backgroundColor: cursors[userSessionId].color, // Usar el color asignado
            borderRadius: "50%",
          }}
        ></div>
      ))}
    </div>
  );
}
