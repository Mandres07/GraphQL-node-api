let io;
const corsConfig = {
   cors: {
      origin: 'http://localhost:3000',
      methods: ["GET", "POST"]
   }
};

module.exports = {
   init: httpServer => {
      // Esteblecer la conexion de socket.io se pasa el server de nodejs como argumento
      // Se puede colocar un objeto configuracion como segundo argumento para indicar cors
      io = require('socket.io')(httpServer, corsConfig);
      return io;
   },
   getIO: () => {
      if (!io) {
         throw new Error('Socket.io not initialized.');
      }
      return io;
   }
};