const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const url = require('url');

const db = require('./config/db');
const chatUtils = require('./utils/chatUtils');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 4000;
const PUBLIC_ROOM = 'general';

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

const wss = new WebSocket.Server({ server });

//Envía un objeto JSON a todos los clientes de una sala
const broadcastToRoom = (room, data) => {
    const clients = chatUtils.getClientsInRoom(room);
    const payload = JSON.stringify(data);
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
        }
    });
};

//Envía la lista de usuarios conectados (para el Sidebar)
const sendOnlineUsersList = (room = PUBLIC_ROOM) => {
    const usersList = chatUtils.getUsersInRoom(room);
    broadcastToRoom(room, {
        type: 'onlineUsers',
        users: usersList.map(name => ({ name }))
    });
};


wss.on('connection', async (ws, req) => {
    const parsedUrl = url.parse(req.url, true);

    //Obtengo el username de la URL (frontend lo envía en la conexión)
    const username = parsedUrl.query.username || `Invitado_${Date.now()}`;

    ws.username = username;
    ws.room = PUBLIC_ROOM;

    chatUtils.addUser(ws, username, PUBLIC_ROOM);
    console.log(`✅ Usuario conectado: ${username}`);

    //Cargo los últimos 10 mensajes
    try {
        const result = await db.query(
            'SELECT sender, text, timestamp FROM messages WHERE room = $1 ORDER BY timestamp DESC LIMIT 10',
            [PUBLIC_ROOM]
        );

        ws.send(JSON.stringify({
            type: 'messageHistory',
            messages: result.rows.reverse(),
        }));
    } catch (error) {
        console.error('❌ Error al cargar historial:', error);
    }

    //Notifico a la sala y actualizo la lista de usuarios
    const systemMessage = {
        type: 'systemMessage',
        text: `${username} se ha unido al chat.`,
        sender: 'Sistema',
        timestamp: new Date().toISOString()
    };
    broadcastToRoom(PUBLIC_ROOM, systemMessage);
    sendOnlineUsersList(PUBLIC_ROOM);


    // --- MANEJO DE MENSAJES RECIBIDOS ---
    ws.on('message', async (message) => {
        let data;
        try {
            data = JSON.parse(message.toString());
        } catch (e) {
            return;
        }

        if (data.type === 'sendMessage' && data.message && typeof data.message === 'string') {
            const sender = ws.username;
            const room = ws.room;
            const text = data.message.substring(0, 500).trim();

            if (!text) return;

            // Guardo mensaje en PostgreSQL
            try {
                await db.query(
                    'INSERT INTO messages (sender, room, text) VALUES ($1, $2, $3)',
                    [sender, room, text]
                );
            } catch (error) {
                console.error('❌ Error al guardar mensaje en DB:', error);
            }

            // Emitir el mensaje a todos en la sala
            const timestamp = new Date().toISOString();
            const messagePayload = {
                type: 'newMessage',
                sender: sender,
                text: text,
                timestamp: timestamp
            };

            broadcastToRoom(room, messagePayload);
        }
    });

    //MANEJO DE DESCONEXIÓN
    ws.on('close', () => {
        const username = ws.username;
        const room = ws.room;

        chatUtils.removeUser(username, room);
        console.log(`Usuario desconectado: ${username}`);

        // Notifico a la sala y actualizo la lista de usuarios
        const systemMessage = {
            type: 'systemMessage',
            text: `${username} ha abandonado la sala.`,
            sender: 'Sistema',
            timestamp: new Date().toISOString()
        };
        broadcastToRoom(room, systemMessage);
        sendOnlineUsersList(room);
    });
});

server.listen(PORT, () => {
    console.log(`🚀 Servidor WebSocket y Express corriendo en http://localhost:${PORT}`);
    db.initializeDB();
});