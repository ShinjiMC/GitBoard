import React, { useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/remix";
import { v4 as uuidv4 } from "uuid";
import Messages from "./Messages";
import { MdChat } from "react-icons/md";

export default function Chat() {
  const ws = useRef<WebSocket | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomInput, setRoomInput] = useState("");
  const [rooms, setRooms] = useState<any[]>([]);
  const [roomIdSelected, setRoomIdSelected] = useState(null);
  const [roomName, setRoomName] = useState("");
  const { user } = useUser();

  useEffect(() => {
    ws.current = new WebSocket("ws://localhost:5000/");

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "room_created") {
        // alert(`Sala creada: ${data.room.roomId}`);
        setRoomId(data.room.roomId);
      } else if (data.type === "user_added") {
        // alert("Usuario agregado a la sala exitosamente.");
      } else if (data.type === "rooms_list") {
        setRooms(data.rooms);
      }
    };

    return () => ws.current?.close();
  }, []);

  const createRoom = () => {
    const newRoomId = uuidv4();
    if (ws.current?.readyState === WebSocket.OPEN && user?.id) {
      ws.current.send(
        JSON.stringify({
          type: "create_room",
          roomId: newRoomId,
          roomName: roomName,
          creatorId: user.id,
          username: user.fullName,
          image: user.imageUrl,
        })
      );
    }
    listUserRooms();
  };

  const addUserToRoom = () => {
    if (ws.current?.readyState === WebSocket.OPEN && user?.id && roomInput) {
      ws.current.send(
        JSON.stringify({
          type: "add_user",
          roomId: roomInput,
          userId: user.id,
          username: user.fullName,
          image: user.imageUrl,
        })
      );
      setRoomInput("");
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

  useEffect(() => {
    let intervalId: any;

    if (isOpen) {
      // Ejecutar inmediatamente y luego iniciar el intervalo
      listUserRooms();
      intervalId = setInterval(() => {
        listUserRooms();
      }, 2000);
    }

    return () => {
      // Limpiar el intervalo cuando `isOpen` cambie o el componente se desmonte
      clearInterval(intervalId);
    };
  }, [isOpen]);



  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end">
      <div
        className={`w-96 bg-white shadow-lg rounded-lg overflow-hidden flex flex-col transform 
          transition-transform duration-300 ease-in-out ${isOpen ? "scale-100" : "scale-0 hidden"}`}
      >
        {/* Encabezado del chat */}
        <div className="flex items-center justify-between p-4 bg-[#3B82F6] text-white">
          <h1 className="text-lg font-semibold">Gestión de Salas</h1>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 rounded hover:bg-blue-700 focus:outline-none"
          >
            <MdChat size={24} />
          </button>
        </div>

        {/* Contenido del chat */}
        <div className="p-4 space-y-4 flex-1 overflow-auto">
          {/* Crear Sala */}
          <div>
            <h2 className="text-sm font-medium text-gray-700 mb-2">Crear Sala</h2>
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="Nombre de la Sala"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className="flex-1 p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <button
                // listUserRooms
                onClick={createRoom}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Crear
              </button>
            </div>
            {roomId && (
              <p className="mt-2 text-sm text-green-600">Última sala creada: {roomId}</p>
            )}
          </div>

          {/* Unirse a Sala */}
          <div>
            <h2 className="text-sm font-medium text-gray-700 mb-2">Unirse a Sala</h2>
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="ID de la Sala"
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value)}
                className="flex-1 p-2 border rounded focus:ring-2 focus:ring-green-500 focus:outline-none"
              />
              <button
                onClick={addUserToRoom}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Unirse
              </button>
            </div>
          </div>

          {/* Listar Salas */}
          <div>
            <h2 className="text-sm font-medium text-gray-700 mb-2">Mis Salas</h2>
            {/* <button
              onClick={listUserRooms}
              className="mb-2 px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
            >
              Listar Salas
            </button> */}
            {rooms.length > 0 ? (
              <ul className="space-y-2">
                {rooms.map((room, index) => (
                  <li key={index}>
                    <button
                      onClick={() => setRoomIdSelected(room.roomId)}
                      className={`w-full p-2 text-left rounded border ${room.roomId === roomIdSelected
                        ? "bg-yellow-400 border-yellow-500"
                        : "hover:bg-gray-100"
                        }`}
                    >
                      {room.roomName}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">No hay salas asociadas.</p>
            )}
          </div>
        </div>

        {/* Componente de mensajes */}
        {roomIdSelected && (
          <Messages
            key={roomIdSelected}
            userId={user?.id || ""}
            roomId={roomIdSelected}
            roomName={rooms.find((room) => room.roomId === roomIdSelected).roomName}
          />
        )}
      </div>

      {/* Botón flotante para abrir/cerrar el chat */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 focus:outline-none 
          transition-transform duration-300 ease-in-out ${isOpen ? "scale-0" : "scale-100"}`}
      >
        <MdChat size={24} />
      </button>
    </div>
  );
}
