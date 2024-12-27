import React, { useEffect, useRef, useState } from "react";

// Definir el tipo para las props que recibirá el componente
interface CollaborativeSessionProps {
    mousePosition: { x: number; y: number };
    clickPosition: { x: number; y: number } | null;
    resetClickPosition: () => void;
}

export default function CollaborativeSession2({ mousePosition, clickPosition, resetClickPosition }: CollaborativeSessionProps) {
    const wsRef = useRef<WebSocket | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [cursors, setCursors] = useState<{
        [sessionId: string]: { x: number; y: number; color: string };
    }>({});

    const [clickMessage, setClickMessage] = useState<string | null>(null); // Estado para el mensaje de clic


    useEffect(() => {
        console.log("mousePosition updated:", mousePosition);
        console.log("clickPosition updated:", clickPosition);
    }, [mousePosition, clickPosition]);

    const simulateClick = (x, y) => {
        const element = document.elementFromPoint(x, y); // Encontrar el elemento en la posición
        if (element) {
            console.log("Simulating click on element:", element);

            // Crear un evento de clic
            const clickEvent = new MouseEvent("click", {
                view: window,
                bubbles: true,
                cancelable: true,
                clientX: x,
                clientY: y,
            });

            // Despachar el evento en el elemento
            element.dispatchEvent(clickEvent);
        } else {
            console.warn("No element found at position:", x, y);
        }
    };

    useEffect(() => {
        const storedSessionId = sessionStorage.getItem("sessionId");
        wsRef.current = new WebSocket("ws://localhost:5000");

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
            }
            if (data.type === "cursor") {
                setCursors((prevCursors) => ({
                    ...prevCursors,
                    [data.sessionId]: {
                        x: data.x,
                        y: data.y,
                        color: data.color, // Guardar el color
                    },
                }));
            }

            if (data.type === "cursor") {
                if (data.sessionId !== sessionId) {
                    console.log("Click event received from another client:", data);

                    // Simular un clic en la posición recibida
                    simulateClick(data.x, data.y);

                    setClickMessage(data.message); // Mostrar el mensaje en pantalla
                    setTimeout(() => setClickMessage(null), 3000); // Ocultar después de 3 segundos
                } else {
                    console.log("Ignoring click event from this client.");
                }
            }

        };

        wsRef.current.onclose = () => {
            console.log("Disconnected from WebSocket server");
        };

        return () => {
            wsRef.current?.close();
        };
    }, []);

    // Enviar la posición del puntero a otros usuarios
    useEffect(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && mousePosition && sessionId) {
            wsRef.current.send(
                JSON.stringify({
                    type: "cursor",
                    sessionId,
                    x: mousePosition.x,
                    y: mousePosition.y,
                })
            );
        }
    }, [mousePosition, sessionId]); // Enviar la posición cada vez que cambie

    // Enviar la posición del clic al servidor cuando ocurra
    useEffect(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && clickPosition && sessionId) {
            wsRef.current.send(
                JSON.stringify({
                    type: "click",
                    sessionId,
                    x: clickPosition.x,
                    y: clickPosition.y,
                })
            );
            console.log(`Click ssfsafdasdfaent to server: (${clickPosition.x}, ${clickPosition.y})`);
            // Reiniciar clickPosition después de enviar
            resetClickPosition();
        }
    }, [clickPosition, sessionId, resetClickPosition]); // Enviar solo cuando ocurra un clic


    return (
        <div style={{ position: "relative", height: "100vh", width: "100vw" }}>
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

            {/* Mostrar el mensaje de clic */}
            {clickMessage && (
                <div
                    className="z-999 bg-black"
                    style={{
                        position: "absolute",
                        bottom: "20px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        backgroundColor: "rgba(0, 0, 0, 0.7)",
                        color: "white",
                        padding: "10px 20px",
                        borderRadius: "10px",
                        fontSize: "16px",
                    }}
                >
                    asas
                    {clickMessage}
                </div>
            )}
        </div>
    );
}
