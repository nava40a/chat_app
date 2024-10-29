import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { WebSocketContext } from './WebSocketProvider';

const UserInfo = () => {
    const navigate = useNavigate();
    const { ws } = useContext(WebSocketContext);
    const [message, setMessage] = useState('');
    const [incomingMessages, setIncomingMessages] = useState([]);
    const [userName, setUserName] = useState('');
    const [receiverName, setReceiverName] = useState('');
    const [receiverStatus, setReceiverStatus] = useState('offline');
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [messages, setMessages] = useState([]);

    useEffect(() => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            navigate('/auth');
            return;
        }

        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (currentUser) {
            setUserName(currentUser.username);
        }

        const receiver = JSON.parse(localStorage.getItem('receiver'));
        if (receiver) {
            setReceiverName(receiver.username);
            const savedStatuses = JSON.parse(localStorage.getItem('userStatuses')) || {};
            setReceiverStatus(savedStatuses[receiver.id] || 'offline');

            const savedMessages = JSON.parse(localStorage.getItem(`messages_${receiver.id}`)) || [];
            setIncomingMessages(savedMessages);

            const newMessages = JSON.parse(localStorage.getItem('newMessages')) || {};
            if (newMessages[receiver.id]) {
                newMessages[receiver.id] = false; // Сбрасываем статус новых сообщений
                localStorage.setItem('newMessages', JSON.stringify(newMessages));
            }
        }

        const handleIncomingMessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.type === "status_update") {
                const { user_id, status } = data;
                if (user_id === receiver.id) {
                    setReceiverStatus(status);
                    const savedStatuses = JSON.parse(localStorage.getItem('userStatuses')) || {};
                    const updatedStatuses = { ...savedStatuses, [user_id]: status };
                    localStorage.setItem('userStatuses', JSON.stringify(updatedStatuses));
                }
            } else {
                setIncomingMessages((prevMessages) => [data, ...prevMessages]);

                const receiverId = receiver.id;
                const messages = JSON.parse(localStorage.getItem(`messages_${receiverId}`)) || [];
                messages.unshift(data);
                localStorage.setItem(`messages_${receiverId}`, JSON.stringify(messages));

                const newMessages = JSON.parse(localStorage.getItem('newMessages')) || {};
                localStorage.setItem('newMessages', JSON.stringify(newMessages));
            }
        };

        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'status_update',
                user_id: currentUser.id,
                status: 'online'
            }));

            ws.addEventListener('message', handleIncomingMessage);
        }

        return () => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.removeEventListener('message', handleIncomingMessage);
            }
        };
    }, [ws, navigate]);

    const handleMessageSend = () => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            const currentUser = JSON.parse(localStorage.getItem('currentUser'));
            const receiverId = JSON.parse(localStorage.getItem('receiver')).id;
            const messageData = {
                sender_id: currentUser.id,
                receiver_id: receiverId,
                content: message,
                created_at: new Date().toISOString()
            };

            ws.send(JSON.stringify(messageData));

            setIncomingMessages((prevMessages) => [messageData, ...prevMessages]);

            const messages = JSON.parse(localStorage.getItem(`messages_${receiverId}`)) || [];
            messages.unshift(messageData);
            localStorage.setItem(`messages_${receiverId}`, JSON.stringify(messages));

            setMessage('');
        } else {
            console.log('Соединение не установлено');
        }
    };

    const handleLoadMessages = async () => {
        setLoadingMessages(true);
        const receiverId = JSON.parse(localStorage.getItem('receiver')).id;

        try {
            const response = await fetch(`http://localhost:8000/api/messages/${receiverId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Token ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Ошибка при загрузке сообщений');
            }

            const data = await response.json();
            setMessages(data);
        } catch (error) {
            console.error('Ошибка при загрузке сообщений:', error);
        } finally {
            setLoadingMessages(false);
        }
    };

    const handleBackToAuthPage = () => {
        localStorage.removeItem('receiver');
        localStorage.removeItem('authToken');
        localStorage.removeItem('userStatuses');
        localStorage.removeItem('currentUser');
        if (ws) {
            ws.close();
        }

        navigate('/auth');
    };

    const handleBackToUsersList = () => {
        const receiverId = JSON.parse(localStorage.getItem('receiver')).id;
        const newMessages = JSON.parse(localStorage.getItem('newMessages')) || {};
        newMessages[receiverId] = false;
        localStorage.setItem('newMessages', JSON.stringify(newMessages));

        navigate('/users');
    };

    return (
        <div style={{ padding: '20px', position: 'relative' }}>
            <h2>Чат с пользователем {receiverName} ({receiverStatus})</h2>
            <button onClick={handleBackToAuthPage} style={{ position: 'absolute', top: '20px', right: '20px' }}>
                Выйти
            </button>
            <button onClick={handleBackToUsersList} style={{ marginBottom: '20px' }}>
                К списку пользователей
            </button>
            <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Введите сообщение"
                rows="4"
                style={{ width: '100%', marginBottom: '10px' }}
            />
            <button onClick={handleMessageSend}>Отправить сообщение</button>

            <ul style={{ marginTop: '20px' }}>
                {incomingMessages.map((msg, index) => (
                    <li key={index}>
                        {msg.sender_id === JSON.parse(localStorage.getItem('currentUser')).id ? 'Вы: ' : `${receiverName}: `}
                        {msg.content}
                    </li>
                ))}
            </ul>

            {loadingMessages && <p>Загрузка истории сообщений...</p>}
            {messages.length > 0 && (
                <div>
                    <h3>История сообщений:</h3>
                    <ul>
                        {messages.slice().reverse().map((message, index) => (
                            <li key={index}>
                                <p><strong>От:</strong> {message.sender_id === JSON.parse(localStorage.getItem('currentUser')).id ? userName : receiverName}</p>
                                <p><strong>Кому:</strong> {message.receiver_id === JSON.parse(localStorage.getItem('currentUser')).id ? userName : receiverName}</p>
                                <p><strong>Сообщение:</strong> {message.content}</p>
                                <p><strong>Дата:</strong> {new Date(message.created_at).toLocaleString()}</p>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <button onClick={handleLoadMessages} style={{ marginTop: '20px' }}>
                Загрузить историю сообщений
            </button>
        </div>
    );
};

export default UserInfo;
