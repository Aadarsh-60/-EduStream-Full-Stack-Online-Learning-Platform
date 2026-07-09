import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { courseAPI } from '../../services/api.js';
import { MessageCircle, Send, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function CourseQA({ courseId, isEnrolled }) {
  const { user } = useAuth();
  const [qaList, setQaList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newQuestion, setNewQuestion] = useState('');
  const [replyText, setReplyText] = useState({}); // { qaId: 'text' }
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchQA();
  }, [courseId]);

  const fetchQA = async () => {
    try {
      const res = await courseAPI.getQA(courseId);
      setQaList(res.data.data.qaList);
    } catch (err) {
      console.error(err);
      setError('Failed to load Q&A');
    } finally {
      setLoading(false);
    }
  };

  const handleAskQuestion = async (e) => {
    e.preventDefault();
    if (!newQuestion.trim()) return;
    setSubmitting(true);
    try {
      const res = await courseAPI.askQuestion(courseId, newQuestion);
      setQaList([res.data.data.qa, ...qaList]);
      setNewQuestion('');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to post question');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (qaId) => {
    const text = replyText[qaId];
    if (!text || !text.trim()) return;
    try {
      const res = await courseAPI.replyToQuestion(courseId, qaId, text);
      // Update specific qa
      setQaList(qaList.map(qa => qa._id === qaId ? res.data.data.qa : qa));
      setReplyText(prev => ({ ...prev, [qaId]: '' }));
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to post reply');
    }
  };

  if (loading) return <div className="text-muted">Loading Q&A...</div>;

  return (
    <div style={{ marginTop: 20 }}>
      <h3 style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
        <MessageCircle size={24} color="var(--indigo)" /> 
        Course Q&A ({qaList.length})
      </h3>

      {error && <div style={{ color: 'var(--danger)', marginBottom: 16 }}>{error}</div>}

      {/* Ask Question Box */}
      {isEnrolled || user?.role === 'admin' || user?.role === 'instructor' ? (
        <form onSubmit={handleAskQuestion} style={{ marginBottom: 30 }}>
          <div style={{ position: 'relative' }}>
            <textarea
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="Have a question about this course? Ask the instructor..."
              rows={3}
              style={{
                width: '100%', padding: '16px 20px', borderRadius: 12, border: '1px solid var(--border)',
                background: 'var(--navy-600)', color: '#fff', fontSize: '1rem', resize: 'vertical'
              }}
            />
            <button
              type="submit"
              disabled={submitting || !newQuestion.trim()}
              style={{
                position: 'absolute', bottom: 16, right: 16,
                background: 'var(--indigo)', color: '#fff', border: 'none', borderRadius: 8,
                padding: '8px 16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
                cursor: submitting || !newQuestion.trim() ? 'not-allowed' : 'pointer',
                opacity: submitting || !newQuestion.trim() ? 0.5 : 1
              }}
            >
              <Send size={16} /> {submitting ? 'Posting...' : 'Ask'}
            </button>
          </div>
        </form>
      ) : (
        <div style={{ background: 'var(--navy-600)', padding: 16, borderRadius: 12, marginBottom: 30, color: 'var(--muted)' }}>
          You must be enrolled in this course to ask a question.
        </div>
      )}

      {/* Q&A List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {qaList.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontStyle: 'italic' }}>No questions have been asked yet. Be the first!</p>
        ) : (
          qaList.map((qa) => (
            <div key={qa._id} style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
              {/* Question Header */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--indigo)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <User size={20} color="#fff" />
                </div>
                <div>
                  <h4 style={{ margin: 0, color: '#fff', fontSize: '1.05rem' }}>{qa.user.name}</h4>
                  <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                    {formatDistanceToNow(new Date(qa.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </div>
              
              {/* Question Body */}
              <p style={{ color: 'var(--lavender)', fontSize: '1rem', lineHeight: 1.6, marginBottom: 20 }}>
                {qa.question}
              </p>

              {/* Replies Section */}
              <div style={{ marginLeft: 20, paddingLeft: 20, borderLeft: '2px solid var(--border)' }}>
                {qa.replies.map((reply, idx) => (
                  <div key={idx} style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, color: reply.user.role === 'instructor' ? 'var(--gold)' : '#fff', fontSize: '0.9rem' }}>
                        {reply.user.name} {reply.user.role === 'instructor' && '(Instructor)'}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                        {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <p style={{ margin: 0, color: 'var(--lavender)', fontSize: '0.95rem' }}>{reply.text}</p>
                  </div>
                ))}

                {/* Reply Input */}
                {(isEnrolled || user?.role === 'admin' || user?.role === 'instructor') && (
                  <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                    <input
                      type="text"
                      placeholder="Add a reply..."
                      value={replyText[qa._id] || ''}
                      onChange={(e) => setReplyText({ ...replyText, [qa._id]: e.target.value })}
                      style={{
                        flex: 1, padding: '10px 16px', borderRadius: 20, border: '1px solid var(--border)',
                        background: 'var(--navy-600)', color: '#fff', outline: 'none'
                      }}
                    />
                    <button
                      onClick={() => handleReply(qa._id)}
                      disabled={!replyText[qa._id]?.trim()}
                      style={{
                        background: 'var(--indigo)', color: '#fff', border: 'none', borderRadius: 20, padding: '0 20px',
                        cursor: replyText[qa._id]?.trim() ? 'pointer' : 'not-allowed', opacity: replyText[qa._id]?.trim() ? 1 : 0.5
                      }}
                    >
                      Reply
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
