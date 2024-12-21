const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
    roomId: { type: String, required: true }, // Referencia al roomId
    userId: { type: String, required: true }, // ID del usuario que envió el mensaje
    text: { type: String, required: true }, // Texto del mensaje
    timestamp: { type: Date, default: Date.now }, // Hora de envío
  });
  
  const Message = mongoose.model("Message", messageSchema);
  
  module.exports = Message;
  