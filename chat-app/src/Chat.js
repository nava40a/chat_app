import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const Chat = () => {
    const { id } = useParams();
    const [receiverUser, setReceiverUser] = useState(null);
    const [message, setMessage] = useState('');
    const [chatMessages, setChatMessages] = useState([]);
    const [userStatuses, setUserStatuses] = useState({});
    const [socket, setSocket] = useState(null);
    const [isSocketOpen, setIsSocketOpen] = useState(false); // Новое состояние для отслеживания открытости сокета
    const navigate = useNavigate();
    const [currentUser, setCurrentUser] = useState(null);
    const [usersMap, setUsersMap] = useState({});

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('currentUser'));
        setCurrentUser(user);

        const receiver = JSON.parse(localStorage.getItem('receiver'));
        setReceiverUser(receiver);

        const fetchUserInfo = async (userId) => {
            const authToken = localStorage.getItem('authToken');
            const baseURL = 'http://localhost:8000';
            try {
                const response = await axios.get(`${baseURL}/users/info/${userId}`, {
                    headers: { Authorization: `Token ${authToken}` }
                });
                return response.data;
            } catch (error) {
                console.error(`Ошибка при загрузке информации о пользователе с ID ${userId}`);
            }
        };

        if (user) {
            const ws = new WebSocket(`ws://localhost:8000/ws/${user.id}`);

            ws.onopen = () => {
                console.log('Connected to WebSocket');
                setIsSocketOpen(true); // Устанавливаем состояние открытости сокета
                ws.send(JSON.stringify({ type: 'status_update', user_id: user.id, status: 'online' }));
            };

            ws.onmessage = async (event) => {
                const data = JSON.parse(event.data);
                console.log('Получено сообщение:', data);

                if (data.type === 'status_update') {
                    setUserStatuses((prev) => ({ ...prev, [data.user_id]: data.status }));
                    return;
                }

                if (!usersMap[data.sender_id]) {
                    const senderInfo = await fetchUserInfo(data.sender_id);
                    setUsersMap((prev) => ({ ...prev, [data.sender_id]: senderInfo }));
                }

                setChatMessages((prev) => [...prev, data]);
            };

            ws.onerror = (event) => {
                console.error('WebSocket ошибка:', event);
            };

            ws.onclose = () => {
                console.log('Disconnected from WebSocket');
                setIsSocketOpen(false); // Устанавливаем состояние закрытости сокета
            };

            setSocket(ws);
            return () => {
                ws.close();
            };
        }
    }, [usersMap]);

    const handleSendMessage = () => {
        if (message && socket && isSocketOpen) { // Проверяем состояние сокета
            const messageData = {
                sender_id: currentUser.id,  // ID отправителя
                receiver_id: receiverUser.id,  // ID получателя
                content: message,  // Содержимое сообщения
            };
    
            // Добавляем сообщение в чат
            setChatMessages((prev) => [...prev, messageData]);
    
            console.log(`Отправляем сообщение: ${JSON.stringify(messageData)}`);
            // Отправляем сообщение через WebSocket
            socket.send(JSON.stringify(messageData));
            setMessage('');  // Очищаем поле ввода после отправки
        } else {
            console.error('WebSocket не открыт или сообщение пустое. Текущее состояние:', isSocketOpen);
        }
    };

    const handleCloseChat = () => {
        navigate(`/users/info/${id}`);
    };

    return (
        <div style={{ padding: '20px' }}>
            <h2>Чат с пользователем {receiverUser ? receiverUser.username : 'Загрузка...'}</h2>
            <div>
                {receiverUser && <p>Статус: {userStatuses[receiverUser.id] === 'online' ? 'Онлайн' : 'Оффлайн'}</p>}
            </div>
            <div>
                <ul>
                    {chatMessages.map((msg, index) => (
                        <li key={index}>
                            {msg.sender_id === currentUser.id ? (
                                <strong>Вы: {msg.content}</strong>
                            ) : msg.sender_id === receiverUser?.id ? (
                                <strong>{receiverUser.username}: {msg.content}</strong>
                            ) : (
                                <strong>Сообщение от {usersMap[msg.sender_id]?.username || `Пользователь ${msg.sender_id}`}: {msg.content}</strong>
                            )}
                        </li>
                    ))}
                </ul>
            </div>
            <div>
                <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Введите сообщение..."
                />
                <button onClick={handleSendMessage}>Отправить</button>
            </div>
            <button onClick={handleCloseChat} style={{ marginTop: '20px' }}>Закрыть чат</button>
        </div>
    );
};

export default Chat;
