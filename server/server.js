const WebSocket = require("ws")
const { v4: uuidv4 } = require("uuid")

const PORT = 5000
const wss = new WebSocket.Server({ port: PORT })

console.log(`WebSocket server running on ws://localhost:${PORT}`)

// Almacenar sesiones activas
const sessions = new Map()

// Función para obtener un color de una lista predefinida
function getRandomColor() {
  const colors = [
    "#FF5733", // Rojo
    "#33FF57", // Verde
    "#3357FF", // Azul
    "#FF33A8", // Rosa
    "#33FFF5", // Turquesa
    "#F5FF33", // Amarillo
    "#A833FF", // Púrpura
    "#FF8C33", // Naranja
    "#33FF8C", // Verde claro
    "#8C33FF", // Lila
  ];

  // Seleccionar un color al azar de la lista
  const randomIndex = Math.floor(Math.random() * colors.length);
  return colors[randomIndex];
}


wss.on("connection", (ws) => {
  let sessionId;
  let color;

  ws.on("message", (message) => {
    const data = JSON.parse(message);

    if (data.type === "initialize") {
      if (data.sessionId && sessions.has(data.sessionId)) {
        // Reutilizar el sessionId existente
        sessionId = data.sessionId;
        color = sessions.get(sessionId).color; // Recuperar el color asignado
        console.log(`Session reconnected: ${sessionId}`);
      } else {
        // Crear un nuevo sessionId y asignar un color
        sessionId = uuidv4();
        color = getRandomColor();
        console.log(`New session created: ${sessionId}`);
      }

      // Asociar el WebSocket con la sesión
      sessions.set(sessionId, { ws, color });

      // Enviar el sessionId y color al cliente
      ws.send(JSON.stringify({ type: "session", sessionId, color }));
    }

    if (data.type === "cursor") {
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN && client !== ws) {
          client.send(
            JSON.stringify({
              type: "cursor",
              sessionId,
              x: data.x,
              y: data.y,
              color, // Enviar el color del cursor
            })
          );
        }
      });
    }
  });

  ws.on("close", () => {
    console.log(`Session closed: ${sessionId}`);
    sessions.delete(sessionId);
  });
});
