import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import QuestionManager from './QuestionManager';
import ResultsManager from './ResultsManager';
import ExamStatistics from './ExamStatistics';
import PasswordManager from './PasswordManager';
import ExamReattemptManager from './ExamReattemptManager'; // Add this import
import { 
  Settings, 
  FileText, 
  Download, 
  LogOut, 
  Users,
  Menu,
  X,
  TrendingUp,
  Lock,
  RefreshCw  // Add this icon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import socketService from '../../services/socketService';

const BREAKPOINTS = {
  xs: '480px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px'
};

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('questions');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();

  // Add error state
  const [error, setError] = useState(null);

  useEffect(() => {
    socketService.connect();
    return () => socketService.disconnect();
  }, []);

  const handleLogout = () => {
    logout();
  };

  const tabs = [
    { id: 'questions', label: 'Question Management', icon: FileText },
    { id: 'results', label: 'Results & Reports', icon: Download },
    { id: 'statistics', label: 'Statistics', icon: TrendingUp },
    { id: 'passwords', label: 'Password Manager', icon: Lock },
    { id: 'reattempt', label: 'Reattempt Manager', icon: RefreshCw } // Add this tab
  ];

  // Add error handler
  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <h1 className="text-xl font-bold text-red-400">Error</h1>
        <p className="mt-2">{error.message}</p>
      </div>
    );
  }

  const pageVariants = {
    initial: {
      opacity: 0,
      y: 20
    },
    in: {
      opacity: 1,
      y: 0
    },
    out: {
      opacity: 0,
      y: -20
    }
  };

  const pageTransition = {
    type: "tween",
    ease: "easeInOut",
    duration: 0.3
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header - Improved responsiveness */}
      <header className="bg-gray-800 shadow-md border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex justify-between items-center h-14 sm:h-16">
            {/* Logo and Title */}
            <div className="flex items-center">
              <Settings className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-blue-400 mr-2" />
              <h1 className="text-base sm:text-lg lg:text-2xl font-bold text-gray-100 truncate">
                Admin Dashboard
              </h1>
            </div>
            
            {/* Mobile menu button - Better touch target */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-expanded={isMobileMenuOpen}
            >
              <span className="sr-only">Open menu</span>
              {isMobileMenuOpen ? (
                <X className="h-6 w-6 text-gray-300" />
              ) : (
                <Menu className="h-6 w-6 text-gray-300" />
              )}
            </button>

            {/* Desktop navigation */}
            <div className="hidden lg:flex items-center space-x-4">
              <div className="flex items-center text-sm sm:text-base text-gray-300">
                <Users className="h-5 w-5 mr-2" />
                <span className="hidden sm:inline">Welcome,</span> {user?.username}
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                <LogOut className="h-5 w-5 mr-2" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu - With navigation components */}
        <div
          className={`${
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:hidden fixed inset-y-0 left-0 w-72 bg-gray-800 transform transition-transform duration-200 ease-in-out z-50 overflow-y-auto`}
        >
          <div className="p-4 space-y-4">
            {/* User info */}
            <div className="flex items-center justify-between border-b border-gray-700 pb-4">
              <div className="flex items-center text-gray-300">
                <Users className="h-5 w-5 mr-2" />
                <span>Welcome, {user?.username}</span>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 hover:bg-gray-700 rounded-lg"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            {/* Navigation Links */}
            <nav className="space-y-2">
              {tabs.map((tab) => (
                <motion.button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg transition-all ${
                    activeTab === tab.id
                      ? 'bg-blue-500/10 text-blue-400'
                      : 'text-gray-300 hover:bg-gray-700/50'
                  }`}
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ backgroundColor: 'rgba(55, 65, 81, 0.5)' }}
                >
                  <tab.icon className="h-5 w-5 mr-3" />
                  <span>{tab.label}</span>
                </motion.button>
              ))}
            </nav>

            {/* Logout button */}
            <div className="pt-4 mt-4 border-t border-gray-700">
              <button
                onClick={handleLogout}
                className="flex w-full items-center px-4 py-3 text-sm font-medium text-red-400 hover:bg-gray-700 rounded-lg"
              >
                <LogOut className="h-5 w-5 mr-3" />
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Add overlay for mobile menu */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/50 lg:hidden z-40"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </header>

      {/* Navigation Tabs - Hide on mobile */}
      <div className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700/50 sticky top-14 sm:top-16 z-40 hidden lg:block">
        <div className="max-w-7xl mx-auto">
          <nav className="overflow-x-auto scrollbar-hide">
            <div className="flex min-w-max px-3 sm:px-4 lg:px-6 space-x-4">
              {tabs.map((tab) => (
                <TabButton
                  key={tab.id}
                  tab={tab}
                  isActive={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id)}
                />
              ))}
            </div>
          </nav>
        </div>
      </div>

      {/* Main content - Improved padding and max-width handling */}
      <main className="flex-1 w-full">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
              className="w-full"
            >
              {activeTab === 'questions' && <QuestionManager />}
              {activeTab === 'results' && <ResultsManager />}
              {activeTab === 'statistics' && <ExamStatistics />}
              {activeTab === 'passwords' && <PasswordManager />}
              {activeTab === 'reattempt' && <ExamReattemptManager />} {/* Add this line */}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

// Update the TabButton component
const TabButton = ({ tab, isActive, onClick }) => {
  const Icon = tab.icon;
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      whileHover={{ y: -2 }}
      className={`relative flex items-center py-4 px-4 text-sm font-medium transition-all duration-200 rounded-lg 
        ${
          isActive
            ? 'text-blue-400 bg-blue-500/10'
            : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/30'
        }
      `}
    >
      <Icon className="h-4 w-4 sm:h-5 sm:w-5 mr-2 flex-shrink-0" />
      <span className="hidden sm:inline">{tab.label}</span>
      <span className="sm:hidden">{tab.id.charAt(0).toUpperCase() + tab.id.slice(1, 3)}</span>
      {isActive && (
        <motion.div
          layoutId="activeTab"
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400 rounded-full"
          initial={false}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      )}
    </motion.button>
  );
};

export default AdminDashboard;