import React, { createContext, useEffect, useState } from 'react';

export const WebSocketContext = createContext();

export const WebSocketProvider = ({ children }) => {
    const [ws, setWs] = useState(null);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('currentUser'));
        const websocket = new WebSocket(`ws://localhost:8000/ws/${user.id}`);

        websocket.onopen = () => {
            console.log('WebSocket connection established');
            websocket.send(JSON.stringify({ type: 'status_update', user_id: user.id, status: 'online' }));
        };

        websocket.onmessage = (event) => {
            // Обработка полученных сообщений
            const data = JSON.parse(event.data);
            console.log('Received WebSocket message:', data);
        };

        websocket.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        websocket.onclose = () => {
            console.log('WebSocket connection closed');
        };

        setWs(websocket);

        // Закрытие WebSocket при размонтировании компонента
        return () => {
            websocket.close();
        };
    }, []);

    return (
        <WebSocketContext.Provider value={ws}>
            {children}
        </WebSocketContext.Provider>
    );
};
