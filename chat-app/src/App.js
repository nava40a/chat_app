import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import WebSocketProvider from './WebSocketProvider';
import Users from './Users';
import UserInfo from './UserInfo';
import Auth from './Auth';
import Home from './Home';


const App = () => {
    return (
        <WebSocketProvider>
            <Router>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/users" element={<Users />} />
                    <Route path="/users/info/:id" element={<UserInfo />} />
                </Routes>
            </Router>
        </WebSocketProvider>
    );
};

export default App;
