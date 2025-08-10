// server.js

const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const http = require('http');
const path = require('path');
const jwt = require('jsonwebtoken'); // ✅ Needed for token verification
const { Server } = require('socket.io');

const projectRoutesFactory = require('./routes/projectRoutes');
const userRoutes = require('./routes/userRoutes');
const taskRoutesFactory = require('./routes/taskRoutes');
const taskDetailsRoutesFactory = require('./routes/taskDetailsRoutes');
const boardRoutesFactory = require('./routes/boardRoutes');
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000", // Change if frontend hosted elsewhere
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected successfully'))
.catch(err => console.error(err));

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutesFactory(io));
app.use('/api/tasks', taskRoutesFactory(io));
app.use('/api/tasks', taskDetailsRoutesFactory(io));
app.use('/api/boards', boardRoutesFactory(io)); // Add this line
// ===============================
// Socket.io connection
// ===============================
io.on('connection', async (socket) => {
    console.log('A socket connected:', socket.id);

    // Token-based authentication for private user room
    const token = socket.handshake.auth?.token;
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.user = decoded.user;

            // Join private user room
            socket.join(socket.user.id);
            console.log(`✅ User ${socket.user.id} joined private room.`);

        } catch (err) {
            console.log('❌ Invalid token. Disconnecting socket.');
            socket.disconnect();
            return;
        }
    } else {
        console.log('❌ No token provided. Disconnecting socket.');
        socket.disconnect();
        return;
    }

    // Project room join/leave
    socket.on('joinProject', (projectId) => {
        socket.join(projectId);
        console.log(`User ${socket.user.id} joined project room ${projectId}`);
    });

    socket.on('leaveProject', (projectId) => {
        socket.leave(projectId);
        console.log(`User ${socket.user.id} left project room ${projectId}`);
    });

    socket.on('disconnect', () => {
        console.log(`User ${socket.user?.id || socket.id} disconnected`);
    });
});

// Start server
server.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});
