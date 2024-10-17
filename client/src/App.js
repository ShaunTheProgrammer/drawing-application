// src/App.js

import React, { useRef, useEffect, useState } from 'react';
import io from 'socket.io-client';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Button,
  Slider,
  Box,
  TextField,
  CircularProgress,
} from '@mui/material';
import { Brush, LayersClear } from '@mui/icons-material';
import { SketchPicker } from 'react-color';

const socket = io();

function App() {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const drawing = useRef(false);

  // States for brush properties
  const [brushSize, setBrushSize] = useState(5);
  const [brushColor, setBrushColor] = useState('#000000');

  // Action stacks for undo/redo functionality
  const actionStack = useRef([]);
  const undoneStack = useRef([]);

  // State for room management
  const [roomId, setRoomId] = useState('');
  const [inRoom, setInRoom] = useState(false);

  // State for loading indicator
  const [isLoading, setIsLoading] = useState(false);

  // Initialize canvas context when inRoom changes to true
  useEffect(() => {
    if (inRoom && canvasRef.current) {
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      contextRef.current = context;

      // Set initial canvas dimensions
      resizeCanvas();

      // Handle window resize
      window.addEventListener('resize', resizeCanvas);

      return () => {
        window.removeEventListener('resize', resizeCanvas);
      };
    }
  }, [inRoom]);

  // Handle incoming socket events
  useEffect(() => {
    // Handle loadCanvas event
    socket.on('loadCanvas', (actions) => {
      loadCanvasActions(actions);
      setIsLoading(false);
    });

    return () => {
      socket.off('loadCanvas');
    };
  }, []);

  useEffect(() => {
    if (inRoom) {
      // Handle drawing events
      socket.on('drawing', onDrawingEvent);
      socket.on('clearCanvas', clearCanvas);
      socket.on('undo', onUndoEvent);
      socket.on('redo', onRedoEvent);

      return () => {
        socket.off('drawing', onDrawingEvent);
        socket.off('clearCanvas', clearCanvas);
        socket.off('undo', onUndoEvent);
        socket.off('redo', onRedoEvent);
      };
    }
  }, [inRoom]);

  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    const sidePanelWidth = 200; // Width of the side panel
    const appBarHeight = 64; // Height of the AppBar

    canvas.width = window.innerWidth - sidePanelWidth;
    canvas.height = window.innerHeight - appBarHeight;

    // Redraw existing content after resizing
    redrawCanvas();
  };

  const joinRoom = () => {
    if (roomId.trim() === '') return;

    setInRoom(true); // Set inRoom to true before emitting the event
    setIsLoading(true);
    socket.emit('joinRoom', roomId);
  };

  const loadCanvasActions = (actions) => {
    actionStack.current = actions || [];
    redrawCanvas();
  };

  const startDrawing = ({ nativeEvent }) => {
    drawing.current = true;
    const { offsetX, offsetY } = nativeEvent;

    contextRef.current.beginPath();
    contextRef.current.moveTo(offsetX, offsetY);

    // Save action
    const action = {
      type: 'begin',
      offsetX,
      offsetY,
      brushSize,
      brushColor,
    };
    actionStack.current.push(action);
    // Clear the undone stack
    undoneStack.current = [];

    // Emit the action to the server
    socket.emit('drawing', { roomId, action });
  };

  const finishDrawing = () => {
    drawing.current = false;
    contextRef.current.closePath();
  };

  const draw = ({ nativeEvent }) => {
    if (!drawing.current) return;

    const { offsetX, offsetY } = nativeEvent;

    contextRef.current.lineWidth = brushSize;
    contextRef.current.lineCap = 'round';
    contextRef.current.strokeStyle = brushColor;

    contextRef.current.lineTo(offsetX, offsetY);
    contextRef.current.stroke();

    // Save action
    const action = {
      type: 'draw',
      offsetX,
      offsetY,
      brushSize,
      brushColor,
    };
    actionStack.current.push(action);

    // Emit drawing data to server
    socket.emit('drawing', { roomId, action });
  };

  const onDrawingEvent = (action) => {
    const context = contextRef.current;

    context.lineWidth = action.brushSize;
    context.lineCap = 'round';
    context.strokeStyle = action.brushColor;

    if (action.type === 'begin') {
      context.beginPath();
      context.moveTo(action.offsetX, action.offsetY);
    } else if (action.type === 'draw') {
      context.lineTo(action.offsetX, action.offsetY);
      context.stroke();
    }

    // Save action
    actionStack.current.push(action);
  };

  const handleClearCanvas = () => {
    clearCanvas();
    socket.emit('clearCanvas', roomId);

    // Clear action stacks
    actionStack.current = [];
    undoneStack.current = [];
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    context.clearRect(0, 0, canvas.width, canvas.height);
  };

  const undo = () => {
    if (actionStack.current.length === 0) return;

    // Remove the last action(s) and add to undone stack
    let action = actionStack.current.pop();
    undoneStack.current.push(action);

    if (action.type === 'draw') {
      while (actionStack.current.length > 0) {
        action = actionStack.current.pop();
        undoneStack.current.push(action);
        if (action.type === 'begin') break;
      }
    }

    redrawCanvas();

    // Emit undo event
    socket.emit('undo', { roomId });
  };

  const redo = () => {
    if (undoneStack.current.length === 0) return;

    // Restore actions from the undone stack
    let action = undoneStack.current.pop();
    actionStack.current.push(action);

    if (action.type === 'begin') {
      while (undoneStack.current.length > 0) {
        action = undoneStack.current.pop();
        actionStack.current.push(action);
        if (action.type === 'begin') break;
      }
    }

    redrawCanvas();

    // Emit redo event
    socket.emit('redo', { roomId, action });
  };

  const onUndoEvent = () => {
    if (actionStack.current.length === 0) return;

    // Remove the last action(s) and add to undone stack
    let action = actionStack.current.pop();
    undoneStack.current.push(action);

    if (action.type === 'draw') {
      while (actionStack.current.length > 0) {
        action = actionStack.current.pop();
        undoneStack.current.push(action);
        if (action.type === 'begin') break;
      }
    }

    redrawCanvas();
  };

  const onRedoEvent = (action) => {
    if (!action) return;

    // Restore actions from the undone stack
    actionStack.current.push(action);

    if (action.type === 'begin') {
      while (undoneStack.current.length > 0) {
        action = undoneStack.current.pop();
        actionStack.current.push(action);
        if (action.type === 'begin') break;
      }
    }

    redrawCanvas();
  };

  const redrawCanvas = () => {
    clearCanvas();

    const context = contextRef.current;
    context.lineJoin = 'round';

    actionStack.current.forEach((action) => {
      context.lineWidth = action.brushSize;
      context.lineCap = 'round';
      context.strokeStyle = action.brushColor;

      if (action.type === 'begin') {
        context.beginPath();
        context.moveTo(action.offsetX, action.offsetY);
      } else if (action.type === 'draw') {
        context.lineTo(action.offsetX, action.offsetY);
        context.stroke();
      }
    });
  };

  // Room selection screen
  if (!inRoom) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f5f5f5',
        }}
      >
        <Typography variant="h4" gutterBottom>
          Enter Room ID
        </Typography>
        <TextField
          label="Room ID"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          variant="outlined"
        />
        <Button
          variant="contained"
          color="primary"
          onClick={joinRoom}
          sx={{ marginTop: '20px' }}
        >
          Join Room
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* AppBar */}
      <AppBar position="static">
        <Toolbar>
          <Brush />
          <Typography variant="h6" sx={{ flexGrow: 1, marginLeft: 1 }}>
            Collaborative Drawing Board - Room: {roomId}
          </Typography>
          <IconButton color="inherit" onClick={handleClearCanvas}>
            <LayersClear />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Box sx={{ display: 'flex', flexGrow: 1 }}>
        {/* Side Panel */}
        <Box
          sx={{
            width: '200px',
            padding: '10px',
            backgroundColor: '#f5f5f5',
            overflowY: 'auto',
            boxShadow: '2px 0px 5px rgba(0,0,0,0.1)',
          }}
        >
          {/* Brush Size */}
          <Typography variant="subtitle1">Brush Size</Typography>
          <Slider
            value={brushSize}
            onChange={(e, value) => setBrushSize(value)}
            min={1}
            max={50}
            aria-labelledby="brush-size-slider"
          />

          {/* Brush Color */}
          <Typography variant="subtitle1" sx={{ marginTop: '20px' }}>
            Brush Color
          </Typography>
          <SketchPicker
            color={brushColor}
            onChangeComplete={(color) => setBrushColor(color.hex)}
            disableAlpha
            width="180px"
          />

          {/* Undo and Redo Buttons */}
          <Button
            variant="contained"
            onClick={undo}
            sx={{ marginTop: '20px', width: '100%' }}
          >
            Undo
          </Button>
          <Button
            variant="contained"
            onClick={redo}
            sx={{ marginTop: '10px', width: '100%' }}
          >
            Redo
          </Button>
        </Box>

        {/* Canvas */}
        <canvas
          ref={canvasRef}
          style={{ border: '1px solid #ccc', flexGrow: 1, cursor: 'crosshair' }}
          onMouseDown={startDrawing}
          onMouseUp={finishDrawing}
          onMouseOut={finishDrawing}
          onMouseMove={draw}
        />
      </Box>

      {/* Loading Indicator */}
      {isLoading && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(255,255,255,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <CircularProgress />
        </Box>
      )}
    </Box>
  );
}

export default App;
