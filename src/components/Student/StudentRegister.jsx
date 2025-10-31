import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { UserPlus, User, Lock, Building, Hash, Loader } from 'lucide-react';

const StudentRegister = () => {
  const [formData, setFormData] = useState({
    name: '',
    rollNumber: '',
    branch: '',
    section: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Additional validation
    if (!formData.name || !formData.rollNumber || !formData.branch || !formData.section) {
      setError('All fields are required');
      setLoading(false);
      return;
    }

    // Password validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      // First check if roll number exists
      const checkResponse = await fetch(`http://localhost:5000/api/student/check-rollnumber/${formData.rollNumber.trim().toUpperCase()}`);
      const checkData = await checkResponse.json();

      if (checkData.exists) {
        setError('Roll Number already exists');
        setLoading(false);
        return;
      }

      // If roll number doesn't exist, proceed with registration
      const response = await fetch('http://localhost:5000/api/student/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          rollNumber: formData.rollNumber.trim().toUpperCase(),
          branch: formData.branch.trim().toUpperCase(),
          section: formData.section.trim().toUpperCase(),
          password: formData.password
        })
      });

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned non-JSON response');
      }

      const data = await response.json();

      if (response.ok) {
        alert('Registration successful!');
        navigate('/student/login');
      } else {
        setError(data.message || 'Registration failed. Please try again.');
      }
    } catch (err) {
      console.error('Registration error:', err);
      if (err.message === 'Server returned non-JSON response') {
        setError('Server error. Please try again later.');
      } else {
        setError('Network error. Please check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Update the handleChange function to convert specific fields to uppercase
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Remove spaces for roll number field
    if (name === 'rollNumber') {
      setFormData(prev => ({
        ...prev,
        [name]: value.replace(/\s+/g, '').toUpperCase()
      }));
      return;
    }

    // For other fields, just trim and convert to uppercase
    setFormData(prev => ({
      ...prev,
      [name]: name === 'password' || name === 'confirmPassword' 
        ? value
        : value.trim().toUpperCase()
    }));
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

      {/* Right side - Register Form */}
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

        {/* Register Form Container */}
        <div className="w-full max-w-[420px] px-6 relative z-10">
          <form onSubmit={handleSubmit} className="backdrop-blur-xl bg-white/5 w-full p-8 rounded-2xl shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] border border-white/10">
            {/* Header - Responsive typography */}
            <div className="text-center mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">
                Student Registration
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-gray-300">
                Create your account to access exams
              </p>
            </div>

            {/* Error message - Enhanced visibility */}
            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm animate-shake">
                {error}
              </div>
            )}

            <div className="space-y-4">
              {/* Name and Roll Number - Responsive grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Name Input */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className="pl-10 w-full px-3 py-2.5 sm:py-3 bg-black/30 border border-gray-600 
                               rounded-lg text-white placeholder-gray-500 text-sm sm:text-base
                               focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                               transition-colors uppercase"
                      placeholder="Enter your full name"
                    />
                  </div>
                </div>

                {/* Roll Number Input */}
                <div>
                  <label htmlFor="rollNumber" className="block text-sm font-medium text-gray-300 mb-1.5">
                    Roll Number
                  </label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                    <input
                      id="rollNumber"
                      name="rollNumber"
                      type="text"
                      required
                      value={formData.rollNumber}
                      onChange={handleChange}
                      onKeyPress={(e) => {
                        // Prevent space key
                        if (e.key === ' ') {
                          e.preventDefault();
                        }
                      }}
                      className="pl-10 w-full px-3 py-2.5 sm:py-3 bg-black/30 border border-gray-600 
                               rounded-lg text-white placeholder-gray-500 text-sm sm:text-base
                               focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                               transition-colors uppercase"
                      placeholder="Enter roll number"
                    />
                  </div>
                </div>
              </div>

              {/* Branch and Section - Responsive grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Branch Select */}
                <div>
                  <label htmlFor="branch" className="block text-sm font-medium text-gray-300 mb-1.5">
                    Branch
                  </label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                    <select
                      id="branch"
                      name="branch"
                      required
                      value={formData.branch}
                      onChange={handleChange}
                      className="pl-10 w-full px-3 py-2.5 sm:py-3 bg-black/30 border border-gray-600 
                               rounded-lg text-white placeholder-gray-500 text-sm sm:text-base
                               focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                               transition-colors uppercase"
                    >
                      <option value="">Select Branch</option>
                      <option value="CSE">CSE</option>
                      <option value="ECE">ECE</option>
                      <option value="ME">ME</option>
                      <option value="CE">CE</option>
                      <option value="EEE">EEE</option>
                    </select>
                  </div>
                </div>

                {/* Section Input */}
                <div>
                  <label htmlFor="section" className="block text-sm font-medium text-gray-300 mb-1.5">
                    Section
                  </label>
                  <div className="relative">
                    <input
                      id="section"
                      name="section"
                      type="text"
                      required
                      maxLength={1}
                      value={formData.section}
                      onChange={handleChange}
                      className="w-full px-3 py-2.5 sm:py-3 bg-black/30 border border-gray-600 
                               rounded-lg text-white placeholder-gray-500 text-sm sm:text-base
                               focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                               transition-colors uppercase"
                      placeholder="E.g., A, B, C"
                    />
                  </div>
                </div>
              </div>

              {/* Password Fields - Responsive grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Password Input */}
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
                      value={formData.password}
                      onChange={handleChange}
                      className="pl-10 w-full px-3 py-2.5 sm:py-3 bg-black/30 border border-gray-600 
                               rounded-lg text-white placeholder-gray-500 text-sm sm:text-base
                               focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                               transition-colors"
                      placeholder="Create password"
                    />
                  </div>
                </div>

                {/* Confirm Password Input */}
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-1.5">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      required
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="pl-10 w-full px-3 py-2.5 sm:py-3 bg-black/30 border border-gray-600 
                               rounded-lg text-white placeholder-gray-500 text-sm sm:text-base
                               focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                               transition-colors"
                      placeholder="Confirm password"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button - Enhanced states */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 sm:py-3 px-4 text-sm sm:text-base font-medium rounded-lg
                       bg-green-600 text-white mt-6
                       hover:bg-green-700 focus:ring-2 focus:ring-offset-2 focus:ring-green-500
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all duration-200 group"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <Loader className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  Registering...
                </span>
              ) : (
                'Register Account'
              )}
            </button>

            {/* Links - Better spacing and hover states */}
            <div className="mt-4 sm:mt-6 text-center space-y-2">
              <Link 
                to="/student/login" 
                className="block text-green-400 hover:text-green-300 text-sm font-medium 
                         transition-colors hover:underline"
              >
                Already have an account? Sign in
              </Link>
            </div>
          </form>
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

export default StudentRegister;