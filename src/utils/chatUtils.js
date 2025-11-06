// Almacena los usuarios: { username: { ws: WebSocket, room: string } }
const connectedUsers = {};

// Almacena las conexiones por sala: { roomName: [WebSocket, ...] }
const rooms = { general: [] };

const addUser = (ws, username, room = 'general') => {
    //Añado el usuario a la lista global
    connectedUsers[username] = { ws, room };
    
    //Añado la conexión a la sala
    if (!rooms[room]) {
        rooms[room] = [];
    }
    rooms[room].push(ws);
};

const removeUser = (username, room = 'general') => {
    if (!username || !connectedUsers[username]) return;

    const ws = connectedUsers[username].ws;

    //Elimino de la lista global
    delete connectedUsers[username];

    //Elimino de la sala (filtrando la conexión WS específica)
    if (rooms[room]) {
        rooms[room] = rooms[room].filter(client => client !== ws);
    }
};

const getUsersInRoom = (room = 'general') => {
    return Object.keys(connectedUsers)
        .filter(username => connectedUsers[username].room === room);
};

// Obtengo todos los clientes WS en una sala para broadcast
const getClientsInRoom = (room = 'general') => {
    return rooms[room] || [];
};

module.exports = {
    addUser,
    removeUser,
    getUsersInRoom,
    getClientsInRoom
};