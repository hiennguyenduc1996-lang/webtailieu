import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from '@/src/components/layout/Navbar';
import Footer from '@/src/components/layout/Footer';
import HomePage from '@/src/pages/HomePage';
import AdminPage from '@/src/pages/AdminPage';
import LoginPage from '@/src/pages/LoginPage';
import LatestDocumentsPage from '@/src/pages/LatestDocumentsPage';
import DocumentDetailPage from '@/src/pages/DocumentDetailPage';
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
