import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import mammoth from 'mammoth';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Server } from 'socket.io';
import { createServer } from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

const PORT = process.env.PORT || 5000;
const JWT_SECRET = 'mcq_exam_secret_key_2024';

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(join(__dirname, 'uploads')));
app.use(express.static(join(__dirname, '../dist')));

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, join(__dirname, 'uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '.' + file.originalname.split('.').pop());
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
        file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only DOCX and image files are allowed'));
    }
  }
});

// MongoDB Connection
mongoose.connect('mongodb://localhost:27017/NEC_EXAMS', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('Connected to MongoDB');
}).catch((error) => {
  console.error('MongoDB connection error:', error);
});

// Add connection error handler
mongoose.connection.on('error', (error) => {
  console.error('MongoDB connection error:', error);
});

// Schemas
const AdminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

// Update the StudentSchema to transform strings to uppercase before saving
const StudentSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    set: v => v.toUpperCase()
  },
  rollNumber: { 
    type: String, 
    required: true, 
    unique: true,
    set: v => v.toUpperCase()
  },
  branch: { 
    type: String, 
    required: true,
    set: v => v.toUpperCase()
  },
  section: { 
    type: String, 
    required: true,
    set: v => v.toUpperCase()
  },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const QuestionSchema = new mongoose.Schema({
  branch: { type: String, required: true },
  section: { type: String, required: true },
  year: { type: String, required: true },
  semester: { type: String, required: true },
  subject: { type: String, required: true },
  questionText: { type: String, required: true },
  questionImage: { type: String }, // Path to uploaded image
  options: [{ type: String, required: true }],
  correctAnswer: { type: Number, required: true },
  marks: { type: Number, default: 1 },
  createdAt: { type: Date, default: Date.now }
});

const ExamResultSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  rollNumber: { type: String, required: true },
  name: { type: String, required: true },
  branch: { type: String, required: true },
  section: { type: String, required: true },
  year: { type: String },
  semester: { type: String },
  subject: { type: String },
  answers: [{
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
    selectedAnswer: { type: Number, required: true },
    isCorrect: { type: Boolean, required: true }
  }],
  totalMarks: { type: Number, required: true },
  completedAt: { type: Date, default: Date.now }
});

const ExamConfigSchema = new mongoose.Schema({
  branch: { type: String, required: true },
  year: { type: String, required: true },
  semester: { type: String, required: true },
  subject: { type: String, required: true },
  numberOfStudents: { 
    type: Number, 
    required: true,
    default: 0,
    min: 0
  },
  numberOfQuestions: { type: Number, required: true },
  timeLimit: { 
    type: Number, 
    required: true,
    min: 1
  },
  totalQuestions: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

// Models
const Admin = mongoose.model('Admin', AdminSchema);
const Student = mongoose.model('Student', StudentSchema);
const Question = mongoose.model('Question', QuestionSchema);
const ExamResult = mongoose.model('ExamResult', ExamResultSchema);
const ExamConfig = mongoose.model('ExamConfig', ExamConfigSchema);

// Initialize Admin
const initializeAdmin = async () => {
  try {
    const existingAdmin = await Admin.findOne({ username: 'admin' });
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash('admin@6356', 10);
      await Admin.create({
        username: 'admin',
        password: hashedPassword
      });
      console.log('Admin user created successfully');
    }
  } catch (error) {
    console.error('Error initializing admin:', error);
  }
};

// Auth Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Admin Routes
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const admin = await Admin.findOne({ username });

    if (!admin || !await bcrypt.compare(password, admin.password)) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: admin._id, role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { username: admin.username, role: 'admin' } });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update the exam configuration endpoint
