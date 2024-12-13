const WebSocket = require("ws")
const { v4: uuidv4 } = require("uuid")

const PORT = 3001
const wss = new WebSocket.Server({ port: PORT })

console.log(`WebSocket server running on ws://localhost:${PORT}`)

// Almacenar sesiones activas
const sessions = new Map()

wss.on("connection", (ws) => {
  const sessionId = uuidv4() // Generar un identificador único para la sesión
  sessions.set(sessionId, ws) // Asociar el WebSocket con su sesión
  console.log(`New session created: ${sessionId}`)

  // Enviar el nombre de la sesión al cliente
  ws.send(JSON.stringify({ type: "session", sessionId }))

  // Enviar las posiciones de los cursores de otros usuarios cuando el cliente se conecta
  wss.clients.forEach((client) => {
    if (client !== ws && client.readyState === WebSocket.OPEN) {
      client.send(
        JSON.stringify({
          type: "cursor",
          sessionId,
          x: 0, // Posición inicial del cursor
          y: 0
        })
      )
    }
  })

  // Escuchar mensajes del cliente
  ws.on("message", (message) => {
    const data = JSON.parse(message)
    console.log(`Message from ${sessionId}:`, data)

    // Si es un mensaje de posición del cursor, reenviarlo a los demás usuarios
    if (data.type === "cursor") {
      // Broadcast de la posición del cursor a todos los clientes
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN && client !== ws) {
          client.send(
            JSON.stringify({
              type: "cursor",
              sessionId,
              x: data.x,
              y: data.y
            })
          )
        }
      })
    }
  })

  // Manejar la desconexión
  ws.on("close", () => {
    console.log(`Session closed: ${sessionId}`)
    sessions.delete(sessionId) // Eliminar la sesión cerrada
  })
})
