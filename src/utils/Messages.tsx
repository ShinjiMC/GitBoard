import React, { useEffect, useRef, useState } from "react";

export default function Messages({ roomId, userId }: { roomId: string; userId: string }) {
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false); // Estado para verificar si WebSocket está conectado
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [messages, setMessages] = useState<any[]>([]); // Estado para los mensajes
  const [newMessage, setNewMessage] = useState(""); // Estado para el nuevo mensaje

  useEffect(() => {
    // Conexión WebSocket
    ws.current = new WebSocket("ws://localhost:5000/");

    ws.current.onopen = () => {
      setIsConnected(true);
    };

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "new_audio_message") {
        if (data.roomId === roomId && data.userId !== userId) {
          const audioArrayBuffer = new Uint8Array(data.audio).buffer; // Reconstruir el ArrayBuffer
          const blob = new Blob([audioArrayBuffer], { type: "audio/webm" });
          const audioURL = URL.createObjectURL(blob);

          // Crear y reproducir el audio automáticamente
          const audio = new Audio(audioURL);
          audio.play().catch((error) => console.error("Error playing audio:", error));
        }
      }
      if (data.type === "messages") {
        setMessages(data.messages); // Guardar los mensajes
      }

      if (data.type === "new_message") {
        console.log(data)
        setMessages((prevMessages) => [...prevMessages, data.message]); // Añadir el nuevo mensaje
      }
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
    };

    return () => {
      ws.current?.close(); // Cerrar WebSocket cuando el componente se desmonte
    };
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
  }
  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    const audioChunks: Blob[] = [];

    recorder.ondataavailable = (event) => {
      console.log("Audio chunk received:", event.data);
      audioChunks.push(event.data); // Guarda cada chunk
    };

    recorder.onstop = () => {
      const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
      console.log("Final Audio Blob:", audioBlob);

      const reader = new FileReader();
      reader.readAsArrayBuffer(audioBlob);

      reader.onloadend = () => {
        const audioArrayBuffer = reader.result;
        console.log("Audio ArrayBuffer:", audioArrayBuffer);

        if (ws.current?.readyState === WebSocket.OPEN && audioArrayBuffer) {
          ws.current.send(
            JSON.stringify({
              type: "send_audio",
              userId,
              roomId,
              audio: Array.from(new Uint8Array(audioArrayBuffer as Uint8Array)), // Enviar como array de bytes
            })
          );
        }
      };
    };

    recorder.start();
    setMediaRecorder(recorder);
    setIsRecording(true);
  };

  const stopRecording = () => {
    mediaRecorder?.stop();
    setIsRecording(false);
  };

  return (
    <div className="bg-gray-100 p-6 rounded-lg shadow-lg max-w-2xl mx-auto mt-8">
      <button onClick={isRecording ? stopRecording : startRecording} className="bg-green-800 text-white rounded-md px-4 py-2 hover:bg-slate-800">
        {isRecording ? "Stop Recording" : "Record Audio"}
      </button>
      <ul className="space-y-4 w-full overflow-y-auto max-h-[45vh]">
        {messages.map((msg, index) => (
          <li
            key={index}
            className={`p-2 rounded-lg ${index % 2 === 0 ? 'bg-blue-100' : 'bg-gray-100'}`}
          >
            <div className="flex justify-between items-center">
              <img src={msg.image} className="w-8 h-8 rounded-full" />
              <span className="font-semibold text-blue-600 text-sm">{msg.username.split(' ')[0]}</span>{" "}
            </div>
            <span>{msg.message}</span>
            <div className="text-xs text-gray-500 mt-1">
              <small>{new Date(msg.timestamp).toLocaleTimeString()}</small>
            </div>
          </li>
        ))}
      </ul>

      {/* Input para el nuevo mensaje */}
      <div className="bg-gray-100 p-6 rounded-lg shadow-lg max-w-2xl mx-auto mt-8">
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
