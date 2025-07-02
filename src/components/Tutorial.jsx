import { useState } from 'react'
import './Tutorial.css'

const Tutorial = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState(0)

  const steps = [
    {
      title: "Welcome to Campus Whisper! 🎭",
      content: "An anonymous chat app where you can create rooms and chat with others without revealing your identity.",
      icon: "🎭"
    },
    {
      title: "Set Your Username 👤",
      content: "Choose any anonymous username you like, or use our random generator for creative suggestions!",
      icon: "👤"
    },
    {
      title: "Create or Join Rooms 💬",
      content: "Create new chat rooms or join existing ones. Each room has its own conversations.",
      icon: "💬"
    },
    {
      title: "Start Chatting! 🚀",
      content: "Send messages in real-time. Your messages appear on the right, others on the left.",
      icon: "🚀"
    }
  ]

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      onClose()
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const skipTutorial = () => {
    onClose()
  }

  return (
    <div className="tutorial-overlay">
      <div className="tutorial-modal">
        <div className="tutorial-header">
          <div className="tutorial-icon">{steps[currentStep].icon}</div>
          <h3>{steps[currentStep].title}</h3>
          <button className="tutorial-close" onClick={skipTutorial}>×</button>
        </div>
        
        <div className="tutorial-content">
          <p>{steps[currentStep].content}</p>
        </div>
        
        <div className="tutorial-progress">
          {steps.map((_, index) => (
            <div 
              key={index} 
              className={`progress-dot ${index === currentStep ? 'active' : ''} ${index < currentStep ? 'completed' : ''}`}
            />
          ))}
        </div>
        
        <div className="tutorial-actions">
          <button 
            className="tutorial-btn secondary" 
            onClick={prevStep}
            disabled={currentStep === 0}
          >
            Previous
          </button>
          <button 
            className="tutorial-btn primary" 
            onClick={nextStep}
          >
            {currentStep === steps.length - 1 ? 'Get Started!' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Tutorial
