import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';

import AdminDashboard from './pages/admin/AdminDashboard';
import AcademicSetup from './pages/admin/AcademicSetup';
import ManageStudents from './pages/admin/ManageStudents';
import ManageFaculty from './pages/admin/ManageFaculty';
import Holidays from './pages/admin/Holidays';
import Defaulters from './pages/admin/Defaulters';
import Rollover from './pages/admin/Rollover';

import FacultySessions from './pages/faculty/FacultySessions';
import SessionDetail from './pages/faculty/SessionDetail';
import FacultyDefaulters from './pages/faculty/FacultyDefaulters';

import StudentAttendance from './pages/student/StudentAttendance';
import ScanQR from './pages/student/ScanQR';
import ChangePassword from './pages/student/ChangePassword';

function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={`/${user.role}`} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<Layout />}>
            <Route path="/" element={<HomeRedirect />} />

            {/* Admin routes */}
            <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/setup" element={<ProtectedRoute roles={['admin']}><AcademicSetup /></ProtectedRoute>} />
            <Route path="/admin/students" element={<ProtectedRoute roles={['admin']}><ManageStudents /></ProtectedRoute>} />
            <Route path="/admin/faculty" element={<ProtectedRoute roles={['admin']}><ManageFaculty /></ProtectedRoute>} />
            <Route path="/admin/holidays" element={<ProtectedRoute roles={['admin']}><Holidays /></ProtectedRoute>} />
            <Route path="/admin/defaulters" element={<ProtectedRoute roles={['admin']}><Defaulters /></ProtectedRoute>} />
            <Route path="/admin/rollover" element={<ProtectedRoute roles={['admin']}><Rollover /></ProtectedRoute>} />

            {/* Faculty routes (admin can access too since admin extends faculty login) */}
            <Route path="/faculty" element={<ProtectedRoute roles={['faculty', 'admin']}><FacultySessions /></ProtectedRoute>} />
            <Route path="/faculty/sessions/:id" element={<ProtectedRoute roles={['faculty', 'admin']}><SessionDetail /></ProtectedRoute>} />
            <Route path="/faculty/defaulters" element={<ProtectedRoute roles={['faculty', 'admin']}><FacultyDefaulters /></ProtectedRoute>} />

            {/* Student routes */}
            <Route path="/student" element={<ProtectedRoute roles={['student']}><StudentAttendance /></ProtectedRoute>} />
            <Route path="/student/change-password" element={<ProtectedRoute roles={['student']}><ChangePassword /></ProtectedRoute>} />
            <Route path="/student/scan" element={<ProtectedRoute roles={['student']}><ScanQR /></ProtectedRoute>} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
