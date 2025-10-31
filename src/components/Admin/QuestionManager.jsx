import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import socketService from '../../services/socketService';

const QuestionManager = () => {
  const [examConfig, setExamConfig] = useState({
    branch: '',
    year: '',
    semester: '',
    subject: '',
    numberOfStudents: 0,
    numberOfQuestions: 20, // Default value
    timeLimit: 60 // Default value in minutes
  });
  const [examConfigs, setExamConfigs] = useState([]);
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [showDocxUpload, setShowDocxUpload] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [newQuestion, setNewQuestion] = useState({
    section: '',
    questionText: '',
    questionImage: '',
    options: ['', '', '', ''],
    correctAnswer: 0
  });
  const [uploadingDocx, setUploadingDocx] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchExamConfigs();
  }, []);

  useEffect(() => {
    if (selectedConfig) {
      fetchQuestions();
    }
  }, [selectedConfig]);

  useEffect(() => {
    const handleQuestionUpdate = (newQuestion) => {
      setQuestions(prevQuestions => {
        const index = prevQuestions.findIndex(q => q._id === newQuestion._id);
        if (index !== -1) {
          const updatedQuestions = [...prevQuestions];
          updatedQuestions[index] = newQuestion;
          return updatedQuestions;
        }
        return [...prevQuestions, newQuestion];
      });
    };

    socketService.subscribeToQuestionUpdates(handleQuestionUpdate);
    return () => socketService.unsubscribeFromQuestionUpdates(handleQuestionUpdate);
  }, []);

  const fetchExamConfigs = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/admin/exam-configs');
      setExamConfigs(response.data);
    } catch (error) {
      console.error('Error fetching exam configs:', error);
    }
  };

  const fetchQuestions = async () => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/admin/questions/${selectedConfig.branch}/${selectedConfig.year}/${selectedConfig.semester}/${selectedConfig.subject}`
      );
      setQuestions(response.data);
    } catch (error) {
      console.error('Error fetching questions:', error);
    }
  };

  const handleConfigSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      console.log('Submitting exam config:', examConfig); // Debug log
    
      const response = await axios.post('http://localhost:5000/api/admin/exam-config', examConfig);
      console.log('Server response:', response.data); // Debug log
    
      setMessage('Exam configuration saved successfully!');
      fetchExamConfigs();
    } catch (error) {
      console.error('Error saving config:', error); // Debug log
      setMessage('Error saving configuration');
    }
    
    setLoading(false);
  };

  const handleQuestionSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const questionData = {
        ...newQuestion,
        branch: selectedConfig.branch,
        year: selectedConfig.year,
        semester: selectedConfig.semester,
        subject: selectedConfig.subject
      };

      if (editingQuestion) {
        await axios.put(`http://localhost:5000/api/admin/questions/${editingQuestion._id}`, questionData);
        setMessage('Question updated successfully!');
      } else {
        await axios.post('http://localhost:5000/api/admin/questions', questionData);
        setMessage('Question added successfully!');
      }

      setNewQuestion({
        section: '',
        questionText: '',
        questionImage: '',
        options: ['', '', '', ''],
        correctAnswer: 0
      });
      setShowQuestionForm(false);
      setEditingQuestion(null);
      fetchQuestions();
    } catch (error) {
      setMessage('Error saving question');
    }

    setLoading(false);
  };

  const handleEditQuestion = (question) => {
    setNewQuestion({
      section: question.section,
      questionText: question.questionText,
      questionImage: question.questionImage || '',
      options: question.options,
      correctAnswer: question.correctAnswer
    });
    setEditingQuestion(question);
    setShowQuestionForm(true);
  };

  const handleDeleteQuestion = async (questionId) => {
    if (window.confirm('Are you sure you want to delete this question?')) {
      try {
        await axios.delete(`http://localhost:5000/api/admin/questions/${questionId}`);
        setMessage('Question deleted successfully!');
        fetchQuestions();
      } catch (error) {
        setMessage('Error deleting question');
      }
    }
  };

  const handleDeleteConfig = async (configId) => {
    const confirmMessage = 'Are you sure you want to delete this exam configuration?\n\n' +
      'This will permanently delete:\n' +
      '- The exam configuration\n' +
      '- All questions\n' +
      '- All student results\n\n' +
      'This action cannot be undone!';

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setLoading(true);
      setMessage('');
      
      const response = await axios.delete(`http://localhost:5000/api/admin/exam-config/${configId}`);
      
      if (response.data.success) {
        setMessage('Exam configuration deleted successfully');
        setSelectedConfig(null);
        setQuestions([]);
        await fetchExamConfigs();
      } else {
        throw new Error(response.data.message || 'Failed to delete');
      }
    } catch (error) {
      console.error('Error deleting config:', error);
      setMessage(error.response?.data?.message || 'Error deleting exam configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadingImage(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await axios.post('http://localhost:5000/api/admin/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setNewQuestion({ ...newQuestion, questionImage: response.data.imageUrl });
      setMessage('Image uploaded successfully!');
    } catch (error) {
      setMessage('Error uploading image');
    }
    
    setUploadingImage(false);
  };

  const handleDocxUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!selectedConfig) {
      setMessage('Please select an exam configuration first');
      return;
    }

    setUploadingDocx(true);
    const formData = new FormData();
    formData.append('docx', file);
    formData.append('branch', selectedConfig.branch);
    formData.append('year', selectedConfig.year);
    formData.append('semester', selectedConfig.semester);
    formData.append('subject', selectedConfig.subject);
    formData.append('section', 'Uploaded'); // Default section for uploaded questions

    try {
      const response = await axios.post('http://localhost:5000/api/admin/upload-docx', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setMessage(response.data.message);
      fetchQuestions();
      setShowDocxUpload(false);
    } catch (error) {
      setMessage('Error uploading DOCX file');
    }
    
    setUploadingDocx(false);
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...newQuestion.options];
    newOptions[index] = value;
    setNewQuestion({ ...newQuestion, options: newOptions });
  };

  const getSemesterOptions = (year) => {
    if (!year) return [];
    
    const yearNum = parseInt(year);
    if (yearNum >= 1 && yearNum <= 4) {
      return [`${yearNum}-1`, `${yearNum}-2`];
    }
    
    return ['Enter manually'];
  };

  const sections = [...new Set(questions.map(q => q.section))].sort();

  return (
    <div className="space-y-8">
      {/* Exam Configuration */}
      <div className="bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-100 mb-6">Exam Configuration</h2>
        
        {message && (
          <div className={`mb-4 p-4 rounded-md ${
            message.includes('Error') ? 'bg-red-900 text-red-300' : 'bg-green-900 text-green-300'
          }`}>
            {message}
          </div>
        )}

        <form onSubmit={handleConfigSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Branch
            </label>
            <select
              value={examConfig.branch}
              onChange={(e) => setExamConfig({...examConfig, branch: e.target.value})}
              className="w-full px-3 py-2 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
              required
            >
              <option value="">Select Branch</option>
              <option value="CSE">Computer Science Engineering</option>
              <option value="ECE">Electronics & Communication</option>
              <option value="ME">Mechanical Engineering</option>
              <option value="CE">Civil Engineering</option>
              <option value="EEE">Electrical Engineering</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Year
            </label>
            <select
              value={examConfig.year}
              onChange={(e) => setExamConfig({...examConfig, year: e.target.value, semester: ''})}
              className="w-full px-3 py-2 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
              required
            >
              <option value="">Select Year</option>
              <option value="1">1st Year</option>
              <option value="2">2nd Year</option>
              <option value="3">3rd Year</option>
              <option value="4">4th Year</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Semester
            </label>
            <select
              value={examConfig.semester}
              onChange={(e) => setExamConfig({...examConfig, semester: e.target.value})}
              className="w-full px-3 py-2 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
              required
              disabled={!examConfig.year}
            >
              <option value="">Select Semester</option>
              {getSemesterOptions(examConfig.year).map(sem => (
                <option key={sem} value={sem}>{sem}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Subject
            </label>
            <input
              type="text"
              value={examConfig.subject}
              onChange={(e) => setExamConfig({...examConfig, subject: e.target.value})}
              className="w-full px-3 py-2 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
              placeholder="Enter subject name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Number of Students
            </label>
            <input
              type="number"
              value={examConfig.numberOfStudents}
              onChange={(e) => setExamConfig({...examConfig, numberOfStudents: parseInt(e.target.value) || 0})}
              className="w-full px-3 py-2 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
              placeholder="Enter number of students"
              min="0"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Number of Questions
            </label>
            <input
              type="number"
              value={examConfig.numberOfQuestions}
              onChange={(e) => setExamConfig({
                ...examConfig, 
                numberOfQuestions: parseInt(e.target.value) || 0
              })}
              className="w-full px-3 py-2 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
              placeholder="Enter number of questions"
              min="1"
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              Maximum questions to show to students
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Time Limit (minutes)
            </label>
            <input
              type="number"
              value={examConfig.timeLimit}
              onChange={(e) => setExamConfig({
                ...examConfig, 
                timeLimit: parseInt(e.target.value) || 60
              })}
              className="w-full px-3 py-2 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
              placeholder="Enter time limit in minutes"
              min="1"
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              Time limit for completing the exam
            </p>
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      </div>

      {/* Exam Configuration Selection */}
      {examConfigs.length > 0 && (
        <div className="bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-100 mb-6">Select Exam Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {examConfigs.map((config) => (
              <div
                key={config._id}
                className={`p-4 border rounded-lg relative ${
                  selectedConfig?._id === config._id
                    ? 'border-blue-600 bg-blue-900'
                    : 'border-gray-700 hover:border-gray-400'
                }`}
              >
                <div 
                  onClick={() => {
                    setSelectedConfig(config);
                    // Load the selected config data into the form, including numberOfStudents
                    setExamConfig({
                      branch: config.branch,
                      year: config.year,
                      semester: config.semester,
                      subject: config.subject,
                      // Fix: Use the actual numberOfStudents value from config
                      numberOfStudents: parseInt(config.numberOfStudents) || 0,
                      numberOfQuestions: config.numberOfQuestions || 20,
                      timeLimit: config.timeLimit || 60
                    });
                  }}
                  className="cursor-pointer"
                >
                  <h3 className="font-semibold text-gray-100">{config.subject}</h3>
                  <p className="text-sm text-gray-400">
                    {config.branch} - Year {config.year} - Semester {config.semester}
                  </p>
                  <p className="text-sm text-gray-500">
                    Students: {config.numberOfStudents} | Questions: {config.numberOfQuestions || 20}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!loading) {
                      handleDeleteConfig(config._id);
                    }
                  }}
                  disabled={loading}
                  className="absolute top-2 right-2 p-1 text-red-600 hover:text-red-800 rounded-full hover:bg-red-900 
    transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                  title="Delete exam configuration"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Question Management */}
      {selectedConfig && (
        <div className="bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-100">
              Questions for {selectedConfig.subject} - {selectedConfig.branch} ({questions.length})
            </h2>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDocxUpload(true)}
                className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Upload DOCX
              </button>
              <button
                onClick={() => {
                  setShowQuestionForm(true);
                  setEditingQuestion(null);
                  setNewQuestion({
                    section: '',
                    questionText: '',
                    questionImage: '',
                    options: ['', '', '', ''],
                    correctAnswer: 0
                  });
                }}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Question
              </button>
            </div>
          </div>

          {/* DOCX Upload Modal */}
          {showDocxUpload && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Upload DOCX File
                </h3>
                
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">
                    Upload a DOCX file with questions in the following format:
                  </p>
                  <div className="bg-gray-50 p-3 rounded text-xs font-mono">
                    Q1: What is the capital of France?<br/>
                    A) London<br/>
                    B) Berlin<br/>
                    C) Paris*<br/>
                    D) Madrid<br/>
                    <br/>
                    Q2: Which is the largest planet?<br/>
                    A) Earth<br/>
                    B) Jupiter*<br/>
                    C) Mars<br/>
                    D) Venus
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    * Mark correct answers with asterisk (*) or use "Answer: B" format
                  </p>
                </div>
                
                <input
                  type="file"
                  accept=".docx"
                  onChange={handleDocxUpload}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                  disabled={uploadingDocx}
                />
                
                <div className="flex space-x-3 mt-4">
                  <button
                    onClick={() => setShowDocxUpload(false)}
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                    disabled={uploadingDocx}
                  >
                    Cancel
                  </button>
                </div>
                
                {uploadingDocx && (
                  <div className="text-center mt-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-sm text-gray-600 mt-2">Processing DOCX file...</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Question Form Modal */}
          {showQuestionForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-gray-800 rounded-lg p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto scrollbar-hide">
                <form onSubmit={handleQuestionSubmit}>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-100">
                      {editingQuestion ? 'Edit Question' : 'Add New Question'}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowQuestionForm(false)}
                      className="text-gray-400 hover:text-gray-200"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Section
                      </label>
                      <input
                        type="text"
                        value={newQuestion.section}
                        onChange={(e) => setNewQuestion({...newQuestion, section: e.target.value})}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                        placeholder="e.g., Section A, Programming, Mathematics"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Question Text
                      </label>
                      <textarea
                        value={newQuestion.questionText}
                        onChange={(e) => setNewQuestion({...newQuestion, questionText: e.target.value})}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                        rows="3"
                        placeholder="Enter your question here..."
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Question Image (Optional)
                      </label>
                      <div className="space-y-2">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                          disabled={uploadingImage}
                        />
                        {uploadingImage && (
                          <p className="text-sm text-blue-400">Uploading image...</p>
                        )}
                        {newQuestion.questionImage && (
                          <div className="mt-2">
                            <img
                              src={`http://localhost:5000${newQuestion.questionImage}`}
                              alt="Question"
                              className="max-w-xs max-h-32 object-contain border rounded"
                            />
                            <button
                              type="button"
                              onClick={() => setNewQuestion({...newQuestion, questionImage: ''})}
                              className="ml-2 text-red-400 hover:text-red-300 text-sm"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Options
                      </label>
                      {newQuestion.options.map((option, index) => (
                        <div key={index} className="flex items-center mb-2">
                          <div className="flex items-center mr-3">
                            <input
                              type="radio"
                              id={`correct-${index}`}
                              name="correctAnswer"
                              checked={newQuestion.correctAnswer === index}
                              onChange={() => setNewQuestion({...newQuestion, correctAnswer: index})}
                              className="h-4 w-4 text-blue-600"
                            />
                            <label htmlFor={`correct-${index}`} className="ml-2 text-sm text-gray-300">
                              {String.fromCharCode(65 + index)}
                            </label>
                          </div>
                          <input
                            type="text"
                            value={option}
                            onChange={(e) => handleOptionChange(index, e.target.value)}
                            className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                            placeholder={`Option ${String.fromCharCode(65 + index)}`}
                            required
                          />
                        </div>
                      ))}
                      <p className="text-sm text-gray-400 mt-2">
                        Select the radio button next to the correct answer
                      </p>
                    </div>

                    <div className="flex space-x-3">
                      <button
                        type="submit"
                        disabled={loading}
                        className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {loading ? 'Saving...' : (editingQuestion ? 'Update Question' : 'Add Question')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowQuestionForm(false)}
                        className="bg-gray-700 text-gray-300 px-6 py-2 rounded-md hover:bg-gray-600 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Questions List */}
          <div className="space-y-4">
            {sections.map(section => {
              const sectionQuestions = questions.filter(q => q.section === section);
              return (
                <div key={section} className="border rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-100 mb-3">
                    {section} ({sectionQuestions.length} questions)
                  </h3>
                  <div className="space-y-3">
                    {sectionQuestions.map((question, index) => (
                      <div key={question._id} className="bg-gray-900 p-4 rounded-md">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-gray-100">
                            Q{index + 1}: {question.questionText}
                          </h4>
                          {question.questionImage && (
                            <img
                              src={`http://localhost:5000${question.questionImage}`}
                              alt="Question"
                              className="max-w-xs max-h-24 object-contain mt-2 border rounded"
                            />
                          )}
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEditQuestion(question)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteQuestion(question._id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {question.options.map((option, optIndex) => (
                            <div
                              key={optIndex}
                              className={`p-2 rounded ${
                                optIndex === question.correctAnswer
                                  ? 'bg-green-900 text-green-300'
                                  : 'bg-gray-800 text-gray-100'
                              }`}
                            >
                              {String.fromCharCode(65 + optIndex)}: {option}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {questions.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No questions added yet. Click "Add Question" to get started.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QuestionManager;