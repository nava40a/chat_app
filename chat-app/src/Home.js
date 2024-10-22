import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Home = () => {
    const navigate = useNavigate();

    useEffect(() => {
        // Проверка наличия токена в локальном хранилище
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            navigate('/auth'); // Перенаправление на страницу авторизации, если токена нет
        }
    }, [navigate]);

    const handleGetUsers = () => {
        navigate('/users'); // Перенаправляем на страницу со списком пользователей
    };

    return (
        <div>
            <h2>Добро пожаловать на главную страницу</h2>
            <button onClick={handleGetUsers}>Получить пользователей</button>
        </div>
    );
};

export default Home;