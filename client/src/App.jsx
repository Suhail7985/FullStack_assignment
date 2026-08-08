import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ToGivePage from './pages/ToGivePage';
import GiveFeedbackPage from './pages/GiveFeedbackPage';
import ReceivedFeedbackPage from './pages/ReceivedFeedbackPage';
import PerformancePage from './pages/PerformancePage';
import HrDashboardPage from './pages/HrDashboardPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/feedback/to-give" element={<ToGivePage />} />
        <Route path="/feedback/give/:employeeId" element={<GiveFeedbackPage />} />
        <Route path="/feedback/received" element={<ReceivedFeedbackPage />} />
        <Route path="/performance" element={<PerformancePage />} />
      </Route>
      <Route element={<ProtectedRoute roles={['hr', 'admin']} />}>
        <Route path="/hr" element={<HrDashboardPage />} />
      </Route>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
