let io;

module.exports = {
  init: (httpServer) => {
    const { Server } = require('socket.io');
    io = new Server(httpServer, {
      cors: {
        origin: process.env.CLIENT_URL || "http://localhost:5173",
        methods: ["GET", "POST"]
      }
    });

    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });

    return io;
  },
  getIO: () => {
    if (process.env.NODE_ENV === 'test') {
      return {
        to: () => ({
          emit: () => {}
        }),
        emit: () => {}
      };
    }
    if (!io) {
      throw new Error('Socket.io not initialized!');
    }
    return io;
  }
};
