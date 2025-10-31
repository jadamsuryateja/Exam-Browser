import React, { useState, useEffect } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { User, Lock, Loader } from 'lucide-react';
import axios from 'axios';

const StudentLogin = () => {
  const [credentials, setCredentials] = useState({
    rollNumber: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    year: '',
    semester: ''
  });
  const [availableFilters, setAvailableFilters] = useState({
    years: [],
    semesters: []
  });
  const [filterLoading, setFilterLoading] = useState(true);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        setFilterLoading(true);
        setError('');
        
        console.log('Fetching filters...');
        const response = await axios.get('http://192.168.29.44:5000/api/exams/filters');
        console.log('Filters response:', response.data);

        if (!response.data) {
          throw new Error('No data received from server');
        }

        const { years, semesters } = response.data;
        
        if (!Array.isArray(years) || !Array.isArray(semesters)) {
          throw new Error('Invalid data format received');
        }

        setAvailableFilters({
          years,
          semesters
        });
        
      } catch (error) {
        console.error('Error fetching filters:', error);
        setError('Unable to load year and semester options. Please try again later.');
      } finally {
        setFilterLoading(false);
      }
    };
    
    fetchFilters();
  }, []);

  useEffect(() => {
    console.log('Available filters updated:', availableFilters);
  }, [availableFilters]);

  if (user && user.role === 'student') {
    return <Navigate to="/student/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate year and semester
    if (!filters.year || !filters.semester) {
      setError('Please select both year and semester');
      setLoading(false);
      return;
    }

    const result = await login(credentials, 'student', filters);
    
    if (!result.success) {
      setError(result.message);
    } else {
      navigate('/student/dashboard');
    }
    
    setLoading(false);
  };

  const handleChange = (e) => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value
    });
  };

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="h-screen w-full flex overflow-hidden bg-black">
      {/* Left side - Image (Desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        <img
          src="/img.png"
          alt="College"
          className="object-contain w-full h-full p-8"
        />
      </div>

      {/* Right side - Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center min-h-screen relative">
        {/* Mobile Background Image */}
        <div className="absolute inset-0 lg:hidden">
          <img
            src="/img.png"
            alt=""
            className="w-full h-full object-cover opacity-40"
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/40"></div>
        </div>

        {/* Background Effects */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/30 rounded-full mix-blend-normal filter blur-3xl opacity-20 animate-blob"></div>
          <div className="absolute top-1/2 right-1/4 w-96 h-96 bg-purple-300/30 rounded-full mix-blend-normal filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-purple-400/30 rounded-full mix-blend-normal filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>

        {/* Login Form Container */}
        <div className="w-full max-w-[420px] px-6 relative z-10">
          <div className="backdrop-blur-xl bg-white/5 w-full p-8 rounded-2xl shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] border border-white/10">
            {/* Header section - Responsive typography */}
            <div className="text-center mb-4 sm:mb-6 lg:mb-8">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-2">
                Student Portal
              </h1>
              <p className="text-sm text-gray-300">
                Sign in to access your exams
              </p>
            </div>

            {/* Error message - Improved visibility */}
            {error && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg animate-shake">
                <p className="text-red-200 text-xs sm:text-sm text-center">{error}</p>
              </div>
            )}

            {/* Form - Better spacing for mobile */}
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              <div className="space-y-3 sm:space-y-4">
                {/* Roll Number Input - Enhanced mobile experience */}
                <div>
                  <label htmlFor="rollNumber" className="block text-sm font-medium text-gray-300 mb-1.5">
                    Roll Number
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                    <input
                      id="rollNumber"
                      name="rollNumber"
                      type="text"
                      required
                      value={credentials.rollNumber}
                      onChange={handleChange}
                      className="pl-10 w-full px-3 py-2 sm:py-2.5 border border-gray-700 rounded-lg 
                               bg-gray-800/90 text-white placeholder-gray-400
                               focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500
                               transition-colors text-sm sm:text-base"
                      placeholder="Enter your roll number"
                    />
                  </div>
                </div>

                {/* Password Input - Consistent styling */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                    <input
                      id="password"
                      name="password"
                      type="password"
                      required
                      value={credentials.password}
                      onChange={handleChange}
                      className="pl-10 w-full px-3 py-2 sm:py-2.5 border border-gray-700 rounded-lg 
                               bg-gray-800/90 text-white placeholder-gray-400
                               focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500
                               transition-colors text-sm sm:text-base"
                      placeholder="Enter your password"
                    />
                  </div>
                </div>

                {/* Filter Section - Improved loading states */}
                <div className="space-y-3 sm:space-y-4">
                  {/* Year Select */}
                  <div>
                    <label htmlFor="year" className="block text-sm font-medium text-gray-300 mb-1.5">
                      Year
                    </label>
                    <select
                      id="year"
                      name="year"
                      required
                      disabled={filterLoading}
                      value={filters.year}
                      onChange={handleFilterChange}
                      className={`w-full px-3 py-2 sm:py-2.5 border border-gray-700 rounded-lg 
                                bg-gray-800/90 text-white text-sm sm:text-base
                                focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500
                                transition-colors ${filterLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <option value="">
                        {filterLoading ? (
                          <span className="flex items-center">
                            <Loader className="animate-spin mr-2 h-4 w-4" />
                            Loading...
                          </span>
                        ) : (
                          'Select Year'
                        )}
                      </option>
                      {!filterLoading && availableFilters.years.map(year => (
                        <option key={year} value={year}>Year {year}</option>
                      ))}
                    </select>
                  </div>

                  {/* Semester Select */}
                  <div>
                    <label htmlFor="semester" className="block text-sm font-medium text-gray-300 mb-1.5">
                      Semester
                    </label>
                    <select
                      id="semester"
                      name="semester"
                      required
                      disabled={filterLoading}
                      value={filters.semester}
                      onChange={handleFilterChange}
                      className={`w-full px-3 py-2 sm:py-2.5 border border-gray-700 rounded-lg 
                                bg-gray-800/90 text-white text-sm sm:text-base
                                focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500
                                transition-colors ${filterLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <option value="">
                        {filterLoading ? (
                          <span className="flex items-center">
                            <Loader className="animate-spin mr-2 h-4 w-4" />
                            Loading...
                          </span>
                        ) : (
                          'Select Semester'
                        )}
                      </option>
                      {!filterLoading && availableFilters.semesters.map(semester => (
                        <option key={semester} value={semester}>Semester {semester}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Submit Button - Enhanced states */}
              <button
                type="submit"
                disabled={loading || filterLoading}
                className="w-full py-2 sm:py-2.5 px-4 text-sm font-medium rounded-lg
                         bg-green-600 text-white
                         hover:bg-green-700 focus:ring-2 focus:ring-offset-2 focus:ring-green-500
                         disabled:opacity-50 disabled:cursor-not-allowed
                         transition-all duration-200 mt-6 group"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <Loader className="animate-spin -ml-1 mr-2 h-4 w-4" />
                    Signing in...
                  </span>
                ) : (
                  'Sign in to Exam'
                )}
              </button>
            </form>

            {/* Links section - Better spacing and hover states */}
            <div className="mt-6 text-center space-y-2">
              <Link 
                to="/student/register" 
                className="block text-green-400 hover:text-green-300 text-sm font-medium 
                         transition-colors hover:underline"
              >
                Don't have an account? Register
              </Link>
            </div>
          </div>
        </div>

        {/* Footer Link */}
        <div className="mt-6 text-center relative z-20">
          <Link 
            to="/" 
            className="text-gray-400 hover:text-white text-sm font-medium transition-colors duration-200 p-2"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default StudentLogin;