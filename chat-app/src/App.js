import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { WebSocketProvider } from './WebSocketProvider'; // Импортируйте созданный компонент
import Users from './Users'; // Ваш компонент со списком пользователей
import UserInfo from './UserInfo'; // Ваш компонент информации о пользователе
import Auth from './Auth';

const App = () => {
    return (
        <WebSocketProvider>
            <Router>
                <Routes>
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/users" element={<Users />} />
                    <Route path="/users/info/:id" element={<UserInfo />} />
                    {/* Другие маршруты */}
                </Routes>
            </Router>
        </WebSocketProvider>
    );
};

export default App;
