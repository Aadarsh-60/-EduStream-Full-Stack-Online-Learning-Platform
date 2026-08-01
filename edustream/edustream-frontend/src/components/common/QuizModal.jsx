import React, { useState, useEffect } from 'react';
import { X, Loader2, CheckCircle, XCircle, Award, ArrowRight, RefreshCw } from 'lucide-react';

const QuizModal = ({ isOpen, onClose, courseTitle, quizData, onPass }) => {
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [answers, setAnswers] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setCurrentQuestionIdx(0);
      setSelectedAnswer(null);
      setAnswers({});
      setIsSubmitted(false);
      setScore(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (selectedAnswer !== null) {
      setAnswers(prev => ({ ...prev, [currentQuestionIdx]: selectedAnswer }));
      setSelectedAnswer(null);
      setCurrentQuestionIdx(prev => prev + 1);
    }
  };

  const handleSubmit = () => {
    const finalAnswers = { ...answers, [currentQuestionIdx]: selectedAnswer };
    setAnswers(finalAnswers);
    
    let calculatedScore = 0;
    quizData.forEach((q, idx) => {
      if (finalAnswers[idx] === q.correctAnswer) calculatedScore++;
    });
    
    const finalPercentage = (calculatedScore / quizData.length) * 100;
    setScore(finalPercentage);
    setIsSubmitted(true);
  };

  const handleClaimCertificate = () => {
    onPass();
    onClose();
  };

  const modalOverlayStyle = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(10, 15, 30, 0.9)', backdropFilter: 'blur(8px)',
    zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
  };

  const modalContentStyle = {
    background: 'var(--navy-800)', borderRadius: 20, overflow: 'hidden',
    width: '100%', maxWidth: 700, boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
    display: 'flex', flexDirection: 'column', maxHeight: '90vh'
  };

  if (!quizData || quizData.length === 0) {
    return (
      <div style={modalOverlayStyle}>
        <div style={{ ...modalContentStyle, maxWidth: 400, padding: 40, alignItems: 'center', textAlign: 'center' }}>
          <Loader2 size={48} color="var(--indigo)" className="spin" style={{ marginBottom: 16 }} />
          <h3 style={{ fontSize: '1.25rem', marginBottom: 8, color: '#fff' }}>Generating AI Quiz...</h3>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>EduBot is crafting questions based on the course content.</p>
        </div>
      </div>
    );
  }

  // Submission / Results State
  if (isSubmitted) {
    const passed = score >= 70;
    return (
      <div style={modalOverlayStyle}>
        <div style={{ ...modalContentStyle, maxWidth: 450, position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 120, background: passed ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', filter: 'blur(40px)', zIndex: 0 }}></div>
          
          <button onClick={onClose} className="btn btn-ghost" style={{ position: 'absolute', top: 16, right: 16, zIndex: 10, padding: 8 }}>
            <X size={20} />
          </button>
          
          <div style={{ padding: '40px 32px', textAlign: 'center', zIndex: 1, position: 'relative' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(0,0,0,0.3)', margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
              {passed ? <Award size={40} color="var(--success)" /> : <XCircle size={40} color="var(--danger)" />}
            </div>
            
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', marginBottom: 8 }}>
              {passed ? "Congratulations!" : "Keep Trying!"}
            </h2>
            <p style={{ color: 'var(--lavender)', marginBottom: 24 }}>
              You scored <span style={{ fontWeight: 'bold', color: passed ? 'var(--success)' : 'var(--danger)' }}>{score.toFixed(0)}%</span> in the final exam.
            </p>
            
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: 16, borderRadius: 12, marginBottom: 24 }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--muted)', lineHeight: 1.5 }}>
                {passed 
                  ? "You have successfully demonstrated your knowledge for this course. Your certificate is now ready to be claimed!" 
                  : "You need at least 70% to pass and claim your certificate. Review the course material and try again."}
              </p>
            </div>
            
            {passed ? (
              <button onClick={handleClaimCertificate} className="btn btn-success" style={{ width: '100%', justifyContent: 'center', padding: '14px 20px', fontSize: '1rem', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none' }}>
                Claim Certificate <ArrowRight size={18} style={{ marginLeft: 8 }} />
              </button>
            ) : (
              <button onClick={onClose} className="btn btn-outline" style={{ width: '100%', justifyContent: 'center', padding: '14px 20px', fontSize: '1rem' }}>
                Close & Review <RefreshCw size={18} style={{ marginLeft: 8 }} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Question State
  const question = quizData[currentQuestionIdx];
  const progress = ((currentQuestionIdx) / quizData.length) * 100;

  return (
    <div style={modalOverlayStyle}>
      <div style={modalContentStyle}>
        
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', margin: 0 }}>Final Exam</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: 4 }}>{courseTitle}</p>
          </div>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: 8 }}>
            <X size={20} />
          </button>
        </div>
        
        {/* Progress Bar */}
        <div style={{ width: '100%', height: 4, background: 'rgba(0,0,0,0.5)' }}>
          <div style={{ height: '100%', background: 'var(--indigo)', width: `${progress}%`, transition: 'width 0.3s ease' }}></div>
        </div>
        
        {/* Question Area */}
        <div style={{ padding: 32, flex: 1, overflowY: 'auto' }} className="custom-scrollbar">
          <div style={{ display: 'inline-block', padding: '4px 12px', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--indigo-light)', fontSize: '0.75rem', fontWeight: 700, borderRadius: 6, marginBottom: 20 }}>
            Question {currentQuestionIdx + 1} of {quizData.length}
          </div>
          
          <h3 style={{ fontSize: '1.25rem', fontWeight: 500, color: '#fff', marginBottom: 24, lineHeight: 1.5 }}>
            {question.question}
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {question.options.map((option, idx) => {
              const isSelected = selectedAnswer === option;
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedAnswer(option)}
                  style={{
                    width: '100%', textAlign: 'left', padding: '16px 20px', borderRadius: 12,
                    display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    background: isSelected ? 'rgba(99, 102, 241, 0.1)' : 'rgba(0,0,0,0.2)',
                    border: `1px solid ${isSelected ? 'var(--indigo)' : 'var(--border)'}`,
                    color: isSelected ? '#fff' : 'var(--lavender)'
                  }}
                >
                  <div style={{ 
                    width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                    border: `1.5px solid ${isSelected ? 'var(--indigo)' : 'var(--muted)'}`,
                    background: isSelected ? 'var(--indigo)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {isSelected && <CheckCircle size={14} color="#fff" />}
                  </div>
                  <span style={{ fontSize: '0.95rem', lineHeight: 1.4 }}>{option}</span>
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Footer Actions */}
        <div style={{ padding: '20px 32px', borderTop: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
            Score 70% or higher to pass
          </span>
          
          {currentQuestionIdx < quizData.length - 1 ? (
            <button
              onClick={handleNext}
              disabled={selectedAnswer === null}
              className="btn btn-primary"
              style={{ opacity: selectedAnswer === null ? 0.5 : 1, padding: '10px 24px' }}
            >
              Next <ArrowRight size={16} style={{ marginLeft: 6 }} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={selectedAnswer === null}
              className="btn btn-primary"
              style={{ opacity: selectedAnswer === null ? 0.5 : 1, padding: '10px 24px', background: 'linear-gradient(135deg, var(--indigo), var(--indigo-dark))' }}
            >
              Submit Exam
            </button>
          )}
        </div>
        
      </div>
    </div>
  );
};

export default QuizModal;
