import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import AdminLogin from './components/Admin/AdminLogin';
import AdminDashboard from './components/Admin/AdminDashboard';
import ResultsManager from './components/Admin/ResultsManager';
import StudentLogin from './components/Student/StudentLogin';
import StudentRegister from './components/Student/StudentRegister';
import StudentDashboard from './components/Student/StudentDashboard';
import ExamInterface from './components/Student/ExamInterface';
import ProtectedRoute from './components/Common/ProtectedRoute';
import LandingPage from './components/Common/LandingPage';

// Add this new PageWrapper component
const PageWrapper = ({ children }) => {
  const location = useLocation();
  
  useEffect(() => {
    // Disable browser navigation buttons and keyboard shortcuts
    const disableNavigation = () => {
      window.history.pushState(null, null, location.href);
      window.history.go(1);
    };

    // Handle all types of keyboard navigation attempts
    const disableKeyboardNav = (e) => {
      // Block Alt+Left, Alt+Right, Backspace (except in input/textarea)
      if (
        (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) ||
        (e.key === 'Backspace' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') ||
        // Block browser-specific shortcuts
        (e.ctrlKey && e.key === '[') || // Chrome back
        (e.ctrlKey && e.key === ']') || // Chrome forward
        (e.metaKey && e.key === '[') || // Safari back
        (e.metaKey && e.key === ']') || // Safari forward
        (e.altKey && e.key === 'Left') || // IE/Edge back
        (e.altKey && e.key === 'Right')   // IE/Edge forward
      ) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    // Push initial state and disable navigation
    window.history.pushState(null, null, location.href);

    // Add multiple event listeners for comprehensive coverage
    window.addEventListener('popstate', disableNavigation);
    window.addEventListener('hashchange', disableNavigation);
    window.addEventListener('keydown', disableKeyboardNav, true);
    
    // Handle mouse buttons (mouse 4/5 for navigation)
    window.addEventListener('mouseup', (e) => {
      if (e.button === 3 || e.button === 4) {
        e.preventDefault();
        return false;
      }
    });

    // Clear existing page data
    window.scrollTo(0, 0);
    document.title = 'MCQ Exam System';

    // Cleanup function
    return () => {
      window.removeEventListener('popstate', disableNavigation);
      window.removeEventListener('hashchange', disableNavigation);
      window.removeEventListener('keydown', disableKeyboardNav, true);
    };
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router basename="/">
        <PageWrapper>
          <Routes>
            {/* Root Route */}
            <Route path="/" element={<LandingPage />} />
            
            {/* Admin Routes */}
            <Route path="/admin">
              <Route path="login" element={<AdminLogin key="admin-login" />} />
              <Route path="dashboard" element={
                <ProtectedRoute role="admin">
                  <AdminDashboard key="admin-dashboard" />
                </ProtectedRoute>
              } />
              <Route 
                path="results" 
                element={
                  <ProtectedRoute role="admin">
                    <ResultsManager />
                  </ProtectedRoute>
                } 
              />
            </Route>
            
            {/* Student Routes */}
            <Route path="/student">
              <Route path="login" element={<StudentLogin key="student-login" />} />
              <Route path="register" element={<StudentRegister key="student-register" />} />
              <Route path="dashboard" element={
                <ProtectedRoute role="student">
                  <StudentDashboard key="student-dashboard" />
                </ProtectedRoute>
              } />
              <Route path="exam" element={
                <ProtectedRoute role="student">
                  <ExamInterface key="exam-interface" />
                </ProtectedRoute>
              } />
              <Route path="exam/:branch/:year/:semester/:subject" element={
                <ProtectedRoute role="student">
                  <ExamInterface key={location.pathname} />
                </ProtectedRoute>
              } />
            </Route>
            
            {/* Redirect unknown routes */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </PageWrapper>
      </Router>
    </AuthProvider>
  );
}

export default App;