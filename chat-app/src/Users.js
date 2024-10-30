import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { WebSocketContext } from './WebSocketProvider';

const Users = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { ws, setWs } = useContext(WebSocketContext);
    const [userStatuses, setUserStatuses] = useState({});
    const [newMessages, setNewMessages] = useState({});

    useEffect(() => {
        const authToken = localStorage.getItem('authToken');
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        
        if (!authToken) {
            navigate('/auth');
            return;
        }

        const fetchUsers = async () => {
            const baseURL = 'http://localhost:8000/api';
            try {
                const response = await axios.get(`${baseURL}/users`, {
                    headers: {
                        Authorization: `Token ${authToken}`
                    }
                });
                setUsers(response.data);

                const savedStatuses = JSON.parse(localStorage.getItem('userStatuses')) || {};
                const initialStatuses = {};
                response.data.forEach(user => {
                    initialStatuses[user.id] = savedStatuses[user.id] || 'offline';
                });
                setUserStatuses(initialStatuses);
                const savedNewMessages = JSON.parse(localStorage.getItem('newMessages')) || {};
                setNewMessages(savedNewMessages);
            } catch (error) {
                setError(error.response?.data?.detail || 'Ошибка при загрузке пользователей');
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();

        const handleIncomingMessage = (event) => {
            const data = JSON.parse(event.data);
            console.log('Получено сообщение:', data);

            if (data.type === "status_update") {
                const { user_id, status } = data;
                setUserStatuses(prevStatuses => {
                    const updatedStatuses = { ...prevStatuses, [user_id]: status };
                    const filteredStatuses = { ...updatedStatuses };
                    delete filteredStatuses[currentUser.id];
                    localStorage.setItem('userStatuses', JSON.stringify(filteredStatuses));
                    return updatedStatuses;
                });
            } else if (data.content) { 
                const receiverId = data.sender_id;
                const messages = JSON.parse(localStorage.getItem(`messages_${receiverId}`)) || [];
                messages.unshift(data);
                localStorage.setItem(`messages_${receiverId}`, JSON.stringify(messages));

                setNewMessages(prevMessages => {
                    const updatedMessages = { ...prevMessages, [receiverId]: true };
                    localStorage.setItem('newMessages', JSON.stringify(updatedMessages));
                    return updatedMessages;
                });
            }
        };

        if (ws) {
            ws.addEventListener('message', handleIncomingMessage);
        }

        return () => {
            if (ws) {
                ws.removeEventListener('message', handleIncomingMessage);
            }
        };
    }, [navigate, ws]);

    const handleUserClick = (userId) => {
        const selectedUser = users.find(user => user.id === userId);
        if (selectedUser) {
            const receiverData = {
                id: selectedUser.id,
                username: selectedUser.username,
                tg_chat_id: selectedUser.tg_chat_id,
                is_subscribed_to_bot: selectedUser.is_subscribed_to_bot,
            };
            localStorage.setItem('receiver', JSON.stringify(receiverData));
        }

        setNewMessages(prevMessages => {
            const updatedMessages = { ...prevMessages, [userId]: false };
            localStorage.setItem('newMessages', JSON.stringify(updatedMessages));
            return updatedMessages;
        });

        navigate(`/users/info/${userId}`);
    };

    const handleLogout = () => {
        const currentReceiver = JSON.parse(localStorage.getItem('receiver'));
        if (currentReceiver) {
            localStorage.removeItem(`messages_${currentReceiver.id}`);
        }
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('userStatuses');
        localStorage.removeItem('receiver');

        if (ws) {
            ws.close();
            setWs(null);
        }

        navigate('/auth');
    };

    if (loading) {
        return <p>Загрузка пользователей...</p>;
    }

    if (error) {
        return <p>{error}</p>;
    }

    const currentUser = JSON.parse(localStorage.getItem('currentUser'));

    return (
        <div>
            <div style={{ marginTop: '20px' }}>
                <p>Еще не подписаны на нашего телеграм бота? Подпишитесь, чтобы получать уведомления!</p>
                <a href="https://t.me/YourNotifierBot" target="_blank" rel="noopener noreferrer">
                    <button>Подписаться на бота</button>
                </a>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>Список пользователей</h2>
                <button onClick={handleLogout} style={{ marginLeft: '20px' }}>
                    Выйти
                </button>
            </div>
            <ul>
                {users
                    .filter(user => user.id !== currentUser.id)
                    .map((user) => (
                        <li key={user.id} onClick={() => handleUserClick(user.id)} style={{ cursor: 'pointer' }}>
                            {user.username}
                            {userStatuses[user.id] === 'online' && <span> - Онлайн</span>}
                            {newMessages[user.id] && <span style={{ color: 'red', marginLeft: '10px' }}>Новое сообщение</span>}
                        </li>
                    ))}
            </ul>
        </div>
    );
};

export default Users;
