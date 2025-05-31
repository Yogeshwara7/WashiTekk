import { Server } from "socket.io";
export function initializeSocketServer(httpServer) {
    const io = new Server(httpServer, {
        cors: {
            origin: [
                process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
                'http://localhost:8080'
            ],
            methods: ['GET', 'POST']
        }
    });
    io.on('connection', (socket) => {
        console.log('Client connected:', socket.id);
        // Handle plan request created event
        socket.on('plan_request_created', (data) => {
            // Broadcast to all admin clients
            io.emit('new_plan_request', data);
        });
        // Handle plan activated event
        socket.on('plan_activated', (data) => {
            // Broadcast to specific user and all admin clients
            io.emit(`plan_activated_${data.userId}`, data);
            io.emit('plan_status_updated', data);
        });
        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
        });
    });
    return io;
}
