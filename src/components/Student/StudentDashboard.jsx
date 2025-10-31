import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { BookOpen, User, LogOut, Play, Info, CheckCircle, Award } from 'lucide-react';
import axios from 'axios';
import StudentResults from './StudentResults';
import socketService from '../../services/socketService';

const StudentDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [availableExams, setAvailableExams] = useState([]);
  const [completedExams, setCompletedExams] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [completedLoading, setCompletedLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('exams');
  const [realTimeExamStatus, setRealTimeExamStatus] = useState({});

  useEffect(() => {
    if (!user || !user.branch) {
      setLoading(false);
      setCompletedLoading(false);
      return;
    }

    const loadData = async () => {
      setLoading(true);
      setCompletedLoading(true);
      try {
        // First fetch completed exams
        const completedResponse = await axios.get(
          `http://localhost:5000/api/student/completed-exams`,
          {
            params: {
              rollNumber: user.rollNumber
            }
          }
        );
        
        const completed = new Set(completedResponse.data.map(exam => 
          `${exam.branch}-${exam.year}-${exam.semester}-${exam.subject}`
        ));
        setCompletedExams(completed);
        setCompletedLoading(false);

        // Then fetch available exams
        const availableResponse = await axios.get(
          'http://localhost:5000/api/student/available-exams',
          {
            params: { 
              branch: user.branch,
              year: user?.filters?.year || '',
              semester: user?.filters?.semester || ''
            }
          }
        );

        const examsWithConfig = availableResponse.data.map(exam => {
          const examKey = `${exam.branch}-${exam.year}-${exam.semester}-${exam.subject}`;
          return {
            ...exam,
            isCompleted: completed.has(examKey),
            examConfig: {
              numberOfQuestions: exam.examConfig?.numberOfQuestions || 0,
              timeLimit: exam.examConfig?.timeLimit || 0,
              displayTime: exam.examConfig?.timeLimit || 0
            }
          };
        });

        setAvailableExams(examsWithConfig);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]); // Add user as dependency

  useEffect(() => {
    socketService.connect();

    const handleExamStatus = (data) => {
      setRealTimeExamStatus(prev => ({
        ...prev,
        [data.examId]: data.status
      }));
    };

    socketService.subscribeToExamStatus(handleExamStatus);

    return () => {
      socketService.unsubscribeFromExamStatus(handleExamStatus);
      socketService.disconnect();
    };
  }, []);

  const handleStartExam = (examConfig) => {
    navigate(`/student/exam/${examConfig.branch}/${examConfig.year}/${examConfig.semester}/${examConfig.subject}`);
  };

  const handleLogout = () => {
    logout();
    // Open new tab with login page and close current tab
    window.open('/student/login', '_blank');
    window.close();
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header - Made more responsive */}
      <header className="bg-gray-800 shadow-md border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center">
              <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 text-green-400 mr-2 sm:mr-3" />
              <h1 className="text-xl sm:text-2xl font-bold text-gray-100">Student Dashboard</h1>
            </div>
            
            {/* Responsive user menu */}
            <div className="flex items-center">
              <div className="relative group">
                <button className="flex items-center text-xs sm:text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-colors">
                  <User className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="hidden xs:inline">{user?.name}</span>
                  <span className="xs:hidden">{user?.rollNumber}</span>
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-md shadow-lg py-1 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Responsive Tabs */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex space-x-4 sm:space-x-8">
            <button
              onClick={() => setActiveTab('exams')}
              className={`py-4 px-1 relative ${
                activeTab === 'exams'
                  ? 'text-green-400 border-b-2 border-green-400'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <BookOpen className="h-5 w-5" />
                <span className="font-medium">Exams</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('results')}
              className={`py-4 px-1 relative ${
                activeTab === 'results'
                  ? 'text-green-400 border-b-2 border-green-400'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Award className="h-5 w-5" />
                <span className="font-medium">Results</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Responsive Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
        {activeTab === 'exams' ? (
          <div className="bg-gray-800 rounded-lg shadow-md p-4 sm:p-6 lg:p-8">
            {/* Welcome Section - More responsive */}
            <div className="text-center mb-6 sm:mb-8">
              <BookOpen className="w-12 h-12 sm:w-16 sm:h-16 text-green-400 mx-auto mb-3 sm:mb-4" />
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-100 mb-2">
                Welcome to Your Exam Portal
              </h2>
              <p className="text-base sm:text-lg text-gray-400">
                You are logged in as <span className="font-semibold text-green-400">{user?.name}</span>
              </p>
            </div>

            {/* Student Info Card - Responsive grid */}
            <div className="bg-gray-800 rounded-lg p-4 sm:p-6 mb-6 sm:mb-8">
              <h3 className="text-lg font-semibold text-gray-100 mb-4">Your Information</h3>
              <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                {/* Info cards with responsive spacing */}
                <div className="bg-gray-700 p-3 sm:p-4 rounded-lg shadow-md">
                  <p className="text-xs sm:text-sm text-gray-400">Name</p>
                  <p className="text-sm sm:text-base font-semibold text-gray-100">{user?.name}</p>
                </div>
                <div className="bg-gray-700 p-3 sm:p-4 rounded-lg shadow-md">
                  <p className="text-xs sm:text-sm text-gray-400">Roll Number</p>
                  <p className="text-sm sm:text-base font-semibold text-gray-100">{user?.rollNumber}</p>
                </div>
                <div className="bg-gray-700 p-3 sm:p-4 rounded-lg shadow-md">
                  <p className="text-xs sm:text-sm text-gray-400">Branch</p>
                  <p className="text-sm sm:text-base font-semibold text-gray-100">{user?.branch}</p>
                </div>
                <div className="bg-gray-700 p-3 sm:p-4 rounded-lg shadow-md">
                  <p className="text-xs sm:text-sm text-gray-400">Section</p>
                  <p className="text-sm sm:text-base font-semibold text-gray-100">{user?.section}</p>
                </div>
                <div className="bg-gray-700 p-3 sm:p-4 rounded-lg shadow-md">
                  <p className="text-xs sm:text-sm text-gray-400">Year</p>
                  <p className="text-sm sm:text-base font-semibold text-gray-100">{user?.filters?.year || 'Not Set'}</p>
                </div>
                <div className="bg-gray-700 p-3 sm:p-4 rounded-lg shadow-md">
                  <p className="text-xs sm:text-sm text-gray-400">Semester</p>
                  <p className="text-sm sm:text-base font-semibold text-gray-100">{user?.filters?.semester || 'Not Set'}</p>
                </div>
              </div>
            </div>

            {/* Available Exams - Responsive list */}
            {loading ? (
              <div className="text-center py-6 sm:py-8">
                <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-green-500 mx-auto"></div>
                <p className="mt-4 text-gray-400">Loading available exams...</p>
              </div>
            ) : (
              <div className="mb-6 sm:mb-8">
                <div className="bg-gray-800 rounded-lg border divide-y divide-gray-700">
                  {availableExams.length > 0 ? (
                    availableExams.map((exam) => {
                      const examId = `${exam.branch}_${exam.year}_${exam.semester}_${exam.subject}`;
                      const status = realTimeExamStatus[examId];
                      
                      return (
                        <div
                          key={exam._id}
                          className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 gap-3 sm:gap-0"
                        >
                          <div className="flex-1 w-full sm:w-auto">
                            <div className="flex items-start sm:items-center space-x-3 sm:space-x-4">
                              <BookOpen className={`h-6 w-6 sm:h-8 sm:w-8 flex-shrink-0 ${
                                exam.isCompleted ? 'text-gray-400' : 'text-green-400'
                              }`} />
                              <div className="min-w-0 flex-1">
                                <h4 className="text-base sm:text-lg font-semibold truncate text-white">
                                  {exam.subject}
                                </h4>
                                <div className="mt-1 flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm">
                                  <span className="font-medium text-white">Year: {exam.year}</span>
                                  <span className="hidden sm:inline text-gray-400">•</span>
                                  <span className="font-medium text-white">Sem: {exam.semester}</span>
                                  <span className="hidden sm:inline text-gray-400">•</span>
                                  <span className="font-medium text-white">{exam.examConfig.numberOfQuestions} Q</span>
                                  <span className="hidden sm:inline text-gray-400">•</span>
                                  <span className="font-medium text-white">{exam.examConfig?.timeLimit || 0} Min</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          {/* Action buttons with responsive sizing */}
                          <div className="w-full sm:w-auto">
                            {exam.isCompleted ? (
                              <div className="flex items-center justify-center w-full sm:w-auto px-3 py-1.5 sm:px-4 sm:py-2 bg-gray-600 text-gray-300 rounded-md">
                                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                                <span className="font-medium">Completed</span>
                              </div>
                            ) : (
                              <button 
                                onClick={() => handleStartExam(exam)}
                                className="w-full sm:w-auto flex items-center justify-center px-3 py-1.5 sm:px-4 sm:py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors font-semibold"
                              >
                                <Play className="w-4 h-4 mr-2" />
                                Start Exam
                              </button>
                            )}
                          </div>
                          {status && (
                            <div className="mt-2">
                              <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full">
                                {status.activeStudents} students taking exam
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8">
                      <Info className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-yellow-100 mb-2">No Available Exams</h3>
                      <p className="text-yellow-200">
                        {user?.filters?.year || user?.filters?.semester 
                          ? 'No exams found for the selected filters.'
                          : 'Please log out and log in again with year and semester selections.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Instructions - Responsive spacing */}
            <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4 sm:p-6">
              <div className="flex items-start space-x-3">
                <Info className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400 mt-1" />
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-blue-100 mb-2 sm:mb-3">
                    Exam Instructions
                  </h3>
                  <ul className="space-y-1.5 sm:space-y-2 text-sm sm:text-base text-blue-200">
                    <li>• The exam will be conducted in full-screen mode</li>
                    <li>• Do not switch tabs or windows during the exam</li>
                    <li>• You will receive warnings for any suspicious activity</li>
                    <li>• Each question carries 1 mark</li>
                    <li>• Make sure you have a stable internet connection</li>
                    <li>• Review your answers before final submission</li>
                    <li>• Once submitted, you cannot modify your answers</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <StudentResults />
        )}
      </main>
    </div>
  );
};

export default StudentDashboard;