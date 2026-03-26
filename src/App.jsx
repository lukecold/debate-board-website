import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ApolloProvider } from '@apollo/client';
import { client } from './lib/apollo';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import Home from './pages/Home';
import DebateBoardPage from './pages/DebateBoardPage';
import LoginPage from './pages/LoginPage';
import ActivatePage from './pages/ActivatePage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import UserCenterPage from './pages/UserCenterPage';
import MeetingRoomPage from './pages/MeetingRoomPage';
import Header from './components/Header';
import './App.css';

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return (
    <>
      <Header />
      {children}
    </>
  );
}

function PublicRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function App() {
  return (
    <ApolloProvider client={client}>
      <LanguageProvider>
      <AuthProvider>
        <Router>
          <div className="app">
            <Routes>
              <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
              {/* Email-link pages — always accessible */}
              <Route path="/activate" element={<ActivatePage />} />
              <Route path="/change-password" element={<ChangePasswordPage />} />
              {/* Protected pages */}
              <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
              <Route path="/board/:boardId" element={<ProtectedRoute><DebateBoardPage /></ProtectedRoute>} />
              <Route path="/user/:userID" element={<ProtectedRoute><UserCenterPage /></ProtectedRoute>} />
              <Route path="/meeting/:roomId" element={<ProtectedRoute><MeetingRoomPage /></ProtectedRoute>} />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
      </LanguageProvider>
    </ApolloProvider>
  );
}

export default App;
