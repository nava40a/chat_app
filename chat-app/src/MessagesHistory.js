import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

const MessagesHistory = () => {
    const { receiverId } = useParams();
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [receiverInfo, setReceiverInfo] = useState(null); // Информация о получателе
    const [senderInfo, setSenderInfo] = useState(null); // Информация об отправителе
    const navigate = useNavigate(); // Хук для навигации

    useEffect(() => {
        const fetchMessagesHistory = async () => {
            const baseURL = 'http://localhost:8000';
            try {
                const response = await axios.get(`${baseURL}/messages/${receiverId}`, {
                    headers: {
                        Authorization: `Token ${localStorage.getItem('authToken')}`
                    }
                });
                setMessages(response.data);
                
                // Загружаем информацию о получателе из localStorage
                const receiverData = JSON.parse(localStorage.getItem(`user_${receiverId}`));
                setReceiverInfo(receiverData);

                // Загружаем информацию о текущем пользователе (отправителе)
                const currentUserData = JSON.parse(localStorage.getItem('currentUser'));
                setSenderInfo(currentUserData);
            } catch (error) {
                setError(error.response?.data?.detail || 'Ошибка при загрузке истории сообщений');
            } finally {
                setLoading(false);
            }
        };

        fetchMessagesHistory();
    }, [receiverId]);

    const handleBackToUsers = () => {
        navigate('/users'); // Перенаправление к списку пользователей
    };

    if (loading) {
        return <p>Загрузка истории сообщений...</p>;
    }

    if (error) {
        return <p>{error}</p>;
    }

    return (
        <div>
            <button onClick={handleBackToUsers}>Назад к списку пользователей</button>
            <h2>История сообщений с {receiverInfo ? receiverInfo.username : 'пользователем'}</h2>
            <ul>
                {messages.reverse().map((message, index) => (
                    <li key={index}>
                        <p>
                            <strong>От:</strong> {message.sender_id === senderInfo.id ? 'Вы' : receiverInfo?.username} <strong>Кому:</strong> {message.receiver_id === senderInfo.id ? 'Вы' : receiverInfo?.username}
                        </p>
                        <p><strong>Сообщение:</strong> {message.content}</p>
                        <p><strong>Дата:</strong> {new Date(message.created_at).toLocaleString()}</p>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default MessagesHistory;