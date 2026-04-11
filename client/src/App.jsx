import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/user/LoginPage';
import ExamListPage from './pages/user/ExamListPage';
import ExamPage from './pages/user/ExamPage';
import ResultPage from './pages/user/ResultPage';
import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminDashboard from './pages/admin/AdminDashboard';

function PrivateAdminRoute({ children }) {
  const isAdmin = sessionStorage.getItem('adminAuth') === 'true';
  return isAdmin ? children : <Navigate to="/admin" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* User routes */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/exams" element={<ExamListPage />} />
        <Route path="/exam/:id" element={<ExamPage />} />
        <Route path="/result" element={<ResultPage />} />

        {/* Admin routes */}
        <Route path="/admin" element={<AdminLoginPage />} />
        <Route
          path="/admin/dashboard"
          element={
            <PrivateAdminRoute>
              <AdminDashboard />
            </PrivateAdminRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