app.post('/api/admin/exam-config', authenticateToken, async (req, res) => {
  try {
    const { branch, year, semester, subject, numberOfStudents, numberOfQuestions, timeLimit } = req.body;
    
    const examConfig = await ExamConfig.findOneAndUpdate(
      { branch, year, semester, subject },
      { 
        branch,
        year,
        semester, 
        subject,
        numberOfStudents: parseInt(numberOfStudents) || 0, // Add this line
        numberOfQuestions: parseInt(numberOfQuestions) || 20,
        timeLimit: parseInt(timeLimit) || 60
      },
      { upsert: true, new: true }
    );

    // Emit socket event for real-time updates
    io.to('admin').emit('examUpdate', examConfig);
    io.to(`branch-${examConfig.branch}`).emit('examUpdate', examConfig);
    
    res.json(examConfig);
  } catch (error) {
    console.error('Error saving exam config:', error); // Add error logging
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/api/admin/exam-configs', authenticateToken, async (req, res) => {
  try {
    const configs = await ExamConfig.find({});
    res.json(configs);
  } catch (error) {
    console.error('Error fetching exam configs:', error);
    res.status(500).json({ 
      message: 'Failed to fetch exam configurations',
      error: error.message 
    });
  }
});

app.post('/api/admin/questions', authenticateToken, async (req, res) => {
  try {
    const { branch, section, year, semester, subject, questionText, questionImage, options, correctAnswer } = req.body;
    
    const question = new Question({
      branch,
      section,
      year,
      semester,
      subject,
      questionText,
      questionImage,
      options,
      correctAnswer,
      marks: 1
    });

    await question.save();
    
    // Emit socket event for real-time updates
    io.to('admin').emit('questionUpdate', question);
    
    res.json(question);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.post('/api/admin/upload-image', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file uploaded' });
    }
    
    // Make sure the imageUrl starts with a forward slash
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ 
      success: true,
      imageUrl,
      message: 'Image uploaded successfully'
    });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error uploading image',
      error: error.message 
    });
  }
});

app.post('/api/admin/upload-docx', authenticateToken, upload.single('docx'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No DOCX file uploaded' });
    }

    const { branch, section, year, semester, subject } = req.body;
    
    // Parse DOCX file
    const result = await mammoth.extractRawText({ path: req.file.path });
    const text = result.value;
    
    // Parse questions from text (expecting specific format)
    const questions = parseQuestionsFromText(text);
    
    const savedQuestions = [];
    
    for (const questionData of questions) {
      const question = new Question({
        branch,
        section,
        year,
        semester,
        subject,
        questionText: questionData.questionText,
        options: questionData.options,
        correctAnswer: questionData.correctAnswer,
        marks: 1
      });
      
      await question.save();
      savedQuestions.push(question);
    }
    
    // Update exam config total questions
    await ExamConfig.findOneAndUpdate(
      { branch, year, semester, subject },
      { $inc: { totalQuestions: savedQuestions.length } },
      { upsert: true }
    );
    
    res.json({ 
      message: `${savedQuestions.length} questions uploaded successfully`,
      questions: savedQuestions 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Helper function to parse questions from DOCX text
function parseQuestionsFromText(text) {
  const questions = [];
  const lines = text.split('\n').filter(line => line.trim());
  
  let currentQuestion = null;
  let optionIndex = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check if line starts with Q followed by number
    if (line.match(/^Q\d+[:.]/)) {
      if (currentQuestion) {
        questions.push(currentQuestion);
      }
      
      currentQuestion = {
        questionText: line.replace(/^Q\d+[:.]\s*/, ''),
        options: [],
        correctAnswer: 0
      };
      optionIndex = 0;
    }
    // Check if line starts with option markers (A, B, C, D or a, b, c, d)
    else if (line.match(/^[A-Da-d][.)]/)) {
      if (currentQuestion) {
        const optionText = line.replace(/^[A-Da-d][.)]\s*/, '');
        currentQuestion.options.push(optionText);
        
        // Check if this option is marked as correct (contains *)
        if (optionText.includes('*') || line.includes('*')) {
          currentQuestion.correctAnswer = optionIndex;
          currentQuestion.options[optionIndex] = optionText.replace('*', '').trim();
        }
        
        optionIndex++;
      }
    }
    // Check for answer line (Answer: A, B, C, or D)
    else if (line.match(/^Answer:\s*[A-Da-d]/i)) {
      if (currentQuestion) {
        const answerLetter = line.match(/[A-Da-d]/)[0].toLowerCase();
        currentQuestion.correctAnswer = answerLetter.charCodeAt(0) - 97; // Convert a,b,c,d to 0,1,2,3
      }
    }
  }
  
  // Add the last question
  if (currentQuestion && currentQuestion.options.length >= 2) {
    questions.push(currentQuestion);
  }
  
  return questions;
}

