import React, { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { WebSocketContext } from './WebSocketProvider'; // Импортируйте контекст WebSocket

const UserInfo = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const ws = useContext(WebSocketContext); // Получите доступ к WebSocket
    const [userInfo, setUserInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [messages, setMessages] = useState([]);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [receiverUser, setReceiverUser] = useState(null);
    const [messageContent, setMessageContent] = useState('');

    useEffect(() => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            navigate('/auth');
            return;
        }

        const user = JSON.parse(localStorage.getItem('currentUser'));
        setCurrentUser(user);

        const fetchUserInfo = async () => {
            const baseURL = 'http://localhost:8000';
            try {
                const response = await axios.get(`${baseURL}/users/info/${id}`, {
                    headers: {
                        Authorization: `Token ${authToken}`
                    }
                });
                setUserInfo(response.data);
                localStorage.setItem('receiver', JSON.stringify(response.data));
                setReceiverUser(response.data);
            } catch (error) {
                setError(error.response?.data?.detail || 'Ошибка при загрузке информации о пользователе');
            } finally {
                setLoading(false);
            }
        };

        fetchUserInfo();
    }, [id, navigate]); // Зависимости только от id и navigate

    useEffect(() => {
        // Обработчик сообщений
        if (ws) {
            ws.onmessage = (event) => {
                const incomingMessage = JSON.parse(event.data);
                if (incomingMessage.receiver_id === currentUser.id || incomingMessage.sender_id === currentUser.id) {
                    setMessages(prevMessages => [...prevMessages, incomingMessage]); // Добавляем новое сообщение в состояние
                }
            };
        }

        return () => {
            if (ws) {
                ws.onmessage = null; // Очистка обработчика сообщений при размонтировании
            }
        };
    }, [ws, currentUser]); // Зависимости от ws и currentUser

    const handleBackClick = () => {
        navigate('/users');
    };

    const handleLoadMessages = async () => {
        const baseURL = 'http://localhost:8000';
        setLoadingMessages(true);

        try {
            const response = await axios.get(`${baseURL}/messages/${id}`, {
                headers: {
                    Authorization: `Token ${localStorage.getItem('authToken')}`
                }
            });
            setMessages(response.data);
        } catch (error) {
            setError(error.response?.data?.detail || 'Ошибка при загрузке истории сообщений');
        } finally {
            setLoadingMessages(false);
        }
    };

    const handleSendMessage = () => {
        if (ws && ws.readyState === WebSocket.OPEN && messageContent) {
            const message = {
                receiver_id: id,
                content: messageContent,
            };
            ws.send(JSON.stringify(message)); // Отправка сообщения через WebSocket
            setMessageContent(''); // Очистка поля ввода сообщения после отправки
        } else if (ws.readyState !== WebSocket.OPEN) {
            setError('Соединение WebSocket закрыто. Попробуйте снова позже.');
        } else {
            setError('Сообщение не может быть пустым.');
        }
    };

    if (loading) {
        return <p>Загрузка информации о пользователе...</p>;
    }

    if (error) {
        return <p>{error}</p>;
    }

    return (
        <div style={{ padding: '20px' }}>
            <h2>Информация о пользователе</h2>
            {userInfo ? (
                <div>
                    <p>Имя пользователя: {userInfo.username}</p>
                </div>
            ) : (
                <p>Информация о пользователе недоступна.</p>
            )}
            <div style={{ marginTop: '20px' }}>
                <textarea
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    placeholder="Введите сообщение"
                    rows="4"
                    style={{ width: '100%' }}
                />
                <button onClick={handleSendMessage} style={{ marginTop: '10px' }}>
                    Отправить сообщение
                </button>
            </div>
            <button onClick={handleBackClick} style={{ marginTop: '20px' }}>
                Назад к списку пользователей
            </button>
            <button onClick={handleLoadMessages} style={{ marginTop: '20px' }}>
                Загрузить историю сообщений
            </button>

            {loadingMessages && <p>Загрузка истории сообщений...</p>}
            {messages.length > 0 && (
                <div>
                    <h3>История сообщений:</h3>
                    <ul>
                        {messages.slice().reverse().map((message, index) => (
                            <li key={index}>
                                <p><strong>От:</strong> {message.sender_id === currentUser.id ? currentUser.username : receiverUser ? receiverUser.username : message.sender_id}</p>
                                <p><strong>Кому:</strong> {message.receiver_id === currentUser.id ? currentUser.username : receiverUser ? receiverUser.username : message.receiver_id}</p>
                                <p><strong>Сообщение:</strong> {message.content}</p>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default UserInfo;
