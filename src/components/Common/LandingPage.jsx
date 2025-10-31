import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { BookOpen, Users, Award, MoreVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ScrollingText from './ScrollingText';

const LandingPage = () => {
  const [activeCard, setActiveCard] = useState('admin');
  const [isFlipped, setIsFlipped] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check if there's a thank you parameter in the URL
    const params = new URLSearchParams(location.search);
    const hasThankYou = params.get('thank_you');
    
    if (hasThankYou) {
      setShowThankYou(true);
      // Redirect after 3 seconds
      const timer = setTimeout(() => {
        setShowThankYou(false);
        navigate('/', { replace: true });
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [location, navigate]);

  // Add Thank You overlay component
  const ThankYouMessage = () => (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
    >
      <div className="bg-white/10 backdrop-blur-md p-8 rounded-xl border border-white/20 text-center">
        <h2 className="text-2xl font-bold text-white mb-4">Thank You!</h2>
        <p className="text-gray-200">Redirecting to home page...</p>
      </div>
    </motion.div>
  );

  // Responsive menu trigger
  const KebabMenu = ({ onSelect }) => (
    <button 
      onClick={() => setIsFlipped(!isFlipped)}
      className="absolute top-2 xs:top-3 md:top-4 right-2 xs:right-3 md:right-4 
                 p-1.5 xs:p-2 md:p-2.5 rounded-full 
                 hover:bg-white/10 active:bg-white/20
                 transition-colors touch-manipulation"
      aria-label="Menu"
    >
      <MoreVertical className="h-4 xs:h-4 md:h-5 w-4 xs:w-4 md:w-5 text-gray-400" />
    </button>
  );

  // Enhanced back card with better touch targets
  const BackCard = ({ onSelect }) => (
    <motion.div
      initial={{ rotateY: 180 }}
      animate={{ rotateY: 0 }}
      exit={{ rotateY: 180 }}
      transition={{ duration: 0.6, ease: 'easeInOut' }}
      className="absolute inset-0 bg-black/30 backdrop-blur-md rounded-xl shadow-xl 
                 border border-white/10 p-3 xs:p-4 md:p-6 
                 flex flex-col justify-center items-center"
      style={{ backfaceVisibility: 'hidden' }}
    >
      <h3 className="text-base xs:text-lg md:text-xl font-bold text-white mb-3 xs:mb-4 md:mb-6">
        Switch Portal
      </h3>
      <div className="space-y-1.5 xs:space-y-2 md:space-y-4 w-full">
        {[
          { id: 'admin', icon: Users, color: 'blue', label: 'Admin Portal' },
          { id: 'student', icon: BookOpen, color: 'green', label: 'Student Portal' },
          { id: 'features', icon: Award, color: 'purple', label: 'Features' }
        ].map(({ id, icon: Icon, color, label }) => (
          <button
            key={id}
            onClick={() => {
              onSelect(id);
              setIsFlipped(false);
            }}
            className={`w-full flex items-center px-2.5 xs:px-3 md:px-4 
                       py-2 xs:py-2.5 md:py-3 
                       text-xs xs:text-sm md:text-base text-white 
                       hover:bg-${color}-600/20 active:bg-${color}-600/30
                       rounded-lg transition-colors`}
          >
            <Icon className={`h-4 xs:h-4 md:h-5 w-4 xs:w-4 md:w-5 
                            mr-2 xs:mr-2 md:mr-3 text-${color}-400`} />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </motion.div>
  );

  // Updated card styles with new responsive shape
  const cardClasses = `
    bg-black/30 backdrop-blur-md rounded-2xl shadow-xl 
    p-4 sm:p-6 lg:p-8 
    border border-white/10 
    hover:shadow-2xl transition-all duration-300
    w-full max-w-[320px] sm:max-w-[360px] lg:max-w-[400px]
    min-h-[280px] sm:min-h-[320px] lg:min-h-[360px]
    flex flex-col
  `;

  // Card content with responsive typography and spacing
  const cardContent = {
    admin: {
      icon: Users,
      color: 'blue',
      title: 'Admin Portal',
      description: 'Manage exams, create questions, monitor students, and analyze results.',
      button: {
        to: '/admin/login',
        text: 'Admin Login'
      }
    },
    student: {
      icon: BookOpen,
      color: 'green',
      title: 'Student Portal',
      description: 'Take exams in a secure environment with real-time monitoring.',
      buttons: [
        { to: '/student/login', text: 'Student Login', primary: true },
        { to: '/student/register', text: 'New Registration', primary: false }
      ]
    },
    features: {
      icon: Award,
      color: 'purple',
      title: 'Features',
      features: [
        'Full-screen exam mode',
        'Real-time monitoring',
        'Instant results',
        'Excel export',
        'Data visualization',
        'Secure authentication'
      ]
    }
  };

  // Render card based on content configuration
  const renderCard = (type) => {
    const content = cardContent[type];
    const Icon = content.icon;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className={`${cardClasses} relative`}
      >
        <KebabMenu onSelect={setActiveCard} />
        
        <div className="flex-1 flex flex-col">
          <div className="flex items-center mb-4 sm:mb-6">
            <Icon className={`w-8 sm:w-10 lg:w-12 h-8 sm:h-10 lg:h-12 
                            text-${content.color}-400`} />
            <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-white ml-3">
              {content.title}
            </h3>
          </div>

          {content.description && (
            <p className="text-gray-200 mb-4 sm:mb-6 
                         text-sm sm:text-base flex-1">
              {content.description}
            </p>
          )}

          {content.features && (
            <ul className="text-gray-200 space-y-1 sm:space-y-2 
                          text-sm sm:text-base flex-1">
              {content.features.map((feature, index) => (
                <li key={index} className="flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mr-2" />
                  {feature}
                </li>
              ))}
            </ul>
          )}

          {content.button && (
            <Link 
              to={content.button.to}
              className={`inline-block bg-${content.color}-600 text-white 
                         px-4 sm:px-5 py-2 sm:py-2.5 
                         rounded-lg hover:bg-${content.color}-700 
                         transition-colors font-semibold 
                         text-sm sm:text-base mt-auto`}
            >
              {content.button.text}
            </Link>
          )}

          {content.buttons && (
            <div className="space-y-2 sm:space-y-3 mt-auto">
              {content.buttons.map((button, index) => (
                <Link 
                  key={index}
                  to={button.to}
                  className={`block ${button.primary 
                    ? `bg-${content.color}-600 hover:bg-${content.color}-700` 
                    : 'bg-gray-700 hover:bg-gray-600'} 
                    text-white px-4 sm:px-5 py-2 sm:py-2.5 
                    rounded-lg transition-colors font-semibold 
                    text-center text-sm sm:text-base`}
                >
                  {button.text}
                </Link>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="h-screen w-full flex overflow-hidden bg-black"
    >
      {/* Show Thank You message if enabled */}
      <AnimatePresence>
        {showThankYou && <ThankYouMessage />}
      </AnimatePresence>

      {/* Left side - Image (Desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        <img
          src="/img.png"
          alt="College"
          className="object-contain w-full h-full p-8"
        />
      </div>

      {/* Right side - Content */}
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

        {/* Content Container */}
        <div className="w-full max-w-[420px] px-6 relative z-10">
          <div className="backdrop-blur-xl bg-white/5 w-full p-8 rounded-2xl shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] border border-white/10">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-white mb-2">
                MCQ Exam System
              </h1>
              <p className="text-sm text-gray-400">
                A comprehensive online examination platform for conducting multiple choice questions
              </p>
            </div>

            <div className="perspective-1000">
              <div className={`relative transition-transform duration-700 
                           transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
                <AnimatePresence mode="wait">
                  <div className={`${isFlipped ? 'invisible' : 'visible'}`}>
                    {renderCard(activeCard)}
                  </div>
                </AnimatePresence>
                
                {isFlipped && <BackCard onSelect={setActiveCard} />}
              </div>
            </div>
          </div>
        </div>

        {/* ScrollingText at bottom */}
        <div className="fixed bottom-0 left-0 right-0 w-full z-20">
          <ScrollingText />
        </div>
      </div>
    </motion.div>
  );
};

export default LandingPage;
