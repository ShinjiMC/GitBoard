import React, { useEffect, useRef, useState } from "react";

interface ChatProps {
  roomId: string; // ID de la sala
  userId: string; // ID del usuario
  roomName: string
}

export default function Messages({ roomId, userId, roomName }: ChatProps) {
  const ws = useRef<WebSocket | null>(null);
  const [messages, setMessages] = useState<any[]>([]); // Estado para los mensajes
  const [newMessage, setNewMessage] = useState(""); // Estado para el nuevo mensaje
  const [isConnected, setIsConnected] = useState(false); // Estado para verificar si WebSocket está conectado

  useEffect(() => {
    // Conexión WebSocket
    ws.current = new WebSocket("ws://localhost:5000");

    // Manejar la apertura de la conexión
    ws.current.onopen = () => {
      setIsConnected(true);
    };

    // Escuchar mensajes del servidor
    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "messages") {
        setMessages(data.messages); // Guardar los mensajes
      }

      if (data.type === "new_message") {
        console.log(data)
        setMessages((prevMessages) => [...prevMessages, data.message]); // Añadir el nuevo mensaje
      }
    };

    // Solicitar los mensajes una vez que la conexión esté abierta
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(
        JSON.stringify({
          type: "get_messages",
          userId,
          roomId,
        })
      );
    }

    return () => ws.current?.close(); // Cerrar WebSocket cuando el componente se desmonte
  }, [roomId, userId]);

  useEffect(() => {
    if (isConnected && ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(
        JSON.stringify({
          type: "get_messages",
          userId,
          roomId,
        })
      );
    }
  }, [isConnected, roomId, userId]);

  const sendMessage = () => {
    if (ws.current?.readyState === WebSocket.OPEN && userId && roomId && newMessage) {
      ws.current.send(
        JSON.stringify({
          type: "send_message",
          userId,
          roomId,
          message: newMessage,
        })
      );
      setNewMessage(""); // Limpiar el campo de texto después de enviar
    }
  };

  return (
    <div className="bg-gray-100 p-6 rounded-lg shadow-lg max-w-2xl mx-auto mt-8">
      {/* Contenedor de mensajes */}
      <h1 className="text-xl font-bold text-center text-blue-600 mb-4">Sala: {roomName}</h1>

      <div className="overflow-y-auto bg-white p-4 rounded-lg shadow-md mb-4">
        <ul className="space-y-4">
          {messages.map((msg, index) => (
            <li
              key={index}
              className={`p-2 rounded-lg ${index % 2 === 0 ? 'bg-blue-100' : 'bg-gray-100'}`}
            >
              <img src={msg.image} className="w-12 h-12"/>
              <span className="font-semibold text-blue-600">{msg.username}:</span>{" "}
              <span>{msg.message}</span>
              <div className="text-xs text-gray-500 mt-1">
                <small>{new Date(msg.timestamp).toLocaleTimeString()}</small>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Input para el nuevo mensaje */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Escribe tu mensaje..."
          className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={sendMessage}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
        >
          Enviar
        </button>
      </div>
    </div>
  );
}
