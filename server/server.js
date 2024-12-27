const WebSocket = require("ws");
const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid")

const PORT = 5000;
const wss = new WebSocket.Server({ port: PORT });
require('dotenv').config();
console.log(`WebSocket server running on ws://localhost:${PORT}`);

// Conectar a MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("Conectado a MongoDB"))
  .catch((err) => console.error("Error al conectar a MongoDB:", err));


// Modelo de Sala
const roomSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true },
  creatorId: { type: String, required: true },
  roomName: { type: String, required: false },
  users: [
    {
      userId: { type: String, required: true },
      username: { type: String, required: true },
      image: { type: String, required: true },
    },
  ], // Información completa de los usuarios en la sala
});

const Room = mongoose.model("Room", roomSchema);

// Modelo de Mensaje
const messageSchema = new mongoose.Schema({
  roomId: { type: String, required: true },
  userId: { type: String, required: true },
  username: { type: String, required: true },
  image: { type: String, required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});


const Message = mongoose.model("Message", messageSchema);

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



// Manejo de conexiones WebSocket
wss.on("connection", (ws) => {
  console.log("Cliente conectado");

  let sessionId;
  let color;

  ws.on("message", async (message) => {
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
    
    // Crear Sala
    if (data.type === "create_room") {
      const { roomId, creatorId, roomName, username, image } = data;
    
      try {
        // Verificar si la sala ya existe
        const existingRoom = await Room.findOne({ roomId });
        if (existingRoom) {
          ws.send(JSON.stringify({ type: "error", message: "La sala ya existe" }));
          return;
        }
    
        // Crear la nueva sala con la información del creador
        const room = new Room({
          roomId,
          creatorId,
          roomName,
          users: [{ userId: creatorId, username, image }],
        });
        await room.save();
    
        ws.send(JSON.stringify({ type: "room_created", room }));
      } catch (error) {
        console.error("Error al crear la sala:", error);
        ws.send(JSON.stringify({ type: "error", message: "Error al crear la sala" }));
      }
    }
    
    // Agregar Usuario a la Sala
    if (data.type === "add_user") {
      const { roomId, userId, username, image } = data;
    
      try {
        const room = await Room.findOneAndUpdate(
          { roomId },
          { $addToSet: { users: { userId, username, image } } }, // Agregar usuario con información
          { new: true }
        );
    
        if (!room) {
          ws.send(JSON.stringify({ type: "error", message: "Sala no encontrada" }));
          return;
        }
    
        ws.send(JSON.stringify({ type: "user_added", room }));
      } catch (error) {
        console.error("Error al agregar usuario:", error);
        ws.send(JSON.stringify({ type: "error", message: "Error al agregar usuario" }));
      }
    }
    
    // Listar Salas de un Usuario
    if (data.type === "list_rooms") {
      const { userId } = data;
      try {
        const rooms = await Room.find({ "users.userId": userId });

        ws.send(JSON.stringify({ type: "rooms_list", rooms }));
      } catch (error) {
        console.error("Error al listar salas:", error);
        ws.send(JSON.stringify({ type: "error", message: "Error al listar salas" }));
      }
    }

    // Enviar mensaje
    if (data.type === "send_message") {
      const { userId, roomId, message } = data;
    
      try {
        // Verificar si la sala existe
        const room = await Room.findOne({ roomId });
        if (!room) {
          ws.send(JSON.stringify({ type: "error", message: "La sala no existe" }));
          return;
        }
    
        // Buscar la información del usuario dentro de la sala
        const user = room.users.find((user) => user.userId === userId);
        if (!user) {
          ws.send(JSON.stringify({ type: "error", message: "Usuario no está en la sala" }));
          return;
        }
        // Crear y guardar el nuevo mensaje
        const newMessage = new Message({
          roomId,
          userId,
          username: user.username, // Agrega el username del usuario
          image: user.image,    // Agrega la URL de la imagen del usuario
          message,
        });
        
        await newMessage.save();
    
        // Enviar el mensaje con información del usuario a todos los clientes en la sala
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(
              JSON.stringify({
                type: "new_message",
                message: {
                  roomId,
                  userId,
                  username: user.username, // Incluyendo el username
                  image: user.image, // Incluyendo la URL de la imagen
                  message: message,
                  timestamp: newMessage.timestamp,
                },
              })
            );
          }
        });
      } catch (error) {
        console.error("Error al enviar el mensaje:", error);
        ws.send(JSON.stringify({ type: "error", message: "Error al enviar el mensaje" }));
      }
    }
    
    
    // Obtener mensajes de la sala
    if (data.type === "get_messages") {
      const { roomId } = data;
    
      try {
        // Verificar si la sala existe
        const room = await Room.findOne({ roomId });
        if (!room) {
          ws.send(JSON.stringify({ type: "error", message: "La sala no existe" }));
          return;
        }
    
        // Obtener los mensajes de la sala
        const messages = await Message.find({ roomId }).sort({ timestamp: 1 }); // Ordenar por fecha
    
        // Adjuntar información del usuario a cada mensaje
        const enrichedMessages = messages.map((msg) => {
          const user = room.users.find((u) => u.userId === msg.userId);
          return {
            ...msg.toObject(),
            username: user ? user.username : "Usuario desconocido",
            image: user ? user.image : null,
          };
        });
    
        // Enviar los mensajes enriquecidos al cliente
        ws.send(
          JSON.stringify({
            type: "messages",
            messages: enrichedMessages,
          })
        );
      } catch (error) {
        console.error("Error al obtener los mensajes:", error);
        ws.send(JSON.stringify({ type: "error", message: "Error al obtener los mensajes" }));
      }
    }    
    // voz
    if (data.type === "send_audio") {
      const { roomId, userId, audio } = data;
      try {
        // Verificar si la sala existe
        const room = await Room.findOne({ roomId });
        if (!room) {
          ws.send(JSON.stringify({ type: "error", message: "La sala no existe" }));
          return;
        }
    
        // Buscar la información del usuario dentro de la sala
        const user = room.users.find((user) => user.userId === userId);
        if (!user) {
          ws.send(JSON.stringify({ type: "error", message: "Usuario no está en la sala" }));
          return;
        }
    
        // Enviar el mensaje de audio a todos los clientes de la sala
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(
              JSON.stringify({
                type: "new_audio_message",
                roomId,
                userId,
                audio: Array.from(new Uint8Array(audio)),
              })
            );
          }
        });
      } catch (error) {
        console.error("Error al enviar el mensaje de audio:", error);
        ws.send(JSON.stringify({ type: "error", message: "Error al enviar el mensaje de audio" }));
      }
    }
    
    
  });

  ws.on("close", () => {
    console.log(`Session closed: ${sessionId}`);
    sessions.delete(sessionId);
  });
});
