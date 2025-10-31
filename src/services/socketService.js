import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.subscribers = {
      examUpdate: new Set(),
      resultUpdate: new Set(),
      questionUpdate: new Set(),
      activeStudents: new Set(),
      examStatus: new Set()
    };
  }

  connect() {
    if (!this.socket) {
      const token = localStorage.getItem('token');
      this.socket = io('http://192.168.29.44:5000', {
        auth: { token },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });

      // Set up event listeners
      this.setupEventListeners();
      this.setupReconnection();
    }
  }

  setupEventListeners() {
    // Exam updates
    this.socket.on('examUpdate', (data) => {
      this.subscribers.examUpdate.forEach(callback => callback(data));
    });

    // Result updates
    this.socket.on('resultUpdate', (data) => {
      this.subscribers.resultUpdate.forEach(callback => callback(data));
    });

    // Question updates
    this.socket.on('questionUpdate', (data) => {
      this.subscribers.questionUpdate.forEach(callback => callback(data));
    });

    // Active students updates
    this.socket.on('activeStudents', (data) => {
      this.subscribers.activeStudents.forEach(callback => callback(data));
    });

    // Exam status updates
    this.socket.on('examStatus', (data) => {
      this.subscribers.examStatus.forEach(callback => callback(data));
    });

    // Error handling
    this.socket.on('connect_error', this.handleError);
    this.socket.on('error', this.handleError);
  }

  setupReconnection() {
    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`Reconnected after ${attemptNumber} attempts`);
      this.emitUserStatus('online');
    });

    this.socket.on('reconnecting', (attemptNumber) => {
      console.log(`Reconnection attempt ${attemptNumber}`);
    });
  }

  handleError(error) {
    console.error('Socket connection error:', error);
  }

  // Emit methods
  emitUserStatus(status) {
    if (this.socket) {
      this.socket.emit('userStatus', { status });
    }
  }

  emitExamAction(action, data) {
    if (this.socket) {
      this.socket.emit('examAction', { action, ...data });
    }
  }

  // Subscribe methods
  subscribeToExamUpdates(callback) {
    this.subscribers.examUpdate.add(callback);
  }

  subscribeToResultsUpdates(callback) {
    this.subscribers.resultUpdate.add(callback);
  }

  subscribeToQuestionUpdates(callback) {
    this.subscribers.questionUpdate.add(callback);
  }

  subscribeToActiveStudents(callback) {
    this.subscribers.activeStudents.add(callback);
  }

  subscribeToExamStatus(callback) {
    this.subscribers.examStatus.add(callback);
  }

  // Unsubscribe methods
  unsubscribeFromExamUpdates(callback) {
    this.subscribers.examUpdate.delete(callback);
  }

  unsubscribeFromResultsUpdates(callback) {
    this.subscribers.resultUpdate.delete(callback);
  }

  unsubscribeFromQuestionUpdates(callback) {
    this.subscribers.questionUpdate.delete(callback);
  }

  unsubscribeFromActiveStudents(callback) {
    this.subscribers.activeStudents.delete(callback);
  }

  unsubscribeFromExamStatus(callback) {
    this.subscribers.examStatus.delete(callback);
  }

  disconnect() {
    if (this.socket) {
      this.emitUserStatus('offline');
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export default new SocketService();