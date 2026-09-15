// Import the Express module so we can create a web server.
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 3000;

// Import Routes
const shiftRoutes = require('./routes/shifts.routes');
const userRoutes = require('./routes/users.routes');
const workplaceRoutes = require('./routes/workplaces.routes');
const authRoutes = require('./routes/auth.routes');
const managerRoutes = require('./routes/manager.routes');
const { initChatSocket } = require('./sockets/chat.socket');

app.use(express.static(path.join(__dirname, 'public')));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Use Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/workplaces', workplaceRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/manager', managerRoutes);

app.get('/api/student', async (req, res) => { 
    const studentData = {
        "name": "Tim Smith",
        "studentId": "223512028"
    }
    res.json({ statusCode: 200, data: studentData, message: "Success" }); 
});

// Socket.io needs to attach to the underlying HTTP server (not the Express
// app directly) so it can hijack the same port for the WebSocket upgrade
// handshake — this is why app.listen() below became server.listen().
const server = http.createServer(app);
const io = new Server(server);
initChatSocket(io);

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('Connected to MongoDB!');
        server.listen(port, () => {
            console.log(`Server is running on http://localhost:${port}`);
        });
    })
    .catch((error) => {
        console.error('Unable to connect to MongoDB:', error.message);
        process.exit(1);
    });