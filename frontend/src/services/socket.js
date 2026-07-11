import { io } from 'socket.io-client';

// Dynamically use the current hostname so phones on local network connect correctly
const URL = `http://${window.location.hostname}:5001`;

const socket = io(URL, {
  autoConnect: false, // Don't connect until we explicitly call socket.connect()
});

export default socket;
