import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom'; // Add useParams here
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  Circle, 
  RotateCcw,
  Send,
  Maximize,
  AlertCircle
} from 'lucide-react';

// Add after imports
const noSelectStyle = "select-none user-select-none";

// Add the style tag for the countdown animation
const styleTag = document.createElement('style');
styleTag.textContent = `
  @keyframes countdown {
    from { width: 100%; }
    to { width: 0%; }
  }
`;
document.head.appendChild(styleTag);

const ExamInterface = () => {
  const { user, logout } = useAuth(); // Add logout to destructuring
  const navigate = useNavigate();
  const { branch, year, semester, subject } = useParams();
  
  // Exam state
  const [questions, setQuestions] = useState([]);
  const [sections, setSections] = useState([]);
  const [examConfig, setExamConfig] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [reviewQuestions, setReviewQuestions] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [warningCount, setWarningCount] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0); // Will be set from examConfig
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedSection, setSelectedSection] = useState(null);
  const [totalQuestions, setTotalQuestions] = useState(0); // Will be set from examConfig
  const [showThankYou, setShowThankYou] = useState(false); // Add this state with other states at the top of ExamInterface component
  const [logoutTime, setLogoutTime] = useState(null); // Add with other state declarations
  const [isFading, setIsFading] = useState(false); // Add with other state declarations

  // Load exam data
  useEffect(() => {
    if (user && branch && year && semester && subject) {
      loadExamData();
    }
  }, [user, branch, year, semester, subject]);

  // Fullscreen detection
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = document.fullscreenElement !== null;
      setIsFullscreen(isCurrentlyFullscreen);
      
      if (!isCurrentlyFullscreen && !showSubmitConfirm) {
        handleSuspiciousActivity('Exited fullscreen mode');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [showSubmitConfirm]);

  // Tab switching detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && !showSubmitConfirm) {
        handleSuspiciousActivity('Switched tabs or minimized window');
      }
    };

    const handleBlur = () => {
      if (!showSubmitConfirm) {
        handleSuspiciousActivity('Window lost focus');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [showSubmitConfirm]);

  // Timer
  useEffect(() => {
    // Only start/resume timer if not loading and time remaining
    if (!loading && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          const newTime = prev - 1;
          // Save to sessionStorage
          sessionStorage.setItem(STORAGE_KEYS.timer, newTime.toString());
          return newTime;
        });
      }, 1000);

      // Cleanup on unmount or when timer changes
      return () => {
        clearInterval(timer);
      };
    } else if (timeRemaining === 0 && !loading && !submitting) {
      // Time's up - auto submit
      setShowSubmitConfirm(true);
      handleSubmitExam();
      // Clear timer from storage
      sessionStorage.removeItem(STORAGE_KEYS.timer);
    }
  }, [timeRemaining, loading, submitting]); // Add submitting to dependencies

  // Enter fullscreen on component mount
  useEffect(() => {
    const enterFullscreen = async () => {
      try {
        await document.documentElement.requestFullscreen();
      } catch (error) {
        console.error('Error entering fullscreen:', error);
      }
    };
    
    enterFullscreen();
    
    // Exit fullscreen on component unmount
    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(console.error);
      }
    };
  }, []);

  // Add this constant at the top with other constants
  const STORAGE_KEYS = {
    questions: 'exam_questions',
    sections: 'exam_sections',
    config: 'exam_config',
    timer: `exam_timer_${branch}_${year}_${semester}_${subject}`,
    currentIndex: 'exam_current_question',
    answers: 'exam_answers',
    review: 'exam_review_questions'
  };

  const saveExamState = (state) => {
    try {
      Object.entries(state).forEach(([key, value]) => {
        if (value !== undefined) {
          sessionStorage.setItem(
            STORAGE_KEYS[key], 
            typeof value === 'object' ? JSON.stringify(value) : value
          );
        }
      });
    } catch (error) {
      console.error('Error saving exam state:', error);
    }
  };

  const loadExamState = () => {
    try {
      return {
        questions: JSON.parse(sessionStorage.getItem(STORAGE_KEYS.questions)),
        sections: JSON.parse(sessionStorage.getItem(STORAGE_KEYS.sections)),
        examConfig: JSON.parse(sessionStorage.getItem(STORAGE_KEYS.config)),
        timeRemaining: parseInt(sessionStorage.getItem(STORAGE_KEYS.timer)),
        currentQuestionIndex: parseInt(sessionStorage.getItem(STORAGE_KEYS.currentIndex) || '0'),
        answers: JSON.parse(sessionStorage.getItem(STORAGE_KEYS.answers) || '{}'),
        reviewQuestions: new Set(JSON.parse(sessionStorage.getItem(STORAGE_KEYS.review) || '[]'))
      };
    } catch (error) {
      console.error('Error loading exam state:', error);
      return null;
    }
  };

  const clearExamState = () => {
    Object.values(STORAGE_KEYS).forEach(key => sessionStorage.removeItem(key));
  };

  // Modify the loadExamData function
  const loadExamData = async () => {
    try {
      // First try to load from sessionStorage
      const savedState = loadExamState();
      
      if (savedState?.questions?.length > 0) {
        setQuestions(savedState.questions);
        setSections(savedState.sections);
        setExamConfig(savedState.examConfig);
        setTimeRemaining(savedState.timeRemaining);
        setCurrentQuestionIndex(savedState.currentQuestionIndex);
        setAnswers(savedState.answers);
        setReviewQuestions(savedState.reviewQuestions);
        setTotalQuestions(savedState.examConfig.numberOfQuestions);
        setLoading(false);
        return;
      }

      // If no saved state, fetch from API
      const response = await axios.get(
        `http://localhost:5000/api/student/exam/${branch}/${year}/${semester}/${subject}`
      );

      const { questions, sections, examConfig } = response.data;
      
      // Initialize timer with full time
      const initialTime = examConfig.timeLimit * 60;
      setTimeRemaining(initialTime);
      sessionStorage.setItem(STORAGE_KEYS.timer, initialTime.toString());
      
      // Save initial state to sessionStorage
      saveExamState({
        questions,
        sections,
        config: examConfig,
        timer: initialTime,
        currentIndex: 0,
        answers: {},
        review: []
      });

      // Update component state
      setQuestions(questions);
      setSections(sections);
      setExamConfig(examConfig);
      setTimeRemaining(examConfig.timeLimit * 60);
      setTotalQuestions(examConfig.numberOfQuestions);
      setLoading(false);
    } catch (error) {
      console.error('Error loading exam:', error);
      alert('Error loading exam. Please try again.');
      navigate('/student/dashboard');
    }
  };

  const validateStoredProgress = (progress, questions) => {
    if (!progress || !progress.answers) return false;
    
    // Check if stored answers match current questions
    const storedQuestionIds = Object.keys(progress.answers);
    const currentQuestionIds = questions.map(q => q._id);
    
    return storedQuestionIds.every(id => currentQuestionIds.includes(id));
  };

  const handleSuspiciousActivity = useCallback((activity) => {
    setWarningCount(prev => prev + 1);
    setShowWarning(true);
    
    console.warn(`Suspicious activity detected: ${activity}`);
    
    // Only show warning, remove auto-submit
    setTimeout(() => {
      setShowWarning(false);
    }, 3000);
  }, []);

  const handleAnswerSelect = (questionId, answerIndex) => {
    const newAnswers = {
      ...answers,
      [questionId]: answerIndex
    };
    setAnswers(newAnswers);

    const examId = `${branch}_${year}_${semester}_${subject}`;
    saveExamState(examId, {
      answers: newAnswers,
      currentQuestionIndex,
      timeRemaining,
      reviewQuestions
    });
  };

  const handleMarkForReview = (questionId) => {
    const newReviewQuestions = new Set(reviewQuestions);
    if (newReviewQuestions.has(questionId)) {
      newReviewQuestions.delete(questionId);
    } else {
      newReviewQuestions.add(questionId);
    }
    setReviewQuestions(newReviewQuestions);

    const examId = `${branch}_${year}_${semester}_${subject}`;
    saveExamState(examId, {
      answers,
      currentQuestionIndex,
      timeRemaining,
      reviewQuestions: newReviewQuestions
    });
  };

  // Update the handleSubmitExam function to be more efficient
  const handleSubmitExam = async () => {
    setSubmitting(true);
    
    try {
      const examAnswers = Object.entries(answers).map(([questionId, selectedAnswer]) => ({
        questionId,
        selectedAnswer: selectedAnswer ?? -1
      }));

      const payload = {
        answers: examAnswers,
        examConfig: {
          branch,
          year,
          semester,
          subject
        }
      };

      const response = await axios.post(
        'http://localhost:5000/api/student/submit-exam', 
        payload
      );

      if (response.data) {
        // Clear timer from storage on successful submission
        sessionStorage.removeItem(STORAGE_KEYS.timer);
        clearExamState();
        
        const logoutDelay = 5000;
        const exitTime = Date.now() + logoutDelay;
        setLogoutTime(exitTime);
        setShowThankYou(true);
        
        setTimeout(() => {
          setIsFading(true);
          setTimeout(async () => {
            await logout();
            navigate('/login', { replace: true });
          }, 1000);
        }, logoutDelay - 1000);
      }
    } catch (error) {
      console.error('Submission error:', error);
      alert('Error submitting exam. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getQuestionStatus = (questionId) => {
    if (reviewQuestions.has(questionId)) return 'review';
    if (answers[questionId] !== undefined) return 'answered';
    return 'unanswered';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'answered': return 'bg-green-500 text-white hover:bg-green-600';
      case 'review': return 'bg-yellow-500 text-white hover:bg-yellow-600';
      default: return 'bg-red-500 text-white hover:bg-red-600'; // Changed from gray to red
    }
  };

  const handleSectionClick = (section) => {
    // Remove the slice(0, 20) limitation
    const firstQuestionIndex = questions
      .findIndex(q => q.section === section);
    if (firstQuestionIndex !== -1) {
      setCurrentQuestionIndex(firstQuestionIndex);
    }
    setSelectedSection(section);
  };

  // Add this useEffect for additional protection
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Prevent PrintScreen
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        return false;
      }
      
      // Prevent Ctrl + Shift + I, Ctrl + Shift + J, Ctrl + Shift + C
      if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) {
        e.preventDefault();
        return false;
      }
      
      // Prevent Ctrl + P
      if (e.ctrlKey && e.key === 'p') {
        e.preventDefault();
        return false;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleSuspiciousActivity('Tab switched or window minimized');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Add after other useEffect hooks
  useEffect(() => {
    const storedLogoutTime = localStorage.getItem('exam_logout_time');
    if (storedLogoutTime && showThankYou) {
      const remainingTime = Math.max(0, parseInt(storedLogoutTime) - Date.now());
      if (remainingTime > 0) {
        setLogoutTime(parseInt(storedLogoutTime));
        setTimeout(async () => {
          await logout();
          window.location.href = '/home';
        }, remainingTime);
      } else {
        // If time has already passed, logout immediately
        logout();
        window.location.href = '/home';
      }
    }
  }, [showThankYou]);

  // Add this useEffect for cleanup
  useEffect(() => {
    return () => {
      // Cleanup stored logout time when component unmounts
      localStorage.removeItem('exam_logout_time');
    };
  }, []);

  // Add this useEffect after your other effects
  useEffect(() => {
    let intervalId;
    
    if (showThankYou && logoutTime) {
      intervalId = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((logoutTime - Date.now()) / 1000));
        if (remaining <= 0) {
          clearInterval(intervalId);
        }
        // Force re-render to update the number
        setLogoutTime(prev => prev);
      }, 1000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [showThankYou, logoutTime]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading exam...</p>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center bg-gray-800 p-8 rounded-lg shadow-md">
          <AlertCircle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-100 mb-2">No Questions Available</h2>
          <p className="text-gray-300 mb-4">
            No questions are available for your branch ({user?.branch}) at this time.
          </p>
          <button
            onClick={() => navigate('/student/dashboard')}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className={`min-h-screen bg-gray-900 flex flex-col ${noSelectStyle}`}>
      {/* Warning Banner */}
      {showWarning && (
        <div className="bg-red-600 text-white p-2 sm:p-4 text-center animate-pulse">
          <div className="flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 sm:w-6 sm:h-6 mr-2" />
            <span className="text-sm sm:text-base font-bold">
              WARNING: Suspicious activity detected! ({warningCount}/3)
            </span>
          </div>
        </div>
      )}

      {/* Header - Made Responsive */}
      <header className="bg-gray-800 shadow-md border-b border-gray-700 p-3 sm:p-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-100">
              MCQ Exam - {examConfig?.subject || subject}
            </h1>
            <p className="text-xs sm:text-sm text-gray-400">
              Total Questions: {examConfig?.numberOfQuestions || 0} • 
              Time: {examConfig?.timeLimit || 0} Minutes
            </p>
          </div>
          
          <div className="flex items-center space-x-3 sm:space-x-6">
            <div className="flex items-center">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-blue-600" />
              <span className={`text-base sm:text-lg font-semibold ${
                timeRemaining < 300 ? 'text-red-600' : 'text-blue-600'
              }`}>
                {formatTime(timeRemaining)}
              </span>
            </div>
            
            {!isFullscreen && (
              <div className="flex items-center text-red-600">
                <Maximize className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                <span className="text-xs sm:text-sm">Not in fullscreen</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Sections - Scrollable on Mobile */}
      <div className="bg-gray-800 border-b border-gray-700 p-2 sm:p-4 overflow-x-auto">
        <div className="max-w-7xl mx-auto">
          <div className="flex space-x-2 sm:space-x-4 min-w-max">
            {sections.map(section => {
              const sectionQuestions = questions.filter(q => q.section === section);
              const answeredCount = sectionQuestions.filter(q => answers[q._id] !== undefined).length;
              
              return (
                <button
                  key={section}
                  onClick={() => handleSectionClick(section)}
                  className={`
                    px-3 sm:px-4 py-2 rounded-lg transition-all duration-200
                    ${selectedSection === section 
                      ? 'bg-blue-600 text-white shadow-md transform scale-105' 
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-200'}
                  `}
                >
                  <div className="text-xs sm:text-sm font-medium">{section}</div>
                  <div className="text-[10px] sm:text-xs">
                    {answeredCount}/{sectionQuestions.length}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content - Responsive Layout */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl mx-auto w-full">
        {/* Question Area */}
        <div className="flex-1 p-3 sm:p-6">
          <div className="bg-gray-800 rounded-lg shadow-md h-full p-4 sm:p-6">
            {/* Question Header */}
            <div className="mb-4 sm:mb-6">
              <div className="flex justify-between items-center mb-3 sm:mb-4">
                <h2 className="text-base sm:text-lg font-semibold text-gray-100">
                  Question {currentQuestionIndex + 1} of {totalQuestions}
                </h2>
                <span className="bg-blue-900/50 text-blue-300 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm">
                  {currentQuestion.section}
                </span>
              </div>
              
              <p className={`text-gray-200 text-base sm:text-lg leading-relaxed mb-4 sm:mb-6 ${noSelectStyle}`}>
                {currentQuestion.questionText}
              </p>

              {/* Question Image - Responsive */}
              {currentQuestion.questionImage && (
                <div className="my-3 sm:my-4">
                  <img
                    src={`http://localhost:5000${currentQuestion.questionImage}`}
                    alt="Question"
                    className="max-w-full h-auto rounded-lg shadow-md"
                    onError={(e) => {
                      console.error('Error loading image:', e);
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>

            {/* Options - Responsive Spacing */}
            <div className="space-y-2 sm:space-y-3 mb-6 sm:mb-8">
              {currentQuestion.options.map((option, index) => (
                <label
                  key={index}
                  className={`
                    flex items-center p-3 sm:p-4 border rounded-lg cursor-pointer transition-colors
                    ${answers[currentQuestion._id] === index
                      ? 'border-blue-500 bg-blue-900/50'
                      : 'border-gray-600 hover:border-gray-500 bg-gray-700'}
                  `}
                >
                  <input
                    type="radio"
                    name={`question-${currentQuestion._id}`}
                    value={index}
                    checked={answers[currentQuestion._id] === index}
                    onChange={() => handleAnswerSelect(currentQuestion._id, index)}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${
                    answers[currentQuestion._id] === index
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300'
                  }`}>
                    {answers[currentQuestion._id] === index && (
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    )}
                  </div>
                  <span className={`text-gray-200 ${noSelectStyle}`}>
                    <strong>{String.fromCharCode(65 + index)}.</strong> {option}
                  </span>
                </label>
              ))}
            </div>

            {/* Navigation Buttons - Stack on Mobile */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center space-y-3 sm:space-y-0">
              <div className="flex space-x-2 sm:space-x-3">
                <button
                  onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                  disabled={currentQuestionIndex === 0}
                  className="flex-1 sm:flex-none px-4 py-2 text-sm sm:text-base bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                <button
                  onClick={() => setCurrentQuestionIndex(Math.min(totalQuestions - 1, currentQuestionIndex + 1))}
                  disabled={currentQuestionIndex === totalQuestions - 1}
                  className="flex-1 sm:flex-none px-4 py-2 text-sm sm:text-base bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>

              <div className="flex space-x-2 sm:space-x-3">
                <button
                  onClick={() => handleMarkForReview(currentQuestion._id)}
                  className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 text-sm sm:text-base rounded-md flex items-center justify-center ${
                    reviewQuestions.has(currentQuestion._id)
                      ? 'bg-yellow-500 text-white'
                      : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                  }`}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">
                    {reviewQuestions.has(currentQuestion._id) ? 'Marked for Review' : 'Mark for Review'}
                  </span>
                  <span className="sm:hidden">Review</span>
                </button>

                <button
                  onClick={() => setShowSubmitConfirm(true)}
                  className="flex-1 sm:flex-none px-4 py-2 text-sm sm:text-base bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center justify-center"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Submit
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Question Navigation - Fixed Bottom on Mobile */}
        <div className="lg:w-80 p-3 sm:p-6 fixed bottom-0 left-0 right-0 lg:relative bg-gray-900 lg:bg-transparent">
          <div className="bg-gray-800 rounded-lg shadow-md p-4 sm:p-6">
            {/* Navigation Content */}
            <h3 className="font-semibold text-gray-100 mb-3 sm:mb-4 text-base sm:text-lg">
              Question Navigation
            </h3>
            
            {/* Question Grid - Responsive */}
            <div className="grid grid-cols-8 sm:grid-cols-5 gap-2 sm:gap-3">
              {questions.map((question, index) => {
                const status = getQuestionStatus(question._id);
                return (
                  <button
                    key={question._id}
                    onClick={() => setCurrentQuestionIndex(index)}
                    className={`
                      w-8 h-8 sm:w-10 sm:h-10 rounded-full 
                      text-xs sm:text-sm font-medium 
                      transition-all duration-200 
                      transform hover:scale-105
                      ${getStatusColor(status)}
                      ${currentQuestionIndex === index ? 'ring-2 ring-offset-2 ring-blue-500' : ''}
                    `}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>

            {/* Stats - Hide on Mobile */}
            <div className="hidden sm:block mt-6 space-y-3 bg-gray-700 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Total Questions</span>
                <span className="font-semibold text-blue-300 bg-blue-900/50 px-3 py-1 rounded-full">
                  {examConfig?.numberOfQuestions || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Time Remaining</span>
                <span className={`font-semibold ${
                  timeRemaining < 300 ? 'text-red-600 bg-red-100' : 'text-blue-600 bg-blue-100'
                } px-3 py-1 rounded-full`}>
                  {formatTime(timeRemaining)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Answered</span>
                <span className="font-semibold text-green-600 bg-green-100 px-3 py-1 rounded-full">
                  {Object.keys(answers).length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Not Answered</span>
                <span className="font-semibold text-red-600 bg-red-100 px-3 py-1 rounded-full">
                  {examConfig?.numberOfQuestions - Object.keys(answers).length || 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Modal - Responsive */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-4 sm:p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-100 mb-4">
              Confirm Exam Submission
            </h3>
            
            <div className="text-sm space-y-1 text-gray-300">
              <div className="flex justify-between">
                <span>Total Questions:</span>
                <span className="font-semibold">{totalQuestions}</span>
              </div>
              <div className="flex justify-between">
                <span>Answered:</span>
                <span className="font-semibold text-green-600">
                  {Object.keys(answers).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Not Answered:</span>
                <span className="font-semibold text-red-600">
                  {totalQuestions - Object.keys(answers).length}
                </span>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowSubmitConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-700 text-gray-200 rounded-md hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitExam}
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Exam'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thank You Modal */}
      {showThankYou && (
        <div className={`fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4
          transition-opacity duration-1000 ease-in-out
          ${isFading ? 'opacity-0' : 'opacity-100'}`}
        >
          <div className={`relative w-full max-w-md transform transition-all duration-1000 ease-in-out
            ${isFading ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`}
          >
            <div className="relative overflow-hidden rounded-lg shadow-2xl">
              {/* Card Background Image */}
              <img 
                src="/img.png" 
                alt="background" 
                className="absolute inset-0 w-full h-full object-cover"
              />
              
              {/* Glassmorphism Overlay */}
              <div className="absolute inset-0 bg-white/10 backdrop-blur-md" />
              
              {/* Content */}
              <div className="relative bg-gray-800/80 p-8">
                <div className="relative z-10">
                  <CheckCircle className={`w-16 h-16 text-green-500 mx-auto mb-4 transition-transform duration-1000
                    ${isFading ? 'scale-0' : 'scale-100'}`}
                  />
                  
                  <h3 className="text-2xl font-semibold text-gray-100 mb-4 text-center">
                    Thank You!
                  </h3>
                  
                  <p className="text-gray-300 mb-6 text-center">
                    Your exam has been submitted successfully.
                  </p>

                  <div className="bg-gray-700/50 backdrop-blur-sm rounded-lg p-4">
                    <p className="text-gray-300 text-center">
                      Redirecting to login page in
                      <span 
                        key={logoutTime} 
                        className="inline-block text-blue-400 font-bold mx-2 w-6 text-center"
                      >
                        {Math.max(0, Math.ceil((logoutTime - Date.now()) / 1000))}
                      </span>
                      seconds
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamInterface;