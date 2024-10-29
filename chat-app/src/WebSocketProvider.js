import React, { createContext, useEffect, useState } from 'react';

export const WebSocketContext = createContext(null);

const WebSocketProvider = ({ children }) => {
    const [ws, setWs] = useState(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        const userId = JSON.parse(localStorage.getItem('currentUser')).id;
        const socket = new WebSocket(`ws://localhost:8000/api/ws/${userId}`);

        setWs(socket);

        socket.onopen = () => {
            console.log('WebSocket соединение установлено');
            setIsConnected(true);
        };

        socket.onclose = () => {
            console.log('WebSocket соединение закрыто');
            setIsConnected(false);
        };

        socket.onerror = (error) => {
            console.error('WebSocket ошибка:', error);
        };

        return () => {
            socket.close();
        };
    }, []);

    return (
        <WebSocketContext.Provider value={{ ws, setWs, isConnected }}>
            {children}
        </WebSocketContext.Provider>
    );
};

export default WebSocketProvider;
