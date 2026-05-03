import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from '@/src/components/layout/Navbar';
import Footer from '@/src/components/layout/Footer';
import HomePage from '@/src/pages/HomePage';
import AdminPage from '@/src/pages/AdminPage';
import LoginPage from '@/src/pages/LoginPage';
import LatestDocumentsPage from '@/src/pages/LatestDocumentsPage';
import DocumentDetailPage from '@/src/pages/DocumentDetailPage';
import OnlineExamPage from '@/src/pages/OnlineExamPage';
import TeacherDashboard from '@/src/pages/TeacherDashboard';
import StudentDashboard from '@/src/pages/StudentDashboard';
import PreviewExamPage from '@/src/pages/PreviewExamPage';
import ExamStatsPage from '@/src/pages/ExamStatsPage';
import { Toaster } from '@/components/ui/sonner';
import { ErrorBoundary } from '@/src/components/common/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <div className="min-h-screen flex flex-col bg-background font-sans antialiased">
          <Navbar />
          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/latest" element={<LatestDocumentsPage />} />
              <Route path="/category/:category" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/thi-online" element={<OnlineExamPage />} />
              <Route path="/thi-online/teacher" element={<TeacherDashboard />} />
              <Route path="/thi-online/student" element={<StudentDashboard />} />
              <Route path="/thi-online/stats/:examId" element={<ExamStatsPage />} />
              <Route path="/preview-exam/:examId" element={<PreviewExamPage />} />
              <Route path="/document/:id" element={<DocumentDetailPage />} />
            </Routes>
          </main>
          <Footer />
          <Toaster position="top-center" />
        </div>
      </Router>
    </ErrorBoundary>
  );
}
