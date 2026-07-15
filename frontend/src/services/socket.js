import { io } from 'socket.io-client';

// Dynamically use environment variables or fallback to current hostname so phones on local network connect correctly
const URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL?.replace('/api', '') || `http://${window.location.hostname}:5001`;

const socket = io(URL, {
  autoConnect: false, // Don't connect until we explicitly call socket.connect()
});

export default socket;
