import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Home from './pages/Home';
import MapeadoRestriccion from './pages/MapeadoRestriccion';
import MapeadoEstacionamiento from './pages/MapeadoEstacionamiento';
import Usuarios from './pages/Usuarios';
import Estadisticas from './pages/Estadisticas' 

const AppRouter = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(() => {
        return localStorage.getItem("isAuthenticated") === "true";
    });

    const handleLogin = () => {
        setIsAuthenticated(true);
        localStorage.setItem("isAuthenticated", "true");
    };

    const handleLogout = () => {
        setIsAuthenticated(false);
        localStorage.removeItem("isAuthenticated");
    };

    return (
        <Router>
            <Routes>
                <Route path="/" element={<Login onLogin={handleLogin} />} />
                <Route
                    path="/Home"
                    element={
                        isAuthenticated ? (
                            <Home onLogout={handleLogout} />
                        ) : (
                            <Navigate to="/" />
                        )
                    }
                />
                <Route
                    path="/MapeadoRestriccion"
                    element={
                        isAuthenticated ? (
                            <MapeadoRestriccion onLogout={handleLogout}/>
                        ) : (
                            <Navigate to="/" />
                        )
                    }
                />
                <Route
                    path="/MapeadoEstacionamiento"
                    element={
                        isAuthenticated ? (
                            <MapeadoEstacionamiento onLogout={handleLogout}/>
                        ) : (
                            <Navigate to="/" />
                        )
                    }
                />
                <Route
                    path="/Usuarios"
                    element={
                        isAuthenticated ? (
                            <Usuarios onLogout={handleLogout}/>
                        ) : (
                            <Navigate to="/" />
                        )
                    }
                />
                <Route
                    path="/Estadisticas"
                    element={
                        isAuthenticated ? (
                            <Estadisticas onLogout={handleLogout}/>
                        ) : (
                            <Navigate to="/" />
                        )
                    }
                />
            </Routes>
        </Router>
    );
};

export default AppRouter;
