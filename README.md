# **Collaborative Drawing Application**

### Real-time collaborative drawing tool with multi-room support, undo/redo functionality, and persistent canvas states.

---

## **Table of Contents**

- [Introduction](#introduction)
- [Features](#features)
- [Technologies Used](#technologies-used)
- [Usage](#usage)
- [Screenshots](#screenshots)
- [Docker](#docker)

---

## **Introduction**

This project is a real-time, collaborative drawing application that allows users to draw simultaneously on a shared canvas. The app supports multiple rooms, where users can create and join different collaborative spaces. Each room’s canvas state is saved, ensuring that users can reconnect and continue where they left off. The application also features undo/redo functionality, brush customization, and a user-friendly interface.

---

## **Features**

- **Real-Time Drawing Synchronization**: Multiple users can draw on the same canvas simultaneously, with updates happening in real-time.
- **Multi-Room Functionality**: Users can create or join separate rooms, each with its own collaborative drawing space.
- **Undo and Redo**: Users can undo and redo their actions across all participants in the same room.
- **Persistent Canvas States**: The canvas state is saved in the database, allowing users to resume their work after disconnecting.
- **Brush Customization**: Adjustable brush size and color picker for customized drawing experiences.
- **Responsive UI**: Built with Material-UI, the app is responsive and works on various screen sizes.

---

## **Technologies Used**

- **Frontend**:
    
    - [React.js](https://reactjs.org/)
    - [Material-UI](https://mui.com/)
    - [Socket.IO Client](https://socket.io/)
- **Backend**:
    
    - [Node.js](https://nodejs.org/)
    - [Express.js](https://expressjs.com/)
    - [Socket.IO](https://socket.io/)
    - [Mongoose](https://mongoosejs.com/)
- **Database**:
    
    - [MongoDB](https://www.mongodb.com/) (local or hosted via MongoDB Atlas)
- **Deployment**:
    
    - [Docker](https://www.docker.com/)

---

## **Usage**

1. Open the app in your browser (`http://localhost:3000`).
2. Enter a room name and click "Join Room" to create or join a collaborative drawing session.
3. Use the tools in the sidebar to adjust brush size and color.
4. Draw on the canvas, and your actions will be broadcasted to all users in the same room in real-time.
5. Use the **Undo** and **Redo** buttons to manage your drawing history.

---

## **Screenshots**

### 1. **Room Creation and Join Screen**
![Screenshot 2024-10-16 234747](https://github.com/user-attachments/assets/4bb81672-7263-45e5-bcec-03acab6f6710)

### 2. **Collaborative Drawing Interface**
![image](https://github.com/user-attachments/assets/e18f448f-dfa8-47f1-bb1b-945788f72a3b)

