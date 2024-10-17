// server.js

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/drawingApp', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Define a schema for storing canvas data
const canvasSchema = new mongoose.Schema({
  roomId: String,
  actions: Array, // Array of drawing actions
});

const Canvas = mongoose.model('Canvas', canvasSchema);

// Initialize Express app
const app = express();

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO server
const io = socketIo(server);

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, 'client/build')));

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Handle joining a room
  socket.on('joinRoom', async (roomId) => {
    socket.join(roomId);
    console.log(`${socket.id} joined room ${roomId}`);

    // Retrieve canvas data for the room from the database
    try {
      let canvas = await Canvas.findOne({ roomId });
      if (canvas) {
        // Send the existing canvas actions to the client
        socket.emit('loadCanvas', canvas.actions);
      } else {
        // Create a new canvas document for the room
        canvas = new Canvas({ roomId, actions: [] });
        await canvas.save();
      }
    } catch (error) {
      console.error('Error loading canvas:', error);
    }
  });

  // Handle drawing data
  socket.on('drawing', async (data) => {
    const { roomId, action } = data;

    // Broadcast drawing data to others in the same room
    socket.to(roomId).emit('drawing', action);

    // Save the action to the database
    try {
      await Canvas.updateOne(
        { roomId },
        { $push: { actions: action } }
      );
    } catch (error) {
      console.error('Error saving drawing action:', error);
    }
  });

  // Handle clear canvas event
  socket.on('clearCanvas', async (roomId) => {
    // Broadcast to others in the room
    socket.to(roomId).emit('clearCanvas');

    // Clear the canvas actions in the database
    try {
      await Canvas.updateOne({ roomId }, { $set: { actions: [] } });
    } catch (error) {
      console.error('Error clearing canvas:', error);
    }
  });

  // Handle undo event
  socket.on('undo', async (data) => {
    const { roomId } = data;

    // Broadcast to others in the room
    socket.to(roomId).emit('undo');

    // Remove the last action from the database
    try {
      await Canvas.updateOne(
        { roomId },
        { $pop: { actions: 1 } } // Removes the last element of the array
      );
    } catch (error) {
      console.error('Error performing undo:', error);
    }
  });

  // Handle redo event
  socket.on('redo', async (data) => {
    const { roomId, action } = data;

    // Broadcast the redo action to others in the room
    socket.to(roomId).emit('redo', action);

    // Add the action back to the database
    try {
      await Canvas.updateOne(
        { roomId },
        { $push: { actions: action } }
      );
    } catch (error) {
      console.error('Error performing redo:', error);
    }
  });

  // Handle client disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Fallback route to serve the React app's index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

// Start the server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
