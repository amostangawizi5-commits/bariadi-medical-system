import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/AdminDashboard';
import SystemHeader from './components/SystemHeader';
import './styles/global.css';

const ProtectedRoute = ({ children }) => {
    const isAuthenticated = Boolean(localStorage.getItem('token'));
    return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const LogoutRoute = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.setItem('logout_success', 'true');
    return <Navigate to="/login" replace />;
};

function App() {
    return (
        <Router>
            <SystemHeader />
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/logout" element={<LogoutRoute />} />
                <Route path="/register" element={<Register />} />
                <Route 
                    path="/admin/*" 
                    element={
                        <ProtectedRoute>
                            <AdminDashboard />
                        </ProtectedRoute>
                    } 
                />
                <Route path="/dashboard" element={<Navigate to="/admin/dashboard" replace />} />
            </Routes>
        </Router>
    );
}

export default App;
