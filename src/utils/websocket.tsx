import React, { useEffect, useRef, useState } from "react"

export default function CollaborativeSession() {
  const wsRef = useRef<WebSocket | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [cursors, setCursors] = useState<{ [sessionId: string]: { x: number; y: number } }>({})

  useEffect(() => {
    // Intentar obtener el sessionId de sessionStorage
    const storedSessionId = sessionStorage.getItem("sessionId")

    if (storedSessionId) {
      // Si ya existe un sessionId almacenado, usarlo
      setSessionId(storedSessionId)
    } else {
      // Si no existe, conectar al servidor WebSocket y generar uno nuevo
      //wsRef.current = new WebSocket("ws://localhost:3001")
      wsRef.current = new WebSocket("wss://2m2w0zf1-3001.brs.devtunnels.ms/")

      wsRef.current.onopen = () => {
        console.log("Connected to WebSocket server")
      }

      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data)
        console.log("Received from server:", data)

        if (data.type === "session") {
          // Guardar el sessionId en sessionStorage
          sessionStorage.setItem("sessionId", data.sessionId)
          setSessionId(data.sessionId)
        } else if (data.type === "cursor") {
          // Actualizar las posiciones de los cursores de otros usuarios
          setCursors((prevCursors) => ({
            ...prevCursors,
            [data.sessionId]: { x: data.x, y: data.y }
          }))
        }
      }

      wsRef.current.onclose = () => {
        console.log("Disconnected from WebSocket server")
      }

      return () => {
        // Limpiar al desmontar el componente (cuando el usuario cierre sesión)
        if (wsRef.current) {
          wsRef.current.close()
        }
      }
    }
  }, [])

  const handleMouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY } = e
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      // Enviar la posición del cursor al servidor WebSocket
      wsRef.current.send(
        JSON.stringify({
          type: "cursor",
          sessionId,
          x: clientX,
          y: clientY
        })
      )
    }
  }

  return (
    <div onMouseMove={handleMouseMove} style={{ position: "relative", height: "100vh", width: "100vw" }}>
      <p>Session ID: {sessionId ?? "Loading..."}</p>
      <p>Move your mouse to see other users&apos; cursors!</p>

      {/* Renderizar el cursor de otros usuarios */}
      {Object.keys(cursors).map((userSessionId) => (
        <div
          key={userSessionId}
          style={{
            position: "absolute",
            top: cursors[userSessionId].y,
            left: cursors[userSessionId].x,
            width: "10px",
            height: "10px",
            backgroundColor: "red",
            borderRadius: "50%"
          }}
        ></div>
      ))}
    </div>
  )
}
