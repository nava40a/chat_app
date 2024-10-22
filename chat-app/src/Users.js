import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Users = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [userStatuses, setUserStatuses] = useState({}); // Состояние для хранения статусов пользователей
    const navigate = useNavigate();
    const wsRef = useRef(null); // Хук для хранения ссылки на WebSocket

    useEffect(() => {
        // Проверка наличия токена в локальном хранилище
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            navigate('/auth'); // Перенаправление на страницу авторизации
            return;
        }

        const fetchUsers = async () => {
            const baseURL = 'http://localhost:8000';
            try {
                const response = await axios.get(`${baseURL}/users`, {
                    headers: {
                        Authorization: `Token ${authToken}`
                    }
                });
                setUsers(response.data); // Предполагается, что ответ - массив пользователей

                // Инициализация статусов всех пользователей как оффлайн
                const initialStatuses = {};
                response.data.forEach(user => {
                    initialStatuses[user.id] = 'offline'; // Устанавливаем статус по умолчанию
                });
                setUserStatuses(initialStatuses);
            } catch (error) {
                setError(error.response?.data?.detail || 'Ошибка при загрузке пользователей');
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();

        // Подключение к WebSocket
        const user = JSON.parse(localStorage.getItem('currentUser'));
        const ws = new WebSocket(`ws://localhost:8000/ws/${user.id}`);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log('WebSocket connection established');
            // Отправляем статус при открытии соединения
            ws.send(JSON.stringify({ type: 'status_update', user_id: user.id, status: 'online' }));
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log('Received WebSocket message:', data);

            if (data.type === 'status_update') {
                // Обновляем статус пользователя
                setUserStatuses((prev) => ({
                    ...prev,
                    [data.user_id]: data.status, // Обновляем статус пользователя
                }));
            }
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        ws.onclose = () => {
            console.log('WebSocket connection closed');
        };

        // Закрытие WebSocket при размонтировании компонента
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [navigate]);

    const handleUserClick = (userId) => {
        navigate(`/users/info/${userId}`); // Переход на страницу с информацией о пользователе
    };

    if (loading) {
        return <p>Загрузка пользователей...</p>;
    }

    if (error) {
        return <p>{error}</p>;
    }

    // Получаем текущего пользователя
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));

    return (
        <div>
            <h2>Список пользователей</h2>
            <ul>
                {users
                    .filter(user => user.id !== currentUser.id) // Фильтруем текущего пользователя
                    .map((user) => (
                        <li key={user.id} onClick={() => handleUserClick(user.id)} style={{ cursor: 'pointer' }}>
                            {user.username} 
                            {userStatuses[user.id] === 'online' ? ' - Онлайн' : ' - Офлайн'} {/* Отображаем статус */}
                        </li>
                    ))}
            </ul>
        </div>
    );
};

export default Users;
