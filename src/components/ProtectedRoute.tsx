import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AppLoader } from './AppLoader';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute: React.FC = () => {
  const { firebaseUser, loading } = useAuth();

  if (loading) return <AppLoader />;
  if (!firebaseUser) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
};

export const AdminRoute: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) return <AppLoader />; // null ki jagah loader
  if (!user?.isAdmin) {
    return <Navigate to="/download" replace />;
  }
  return <Outlet />;
};

export const PublicRoute: React.FC = () => {
  const { firebaseUser, loading } = useAuth();

  if (loading) return <AppLoader />; // null ki jagah loader — blank flash fix
  if (firebaseUser) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
};
