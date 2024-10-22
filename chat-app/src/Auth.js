import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Auth = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [telegramUsername, setTelegramUsername] = useState('');
    const [isRegistering, setIsRegistering] = useState(true);
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    const handleAuthResponse = (response) => {
        setMessage(response.data.msg || response.data.message);
        
        // Сохраняем токен и информацию о текущем пользователе в локальное хранилище
        localStorage.setItem('authToken', response.data.auth_token);
        localStorage.setItem('currentUser', JSON.stringify(response.data)); // Сохраняем текущего пользователя
        
        // Перенаправление на главную страницу
        navigate('/users'); // Перенаправляем на Home после успешного входа/регистрации
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
    
        const baseURL = 'http://localhost:8000';
        const endpoint = isRegistering ? `${baseURL}/register` : `${baseURL}/login`;
    
        try {
            const response = await axios.post(endpoint, {
                username,
                password,
                telegram_username: isRegistering ? telegramUsername : undefined
            });

            if (response.status === 200) {
                handleAuthResponse(response);
            }
        } catch (error) {
            setMessage(error.response?.data?.detail || 'Ошибка авторизации');
        }
    };

    return (
        <div>
            <h2>{isRegistering ? 'Регистрация' : 'Вход'}</h2>
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    placeholder="Имя пользователя"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                />
                <input
                    type="password"
                    placeholder="Пароль"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
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
        </div>
    );
};

export default Auth;