const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema({
  roomId: { type: String, unique: true, required: true }, // Identificador único de la sala
  users: { type: [String], required: true }, // Array de IDs de usuarios en la sala
});

const Room = mongoose.model("Room", roomSchema);

module.exports = Room;
