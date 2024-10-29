import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { WebSocketContext } from './WebSocketProvider';

const Auth = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [telegramUsername, setTelegramUsername] = useState('');
    const [isRegistering, setIsRegistering] = useState(true);
    const [message, setMessage] = useState('');
    const navigate = useNavigate();
    const { setWs } = useContext(WebSocketContext);

    useEffect(() => {
        if (!localStorage.getItem('currentUser')) {
            localStorage.setItem('currentUser', JSON.stringify({ id: null, username: '', auth_token: '' }));
        }
    }, []);

    const handleAuthResponse = (data) => {
        const userData = { id: data.id, username: data.username, auth_token: data.auth_token };
        localStorage.setItem('authToken', userData.auth_token);
        localStorage.setItem('currentUser', JSON.stringify(userData));

        navigate('/users');

        const socket = new WebSocket(`ws://localhost:8000/api/ws/${userData.id}`);
        socket.onopen = () => {
            console.log('WebSocket соединение установлено');
            setWs(socket);
        };
        socket.onerror = (error) => console.error('WebSocket ошибка:', error);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const endpoint = isRegistering ? '/registration' : '/login';
        try {
            const payload = {
                username,
                password,
                ...(isRegistering && { tg_username: telegramUsername })
            };
    
            const { data } = await axios.post(`http://localhost:8000/api${endpoint}`, payload);
            handleAuthResponse(data);
        } catch (error) {
            if (error.response?.status === 400 && error.response.data?.detail === 'Telegram username уже используется.') {
                setMessage('Этот Telegram username уже занят. Пожалуйста, укажите другой.');
            } else {
                setMessage(error.response?.data?.detail || 'Ошибка авторизации');
            }
        }
    };
    

    return (
        <div>
            <h2>{isRegistering ? 'Регистрация' : 'Вход'}</h2>
            <form onSubmit={handleSubmit}>
                <input type="text" placeholder="Имя пользователя" value={username} onChange={(e) => setUsername(e.target.value)} required />
                <input type="password" placeholder="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} required />
                {isRegistering && (
                    <input
                        type="text"
                        placeholder="Ник в Telegram"
                        value={telegramUsername}
                        onChange={(e) => setTelegramUsername(e.target.value)}
                        required
                    />
                )}
                <button type="submit">{isRegistering ? 'Зарегистрироваться' : 'Войти'}</button>
            </form>
            <p>{message}</p>
            <button onClick={() => setIsRegistering(!isRegistering)}>
                {isRegistering ? 'Уже зарегистрированы? Войти' : 'Еще не зарегистрированы? Зарегистрироваться'}
            </button>
            {isRegistering && (
                <div style={{ marginTop: '20px' }}>
                    <p>Еще не подписаны на нашего телеграм бота? Подпишитесь, чтобы получать уведомления!</p>
                    <a href="https://t.me/YourNotifierBot" target="_blank" rel="noopener noreferrer">
                        <button>Подписаться на бота</button>
                    </a>
                </div>
            )}
        </div>
    );
};

export default Auth;
