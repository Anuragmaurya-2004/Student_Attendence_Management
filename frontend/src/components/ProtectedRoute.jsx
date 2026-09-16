import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  if (user.mustChangePassword && !window.location.pathname.endsWith('/change-password')) {
    return <Navigate to={user.role === 'student' ? '/student/change-password' : '/faculty/change-password'} replace />;
  }
  return children;
}
