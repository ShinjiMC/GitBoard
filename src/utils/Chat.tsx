import React, { useEffect, useRef, useState } from "react";
import { useSession, useUser } from "@clerk/remix";
import { v4 as uuidv4 } from "uuid"; // Para generar IDs únicos
import Messages from "./Messages";
import { MdChat } from "react-icons/md";

export default function Chat() {
  const ws = useRef<WebSocket | null>(null);
  const [isOpen, setIsOpen] = useState(false); // Control de expansión del chat
  const [roomId, setRoomId] = useState<string | null>(null); // ID de la sala creada
  const [roomInput, setRoomInput] = useState(""); // Campo para ingresar el ID de la sala al agregar usuario
  const [rooms, setRooms] = useState<any[]>([]); // Lista de salas del usuario
  const [roomIdSelected, setRoomIdSelected] = useState(null);
  const [roomName, setRoomName] = useState("");
  const { user } = useUser();

  useEffect(() => {
    // Establecer WebSocket
    ws.current = new WebSocket("ws://localhost:5000");

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "room_created") {
        alert(`Sala creada: ${data.room.roomId}`);
        setRoomId(data.room.roomId);
      } else if (data.type === "user_added") {
        alert("Usuario agregado a la sala exitosamente.");
      } else if (data.type === "rooms_list") {
        console.log(data.rooms)
        setRooms(data.rooms); // Extraer IDs de las salas
      }
    };

    return () => ws.current?.close();
  }, []);

  const createRoom = () => {
    const newRoomId = uuidv4(); // Generar un ID único para la sala
    if (ws.current?.readyState === WebSocket.OPEN && user?.id) {
      ws.current.send(
        JSON.stringify({
          type: "create_room",
          roomId: newRoomId,
          roomName: roomName,
          creatorId: user.id, // ID del usuario creador
          username: user.fullName, // Asume que el username viene del contexto del usuario
          image: user.imageUrl, 
        })
      );
    }
  };

  const addUserToRoom = () => {
    if (ws.current?.readyState === WebSocket.OPEN && user?.id && roomInput) {
      ws.current.send(
        JSON.stringify({
          type: "add_user",
          roomId: roomInput, // Sala a la que se desea agregar el usuario
          userId: user.id,
          username: user.fullName,
          image: user.imageUrl,
        })
      );
      setRoomInput(""); // Limpiar el campo de entrada
    }
  };

  const listUserRooms = () => {
    if (ws.current?.readyState === WebSocket.OPEN && user?.id) {
      ws.current.send(
        JSON.stringify({
          type: "list_rooms",
          userId: user.id,
        })
      );
    }
  };

  // useEffect para ejecutar la función listUserRooms al montar el componente o cambiar `isOpen`
  useEffect(() => {
    if (isOpen) {
      listUserRooms(); // Solo se ejecuta si el chat está abierto
    }
  }, [isOpen]); // Dependencia de `isOpen`

  // useEffect para ejecutar listUserRooms cuando el componente se monte
  useEffect(() => {
    listUserRooms(); // Se ejecuta cuando el componente se monta
  }, []); // Empty array para ejecutarlo solo una vez al montar

  return (
    <div className="z-50 fixed bg-white rounded-lg bottom-0 right-0">
      <button onClick={() => setIsOpen(!isOpen)} className="p-2 text-lg">
        {isOpen ? <MdChat color="blue" size={50} /> : <MdChat color="black" size={50} />}
      </button>

      {isOpen && (
        <div className="border border-gray-300 p-4 mt-4">
          <h1 className="text-xl font-semibold">Gestión de Salas de Chat</h1>

          {/* Crear Sala */}
          <div className="mb-4">
            <button
              onClick={createRoom}
              className="mr-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Crear Sala
            </button>
            <input
              type="text"
              placeholder="Nombre de la Sala"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="mr-2 p-2 border border-gray-300 rounded"
            />
            {roomId && <span>Última sala creada: {roomId}</span>}
          </div>

          {/* Agregar Usuario a una Sala */}
          <div className="mb-4 flex items-center">
            <input
              type="text"
              placeholder="ID de la Sala"
              value={roomInput}
              onChange={(e) => setRoomInput(e.target.value)}
              className="mr-2 p-2 border border-gray-300 rounded"
            />
            <button
              onClick={addUserToRoom}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Unirse a Sala
            </button>
          </div>

          {/* Listar Salas */}
          <div>
            <button
              onClick={listUserRooms}
              className="mb-4 px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
            >
              Listar Salas
            </button>
            {rooms.length > 0 ? (
              <ul>
                {rooms.map((room, index) => (
                  <li key={index} className="mb-2">
                    <button onClick={() => setRoomIdSelected(room.roomId)}>
                      {room.roomName}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No hay salas asociadas.</p>
            )}
          </div>
          {roomIdSelected && <Messages key={roomIdSelected} userId={user?.id} roomId={roomIdSelected} roomName={rooms.find((room) => room.roomId === roomIdSelected).roomName} />}
        </div>
      )}
    </div>
  );
}