app.get('/api/admin/questions/:branch/:year/:semester/:subject', authenticateToken, async (req, res) => {
  try {
    const { branch, year, semester, subject } = req.params;
    const questions = await Question.find({ 
      branch, 
      year, 
      semester, 
      subject 
    }).sort({ section: 1, createdAt: 1 });
    res.json(questions);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.put('/api/admin/questions/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const question = await Question.findByIdAndUpdate(id, updates, { new: true });
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }
    
    res.json(question);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.delete('/api/admin/questions/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const question = await Question.findByIdAndDelete(id);
    
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    // Update exam config total questions
    await ExamConfig.findOneAndUpdate(
      { 
        branch: question.branch,
        year: question.year,
        semester: question.semester,
        subject: question.subject
      },
      { $inc: { totalQuestions: -1 } }
    );

    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/api/admin/results', authenticateToken, async (req, res) => {
  try {
    // Verify admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Fetch all results using ExamResult model instead of Result
    const results = await ExamResult.find()
      .sort({ completedAt: -1 }) // Sort by completion date, newest first
      .lean(); // Convert to plain JavaScript objects

    // Format the results
    const formattedResults = results.map(result => ({
      _id: result._id,
      name: result.name,
      rollNumber: result.rollNumber,
      branch: result.branch,
      section: result.section,
      year: result.year,
      semester: result.semester,
      subject: result.subject,
      totalMarks: result.totalMarks,
      completedAt: result.completedAt
    }));

    res.json(formattedResults);
  } catch (error) {
    console.error('Error fetching results:', error);
    res.status(500).json({ 
      message: 'Server error while fetching results',
      error: error.message 
    });
  }
});
// Add this endpoint before app.listen()
app.get('/api/admin/filtered-results', authenticateToken, async (req, res) => {
  try {
    const { branch, section, year, semester, subject } = req.query;
    
    // Build query object
    const query = {};
    if (branch) query.branch = branch;
    if (section) query.section = section;
    if (year) query.year = year;
    if (semester) query.semester = semester;
    if (subject) query.subject = subject;

    // Fetch results
    const results = await ExamResult.find(query).sort({ completedAt: -1 });

    // Calculate statistics
    const averageMarks = results.length > 0 ? (results.reduce((sum, r) => sum + r.totalMarks, 0) / results.length).toFixed(2) : 0;

    const stats = {
      avgMarks: averageMarks,
      highestMarks: Math.max(...results.map(r => r.totalMarks)),
      lowestMarks: Math.min(...results.map(r => r.totalMarks)),
    };

    // Calculate branch and section stats
    const branchStats = {};
    const sectionStats = {};

    results.forEach(result => {
      // Branch stats
      if (!branchStats[result.branch]) {
        branchStats[result.branch] = { total: 0, count: 0, highest: 0 };
      }
      branchStats[result.branch].total += result.totalMarks;
      branchStats[result.branch].count++;
      branchStats[result.branch].highest = Math.max(
        branchStats[result.branch].highest,
        result.totalMarks
      );

      // Section stats
      if (!sectionStats[result.section]) {
        sectionStats[result.section] = { total: 0, count: 0, highest: 0 };
      }
      sectionStats[result.section].total += result.totalMarks;
      sectionStats[result.section].count++;
      sectionStats[result.section].highest = Math.max(
        sectionStats[result.section].highest,
        result.totalMarks
      );
    });

    // Calculate averages
    Object.keys(branchStats).forEach(branch => {
      branchStats[branch].avg = (
        branchStats[branch].total / branchStats[branch].count
      ).toFixed(2);
    });

    Object.keys(sectionStats).forEach(section => {
      sectionStats[section].avg = (
        sectionStats[section].total / sectionStats[section].count
      ).toFixed(2);
    });

    res.json({
      results,
      stats,
      branchStats,
      sectionStats
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching results' });
  }
});

// Helper functions for calculating stats
function calculateBranchStats(results) {
  const branchStats = {};
  results.forEach(result => {
    if (!branchStats[result.branch]) {
      branchStats[result.branch] = {
        count: 0,
        totalMarks: 0,
        highest: 0
      };
    }
    branchStats[result.branch].count++;
    branchStats[result.branch].totalMarks += result.totalMarks;
    branchStats[result.branch].highest = Math.max(
      branchStats[result.branch].highest, 
      result.totalMarks
    );
  });

  // Calculate averages
  Object.keys(branchStats).forEach(branch => {
    branchStats[branch].avg = (
      branchStats[branch].totalMarks / branchStats[branch].count
    ).toFixed(2);
  });

  return branchStats;
}

function calculateSectionStats(results) {
  const sectionStats = {};
  results.forEach(result => {
    if (!sectionStats[result.section]) {
      sectionStats[result.section] = {
        count: 0,
        totalMarks: 0,
        highest: 0
      };
    }
    sectionStats[result.section].count++;
    sectionStats[result.section].totalMarks += result.totalMarks;
    sectionStats[result.section].highest = Math.max(
      sectionStats[result.section].highest, 
      result.totalMarks
    );
  });

  // Calculate averages
  Object.keys(sectionStats).forEach(section => {
    sectionStats[section].avg = (
      sectionStats[section].totalMarks / sectionStats[section].count
    ).toFixed(2);
  });

  return sectionStats;
}
// Add this new endpoint before app.listen()
app.get('/api/admin/filter-options', authenticateToken, async (req, res) => {
  try {
    // Get unique values from your database using both Student and Question collections
    const branches = await Student.distinct('branch');
    const sections = await Student.distinct('section');
    
    // Get years and semesters from ExamConfig
    const years = await ExamConfig.distinct('year');
    const semesters = await ExamConfig.distinct('semester');
    const subjects = await ExamConfig.distinct('subject');

    // Add default values if none found
    const defaultYears = ['1', '2', '3', '4'];
    const defaultSemesters = ['1', '2', '3', '4', '5', '6', '7', '8'];

    res.json({
      branches: branches.filter(Boolean).sort(),
      sections: sections.filter(Boolean).sort(),
      years: years.length ? years.sort() : defaultYears,
      semesters: semesters.length ? semesters.sort() : defaultSemesters,
      subjects: subjects.filter(Boolean).sort()
    });

    console.log('Filter options:', {
      branches: branches.length,
      sections: sections.length,
      years: years.length,
      semesters: semesters.length,
      subjects: subjects.length
    });

  } catch (error) {
    console.error('Error fetching filter options:', error);
    res.status(500).json({ 
      message: 'Error fetching filter options',
      error: error.message 
    });
  }
});
app.get('/api/admin/statistics', authenticateToken, async (req, res) => {
  try {
    const totalStudents = await Student.countDocuments();
    const completedExams = await ExamResult.countDocuments();
    const totalQuestions = await Question.countDocuments();
    
    const branchStats = await ExamResult.aggregate([
      {
        $group: {
          _id: '$branch',
          count: { $sum: 1 },
          avgMarks: { $avg: '$totalMarks' }
        }
      }
    ]);

    const sectionStats = await ExamResult.aggregate([
      {
        $group: {
          _id: '$section',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      totalStudents,
      completedExams,
      totalQuestions,
      branchStats,
      sectionStats,
      completionRate: totalStudents > 0 ? (completedExams / totalStudents) * 100 : 0
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Student Routes
app.post('/api/student/register', async (req, res) => {
  try {
    const { name, rollNumber, branch, section, password } = req.body;
    
    // Remove spaces and convert to uppercase
    const sanitizedRollNumber = rollNumber.replace(/\s+/g, '').toUpperCase();
    
    // Check for empty roll number after sanitization
    if (!sanitizedRollNumber) {
      return res.status(400).json({ message: 'Roll number is required' });
    }

    const existingStudent = await Student.findOne({ 
      rollNumber: sanitizedRollNumber 
    });
    
    if (existingStudent) {
      return res.status(400).json({ message: 'Roll number already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const student = new Student({
      name: name.trim().toUpperCase(),
      rollNumber: sanitizedRollNumber,
      branch: branch.trim().toUpperCase(),
      section: section.trim().toUpperCase(),
      password: hashedPassword
    });

    await student.save();
    res.json({ message: 'Registration successful' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add this route before the registration route
app.get('/api/student/check-rollnumber/:rollNumber', async (req, res) => {
  try {
    const { rollNumber } = req.params;
    const existingStudent = await Student.findOne({ 
      rollNumber: rollNumber.toUpperCase() 
    });
    
    res.json({ 
      exists: !!existingStudent 
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
});

app.post('/api/student/login', async (req, res) => {
  try {
    const { rollNumber, password } = req.body;
    const student = await Student.findOne({ 
      rollNumber: rollNumber.toUpperCase() 
    });

    if (!student || !await bcrypt.compare(password, student.password)) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: student._id, role: 'student', rollNumber: student.rollNumber },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: student._id,
        name: student.name,
        rollNumber: student.rollNumber,
        branch: student.branch,
        section: student.section,
        role: 'student'
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/api/student/exam/:branch/:year/:semester/:subject', authenticateToken, async (req, res) => {
  try {
    const { branch, year, semester, subject } = req.params;
    
    const examConfig = await ExamConfig.findOne({ 
      branch, year, semester, subject 
    });

    if (!examConfig) {
      return res.status(404).json({ message: 'Exam configuration not found' });
    }

    // Get all questions
    const allQuestions = await Question.find({ 
      branch, 
      year, 
      semester, 
      subject 
    }).select('-correctAnswer');

    // Create array of indices and shuffle them
    const indices = Array.from({ length: allQuestions.length }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    // Take only the configured number of questions
    const finalQuestions = indices
      .slice(0, examConfig.numberOfQuestions)
      .map(index => allQuestions[index]);

    // Get sections from selected questions
    const sections = [...new Set(finalQuestions.map(q => q.section))].sort();
    
    res.json({ 
      questions: finalQuestions,
      sections,
      examConfig: {
        subject: examConfig.subject,
        year: examConfig.year,
        semester: examConfig.semester,
        numberOfQuestions: examConfig.numberOfQuestions,
        timeLimit: examConfig.timeLimit, // Send time in minutes
        totalQuestionsInPool: allQuestions.length
      }
    });
  } catch (error) {
    console.error('Error in exam generation:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update the available-exams endpoint
app.get('/api/student/available-exams', authenticateToken, async (req, res) => {
  try {
    const { branch, year, semester } = req.query;
    
    console.log('Query:', { branch, year, semester }); // Debug log

    const query = { branch };
    if (year) query.year = year;
    if (semester) query.semester = semester;

    const examConfigs = await ExamConfig.find(query).lean();

    console.log('Found configs:', examConfigs); // Debug log

    const formattedExams = examConfigs.map(config => {
      const timeInMinutes = Math.ceil(config.timeLimit / 60);
      console.log(`Time for ${config.subject}: ${config.timeLimit}s = ${timeInMinutes}m`); // Debug log
      
      return {
        _id: config._id,
        branch: config.branch,
        year: config.year,
        semester: config.semester,
        subject: config.subject,
        examConfig: {
          numberOfQuestions: config.numberOfQuestions || 0,
          timeLimit: config.timeLimit || 0,
          displayTime: timeInMinutes
        }
      };
    });

    console.log('Formatted exams:', formattedExams); // Debug log
    res.json(formattedExams);
  } catch (error) {
    console.error('Error in available-exams:', error);
    res.status(500).json({ message: 'Error fetching available exams' });
  }
});

// Get completed exams
app.get('/api/student/completed-exams', async (req, res) => {
  try {
    const { rollNumber } = req.query;
    
    const completedExams = await ExamResult.find({
      rollNumber: rollNumber
    }).lean();

    res.json(completedExams);
  } catch (error) {
    console.error('Error fetching completed exams:', error);
    res.status(500).json({ message: 'Error fetching completed exams' });
  }
});

app.post('/api/student/submit-exam', authenticateToken, async (req, res) => {
  try {
    const { answers, examConfig } = req.body;
    const student = await Student.findById(req.user.id);
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Check if student already submitted
    const existingResult = await ExamResult.findOne({ 
      studentId: student._id,
      branch: examConfig.branch,
      year: examConfig.year,
      semester: examConfig.semester,
      subject: examConfig.subject
    });
    
    if (existingResult) {
      return res.status(400).json({ message: 'Exam already submitted' });
    }

    let totalMarks = 0;
    const processedAnswers = [];

    for (const answer of answers) {
      const question = await Question.findById(answer.questionId);
      if (question) {
        const isCorrect = question.correctAnswer === answer.selectedAnswer;
        if (isCorrect) {
          totalMarks += question.marks;
        }
        
        processedAnswers.push({
          questionId: answer.questionId,
          selectedAnswer: answer.selectedAnswer,
          isCorrect
        });
      }
    }

    const result = new ExamResult({
      studentId: student._id,
      rollNumber: student.rollNumber,
      name: student.name,
      branch: student.branch,
      section: student.section,
      year: examConfig.year,
      semester: examConfig.semester,
      subject: examConfig.subject,
      answers: processedAnswers,
      totalMarks
    });

    await result.save();
    
    // Emit socket event for real-time updates
    io.to('admin').emit('resultUpdate', result);
    io.to(`student-${student._id}`).emit('resultUpdate', result);
    
    res.json({ message: 'Exam submitted successfully', totalMarks });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add or update this route before app.listen()
app.delete('/api/admin/exam-config/:id', authenticateToken, async (req, res) => {
  try {
    // First find the config
    const config = await ExamConfig.findById(req.params.id);
    if (!config) {
      return res.status(404).json({ 
        success: false,
        message: 'Exam configuration not found' 
      });
    }

    // Delete all associated questions first
    await Question.deleteMany({
      branch: config.branch,
      year: config.year,
      semester: config.semester,
      subject: config.subject
    });

    // Delete all associated exam results
    await ExamResult.deleteMany({
      branch: config.branch,
      year: config.year,
      semester: config.semester,
      subject: config.subject
    });

    // Finally delete the config itself
    await ExamConfig.deleteOne({ _id: req.params.id });

    res.json({ 
      success: true,
      message: 'Exam configuration and all associated data deleted successfully' 
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error deleting exam configuration',
      error: error.message 
    });
  }
});

// Helper function to validate MongoDB ObjectId
const validateMongoId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: error.message
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  initializeAdmin();
});

// Student completed exams route
app.get('/api/student/completed-exams/:rollNumber', authenticateToken, async (req, res) => {
  try {
    const { rollNumber } = req.params;
    
    // Find all completed exams for this student
    const completedExams = await ExamResult.find({ 
      rollNumber: rollNumber 
    }).select('branch year semester subject -_id');
    
    res.json(completedExams);
  } catch (error) {
    console.error('Error fetching completed exams:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// Socket.IO middleware for authentication
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error'));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (error) {
    next(new Error('Authentication error'));
  }
});

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Join room based on user role
  const userRoom = socket.user.role === 'admin' ? 'admin' : `student-${socket.user.id}`;
  socket.join(userRoom);

  // Handle exam updates
  socket.on('examUpdate', async (data) => {
    try {
      const examConfig = await ExamConfig.findByIdAndUpdate(
        data._id,
        data,
        { new: true }
      );

      io.to('admin').emit('examUpdate', examConfig);
      io.to(`branch-${examConfig.branch}`).emit('examUpdate', examConfig);
    } catch (error) {
      console.error('Error handling exam update:', error);
    }
  });

  // Handle result updates
  socket.on('resultUpdate', async (data) => {
    try {
      const result = await ExamResult.findByIdAndUpdate(
        data._id,
        data,
        { new: true }
      );

      io.to('admin').emit('resultUpdate', result);
      io.to(`student-${result.studentId}`).emit('resultUpdate', result);
    } catch (error) {
      console.error('Error handling result update:', error);
    }
  });

  // Handle question updates
  socket.on('questionUpdate', async (data) => {
    try {
      const question = await Question.findByIdAndUpdate(
        data._id,
        data,
        { new: true }
      );

      io.to('admin').emit('questionUpdate', question);
    } catch (error) {
      console.error('Error handling question update:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Add this endpoint before your other routes
app.get('/api/exams/filters', async (req, res) => {
  try {
    // Get unique years and semesters from ExamConfig collection
    const examConfigs = await ExamConfig.aggregate([
      {
        $group: {
          _id: null,
          years: { $addToSet: '$year' },
          semesters: { $addToSet: '$semester' }
        }
      },
      {
        $project: {
          _id: 0,
          years: { $sortArray: { input: '$years', sortBy: 1 } },
          semesters: { $sortArray: { input: '$semesters', sortBy: 1 } }
        }
      }
    ]);

    // If no configs found, return empty arrays
    if (!examConfigs.length) {
      return res.json({
        years: [],
        semesters: []
      });
    }

    res.json({
      years: examConfigs[0].years,
      semesters: examConfigs[0].semesters
    });

  } catch (error) {
    console.error('Error fetching filters:', error);
    res.status(500).json({ 
      message: 'Error fetching filters',
      error: error.message 
    });
  }
});

// Update the student results endpoint
app.get('/api/student/results', authenticateToken, async (req, res) => {
  try {
    const { rollNumber } = req.query;
    
    if (!rollNumber) {
      return res.status(400).json({ 
        message: 'Roll number is required'
      });
    }

    const results = await ExamResult.find({ 
      rollNumber: rollNumber 
    })
    .select({
      subject: 1,
      year: 1,
      semester: 1,
      totalMarks: 1,
      completedAt: 1,
      answers: 1
    })
    .sort({ completedAt: -1 })
    .lean();

    // Calculate only necessary stats
    const formattedResults = results.map(result => ({
      ...result,
      totalQuestions: result.answers?.length || 0,
      correctAnswers: result.answers?.filter(a => a.isCorrect)?.length || 0,
      wrongAnswers: result.answers?.filter(a => !a.isCorrect)?.length || 0
    }));

    console.log('Sending results:', formattedResults);
    res.json(formattedResults);

  } catch (error) {
    console.error('Error fetching student results:', error);
    res.status(500).json({ 
      message: 'Error fetching results',
      error: error.message 
    });
  }
});

// Update or verify the semesters endpoint
app.get('/api/admin/semesters', authenticateToken, async (req, res) => {
  try {
    const { year } = req.query;
    
    if (!year) {
      return res.status(400).json({ 
        message: 'Year parameter is required',
        semesters: [] 
      });
    }

    // First try to get semesters from ExamConfig
    let semesters = await ExamConfig.distinct('semester', { year });
    
    // If no results from ExamConfig, try ExamResult
    if (!semesters.length) {
      semesters = await ExamResult.distinct('semester', { year });
    }

    // If still no results, return default semesters based on year
    if (!semesters.length) {
      switch(year) {
        case '1': semesters = ['1', '2']; break;
        case '2': semesters = ['3', '4']; break;
        case '3': semesters = ['5', '6']; break;
        case '4': semesters = ['7', '8']; break;
        default: semesters = [];
      }
    }

    // Sort semesters numerically
    semesters.sort((a, b) => Number(a) - Number(b));

    res.json({
      semesters: semesters
    });

  } catch (error) {
    console.error('Error fetching semesters:', error);
    res.status(500).json({ 
      message: 'Error fetching semesters',
      error: error.message,
      semesters: []
    });
  }
});

// New endpoint for student suggestions
app.get('/api/admin/student-suggestions', authenticateToken, async (req, res) => {
  try {
    const { query } = req.query;
    
    const students = await Student.find({
      $or: [
        { rollNumber: { $regex: query, $options: 'i' } },
        { name: { $regex: query, $options: 'i' } }
      ]
    })
    .select('name rollNumber')
    .limit(5);

    res.json(students);
  } catch (error) {
    console.error('Error fetching student suggestions:', error);
    res.status(500).json({ message: 'Error fetching suggestions' });
  }
});

// New endpoint for student analytics
app.get('/api/admin/student-analytics', authenticateToken, async (req, res) => {
  try {
    const { branch, section, year, semester, subject } = req.query;
    
    const query = {};
    if (branch) query.branch = branch;
    if (section) query.section = section;
    if (year) query.year = year;
    if (semester) query.semester = semester;
    if (subject) query.subject = subject;

    const results = await ExamResult.find(query)
      .populate('student', 'name rollNumber')
      .sort({ completedAt: -1 });

    const analytics = {
      scoreDistribution: {
        excellent: results.filter(r => r.totalMarks >= 75).length,
        good: results.filter(r => r.totalMarks >= 60 && r.totalMarks < 75).length,
        average: results.filter(r => r.totalMarks >= 50 && r.totalMarks < 60).length,
        poor: results.filter(r => r.totalMarks < 50).length
      },
      branchPerformance: {},
      subjectPerformance: {},
      timelineData: results.map(r => ({
        date: r.completedAt,
        score: r.totalMarks,
        student: r.student.name,
        rollNumber: r.student.rollNumber
      }))
    };

    // Calculate branch-wise performance
    const branches = [...new Set(results.map(r => r.branch))];
    branches.forEach(branch => {
      const branchResults = results.filter(r => r.branch === branch);
      analytics.branchPerformance[branch] = {
        averageScore: branchResults.reduce((acc, curr) => acc + curr.totalMarks, 0) / branchResults.length,
        studentCount: branchResults.length
      };
    });

    // Calculate subject-wise performance
    const subjects = [...new Set(results.map(r => r.subject))];
    subjects.forEach(subject => {
      const subjectResults = results.filter(r => r.subject === subject);
      analytics.subjectPerformance[subject] = {
        averageScore: subjectResults.reduce((acc, curr) => acc + curr.totalMarks, 0) / subjectResults.length,
        studentCount: subjectResults.length
      };
    });

    res.json(analytics);
  } catch (error) {
    console.error('Error fetching student analytics:', error);
    res.status(500).json({ message: 'Error fetching analytics' });
  }
});

// Add this route in your server/index.js file
app.get('/api/admin/student-details/:rollNumber', authenticateToken, async (req, res) => {
  try {
    const { rollNumber } = req.params;
    const student = await Student.findOne({ rollNumber })
      .select('name rollNumber branch section password');
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    res.json({
      id: student._id,
      name: student.name,
      rollNumber: student.rollNumber,
      branch: student.branch,
      section: student.section,
      password: '••••••••' // Don't send actual password
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching student details' });
  }
});

// Add these routes before app.listen()

// Update student details
app.put('/api/admin/update-student/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // If password is provided, hash it
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    } else {
      delete updates.password; // Don't update password if not provided
    }

    const student = await Student.findByIdAndUpdate(
      id,
      updates,
      { new: true }
    ).select('-password');

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    res.json(student);
  } catch (error) {
    res.status(500).json({ message: 'Error updating student' });
  }
});

// Delete student
app.delete('/api/admin/delete-student/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const student = await Student.findByIdAndDelete(id);
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Also delete associated exam results
    await ExamResult.deleteMany({ studentId: id });

    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting student' });
  }
});

// Add this endpoint before app.listen()
app.get('/api/admin/exam-attempts', authenticateToken, async (req, res) => {
  try {
    const { branch, year, semester, section, subject } = req.query;

    // Get all students in the specified branch and section
    const allStudents = await Student.find({
      branch,
      section
    }).lean();

    // Get students who attempted the exam
    const attemptedResults = await ExamResult.find({
      branch,
      year,
      semester,
      subject,
      section
    }).lean();

    // Create attempted students list with scores
    const attempted = attemptedResults.map(result => ({
      _id: result._id,
      rollNumber: result.rollNumber,
      name: result.name,
      score: Math.round((result.totalMarks / result.answers.length) * 100),
      attemptDate: result.completedAt
    }));

    // Create not attempted students list
    const attemptedRollNumbers = new Set(attempted.map(s => s.rollNumber));
    const notAttempted = allStudents
      .filter(student => !attemptedRollNumbers.has(student.rollNumber))
      .map(({ _id, rollNumber, name, section }) => ({
        _id,
        rollNumber,
        name,
        section
      }));

    res.json({
      attempted,
      notAttempted
    });

  } catch (error) {
    console.error('Error fetching exam attempts:', error);
    res.status(500).json({ 
      message: 'Error fetching exam attempts',
      error: error.message 
    });
  }
});

// Add this endpoint to fetch sections and subjects
app.get('/api/admin/sections-subjects', authenticateToken, async (req, res) => {
  try {
    const { branch, year, semester } = req.query;

    const sections = await Student.distinct('section', { branch });
    const subjects = await ExamConfig.distinct('subject', { 
      branch,
      year,
      semester
    });

    res.json({
      sections: sections.sort(),
      subjects: subjects.sort()
    });

  } catch (error) {
    console.error('Error fetching sections and subjects:', error);
    res.status(500).json({ 
      message: 'Error fetching sections and subjects',
      error: error.message 
    });
  }
});
// Add this endpoint before app.listen()
app.delete('/api/admin/exam-result/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // First get the result to find student and exam details
    const result = await ExamResult.findById(id);
    
    if (!result) {
      return res.status(404).json({ 
        success: false,
        message: 'Exam result not found' 
      });
    }

    // Delete all results for this student for this specific exam
    await ExamResult.deleteMany({
      rollNumber: result.rollNumber,
      branch: result.branch,
      year: result.year,
      semester: result.semester,
      subject: result.subject
    });

    // Emit socket event to update UI
    io.to('admin').emit('resultUpdate', {
      type: 'delete',
      studentRollNumber: result.rollNumber,
      examDetails: {
        branch: result.branch,
        year: result.year,
        semester: result.semester,
        subject: result.subject
      }
    });

    res.json({ 
      success: true,
      message: 'Exam results deleted successfully. Student can now reattempt the exam.'
    });
    
  } catch (error) {
    console.error('Delete result error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error deleting exam result',
      error: error.message 
    });
  }
});

// Backend route example (Node.js/Express)
app.get('/api/student/exam-status/:branch/:year/:semester/:subject', async (req, res) => {
  try {
    const { branch, year, semester, subject } = req.params;
    const { rollNumber } = req.query;

    // Check if student has any previous attempts
    const previousAttempt = await ExamResult.findOne({
      branch,
      year,
      semester,
      subject,
      rollNumber,
      isDeleted: true // Assuming you mark deleted results instead of actually deleting them
    });

    // If there's a deleted previous attempt, this is a reattempt
    res.json({ isReattempt: !!previousAttempt });
  } catch (error) {
    console.error('Error checking exam status:', error);
    res.status(500).json({ error: 'Failed to check exam status' });
  }
});
