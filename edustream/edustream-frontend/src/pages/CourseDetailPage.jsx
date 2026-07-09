import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Play, Clock, Users, Star, CheckCircle, Lock, ChevronDown, ChevronUp, ShoppingCart, BookOpen, Heart, Award } from 'lucide-react';
import { courseAPI, reviewAPI, paymentAPI, userAPI } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';
import CourseQA from '../components/course/CourseQA.jsx';

const fmtDur = (s) => { const h = Math.floor(s/3600), m = Math.floor((s%3600)/60); return h ? `${h}h ${m}m` : `${m}m`; };

export default function CourseDetailPage() {
  const { id } = useParams();
  const { user, profile, setProfile } = useAuth();
  const navigate = useNavigate();

  const [course,     setCourse]     = useState(null);
  const [reviews,    setReviews]    = useState([]);
  const [enrolled,   setEnrolled]   = useState(false);
  const [enrollData, setEnrollData] = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [paying,     setPaying]     = useState(false);
  const [openSec,    setOpenSec]    = useState(0);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [activeTab, setActiveTab] = useState('reviews'); // 'reviews' | 'qa'

  useEffect(() => {
    Promise.all([
      courseAPI.getOne(id),
      reviewAPI.getCourseReviews(id),
      user ? courseAPI.checkEnrollment(id) : Promise.resolve({ data: { data: { isEnrolled: false } } }),
    ]).then(([c, r, e]) => {
      setCourse(c.data.data);
      setReviews(r.data.data?.reviews || []);
      setEnrolled(e.data.data?.isEnrolled || false);
      setEnrollData(e.data.data?.enrollment || null);
    }).catch(() => navigate('/courses'))
      .finally(() => setLoading(false));
  }, [id, user]);

  const handleEnroll = async () => {
    if (!user) { navigate('/login'); return; }
    if (enrolled) return;

    const price = course.discountPrice || course.price;
    if (price === 0) { toast.success('Enrolled (free course)!'); setEnrolled(true); return; }

    setPaying(true);
    try {
      const { data } = await paymentAPI.createOrder({ courseId: id, amount: price });
      const { orderId, amount, currency, keyId } = data.data;

      const options = {
        key: keyId, amount, currency,
        name: 'EduStream', description: course.title,
        order_id: orderId,
        handler: async (resp) => {
          try {
            await paymentAPI.verifyPayment({
              razorpayOrderId:   resp.razorpay_order_id,
              razorpayPaymentId: resp.razorpay_payment_id,
              razorpaySignature: resp.razorpay_signature,
            });
            toast.success('🎉 Enrolled successfully!');
            setEnrolled(true);
          } catch { toast.error('Payment verification failed'); }
        },
        theme: { color: '#6C63FF' },
      };

      if (window.Razorpay) {
        new window.Razorpay(options).open();
      } else {
        // Load Razorpay script dynamically
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => new window.Razorpay(options).open();
        document.body.appendChild(script);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to initiate payment');
    } finally { setPaying(false); }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reviewForm.comment.trim()) return toast.error('Please write a comment');
    setSubmittingReview(true);
    try {
      await reviewAPI.addReview({ courseId: id, rating: reviewForm.rating, comment: reviewForm.comment });
      toast.success('Review submitted successfully!');
      setReviewForm({ rating: 5, comment: '' });
      // Fetch reviews again to show the new one
      const r = await reviewAPI.getCourseReviews(id);
      setReviews(r.data.data?.reviews || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) return (
    <div style={{ paddingTop: 88, minHeight: '100vh' }}>
      <div className="container" style={{ paddingTop: 32 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 32 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: i===1 ? 60 : 40, borderRadius: 10 }} />)}
          </div>
          <div className="skeleton" style={{ height: 400, borderRadius: 16 }} />
        </div>
      </div>
    </div>
  );

  if (!course) return null;
  const price = course.discountPrice || course.price;
  const hasDiscount = course.discountPrice && course.discountPrice < course.price;

  const isWishlisted = profile?.wishlist?.includes(course._id);

  const handleWishlist = async () => {
    if (!user) return toast.error('Please login to add to wishlist');
    try {
      const newWishlist = isWishlisted 
        ? profile.wishlist.filter(id => id !== course._id)
        : [...(profile.wishlist || []), course._id];
      setProfile({ ...profile, wishlist: newWishlist });
      
      const { data } = await userAPI.toggleWishlist(course._id);
      setProfile({ ...profile, wishlist: data.data });
      toast.success(isWishlisted ? 'Removed from wishlist' : 'Added to wishlist');
    } catch (error) {
      toast.error('Failed to update wishlist');
    }
  };

  return (
    <div style={{ paddingTop: 68, minHeight: '100vh' }}>
      {/* Hero banner */}
      <div style={{ background: 'linear-gradient(135deg, var(--navy-800), var(--navy-600))', borderBottom: '1px solid var(--border)', padding: '40px 0' }}>
        <div className="container" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 32, alignItems: 'start' }}>
          <div style={{ maxWidth: 680 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              <span className="badge badge-indigo" style={{ textTransform: 'capitalize' }}>{course.level}</span>
              <span className="badge badge-muted">{course.category}</span>
              <span className="badge badge-muted">{course.language}</span>
            </div>
            <h1 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', marginBottom: 14, lineHeight: 1.3 }}>{course.title}</h1>
            <p style={{ fontSize: '0.95rem', lineHeight: 1.7, marginBottom: 20, color: '#c4c8d8' }}>{course.description?.slice(0, 200)}...</p>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: '0.875rem', color: 'var(--muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Star size={14} color="var(--gold)" fill="var(--gold)" /><strong style={{ color: 'var(--gold)' }}>{course.rating}</strong> ({course.ratingCount} reviews)</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Users size={14} />{course.enrolledCount?.toLocaleString()} students</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Play size={14} />{course.totalLectures} lectures</span>
              {course.totalDuration > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Clock size={14} />{fmtDur(course.totalDuration)}</span>}
            </div>
            <p style={{ marginTop: 12, fontSize: '0.82rem' }}>By <span style={{ color: 'var(--indigo-light)' }}>{course.instructor?.name}</span></p>
          </div>
        </div>
      </div>

      <div className="container" style={{ paddingTop: 32, paddingBottom: 60 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 32, alignItems: 'start' }}>

          {/* Left content */}
          <div>
            {/* What you'll learn */}
            {course.learningOutcomes?.length > 0 && (
              <div className="card" style={{ padding: 24, marginBottom: 24 }}>
                <h3 style={{ marginBottom: 16 }}>What you'll learn</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
                  {course.learningOutcomes.map((o, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: '0.875rem', color: 'var(--lavender)' }}>
                      <CheckCircle size={15} color="var(--success)" style={{ flexShrink: 0, marginTop: 2 }} /> {o}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Requirements */}
            {course.requirements?.length > 0 && (
              <div className="card" style={{ padding: 24, marginBottom: 24 }}>
                <h3 style={{ marginBottom: 14 }}>Requirements</h3>
                <ul style={{ paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {course.requirements.map((r, i) => <li key={i} style={{ fontSize: '0.875rem', color: 'var(--lavender)' }}>{r}</li>)}
                </ul>
              </div>
            )}

            {/* Curriculum */}
            {course.sections?.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ marginBottom: 16 }}>Course Curriculum</h3>
                {course.sections.map((section, si) => (
                  <div key={si} className="card" style={{ marginBottom: 8, overflow: 'hidden' }}>
                    <button onClick={() => setOpenSec(openSec === si ? -1 : si)}
                      style={{ width: '100%', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', color: '#fff' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <BookOpen size={16} color="var(--indigo-light)" />
                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{section.title}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{section.lectures?.length} lectures</span>
                      </div>
                      {openSec === si ? <ChevronUp size={16} color="var(--muted)" /> : <ChevronDown size={16} color="var(--muted)" />}
                    </button>
                    {openSec === si && (
                      <div style={{ borderTop: '1px solid var(--border)' }}>
                        {section.lectures?.map((lecture, li) => (
                          <div key={li} style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: li < section.lectures.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                            {lecture.isFree || enrolled
                              ? <Play size={14} color="var(--indigo-light)" />
                              : <Lock size={14} color="var(--muted)" />
                            }
                            <span style={{ flex: 1, fontSize: '0.875rem', color: lecture.isFree || enrolled ? 'var(--lavender)' : 'var(--muted)' }}>{lecture.title}</span>
                            {lecture.isFree && !enrolled && <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>Preview</span>}
                            {lecture.duration > 0 && <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{fmtDur(lecture.duration)}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Tabs for Reviews and Q&A */}
            <div style={{ display: 'flex', gap: 20, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
              <button 
                onClick={() => setActiveTab('reviews')}
                style={{ 
                  background: 'none', border: 'none', padding: '10px 0', fontSize: '1.05rem', cursor: 'pointer',
                  fontWeight: 600, color: activeTab === 'reviews' ? 'var(--indigo)' : 'var(--muted)',
                  borderBottom: activeTab === 'reviews' ? '2px solid var(--indigo)' : '2px solid transparent'
                }}
              >
                Student Reviews
              </button>
              <button 
                onClick={() => setActiveTab('qa')}
                style={{ 
                  background: 'none', border: 'none', padding: '10px 0', fontSize: '1.05rem', cursor: 'pointer',
                  fontWeight: 600, color: activeTab === 'qa' ? 'var(--indigo)' : 'var(--muted)',
                  borderBottom: activeTab === 'qa' ? '2px solid var(--indigo)' : '2px solid transparent'
                }}
              >
                Q&A Forum
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'reviews' && (
              <div>
                {enrolled && (
                  <div className="card" style={{ padding: 24, marginBottom: 24, border: '1px solid var(--indigo-dark)' }}>
                    <h4 style={{ marginBottom: 12, fontSize: '1rem' }}>Leave a Review</h4>
                    <form onSubmit={handleSubmitReview} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div>
                        <label className="input-label" style={{ display: 'block', marginBottom: 8 }}>Rating</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {[1, 2, 3, 4, 5].map(num => (
                            <button
                              key={num} type="button"
                              onClick={() => setReviewForm({ ...reviewForm, rating: num })}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem', color: num <= reviewForm.rating ? 'var(--gold)' : 'var(--muted)', padding: 0 }}
                            >
                              ★
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <textarea className="input" rows={3} placeholder="Share your experience..." required value={reviewForm.comment} onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })} />
                      </div>
                      <button type="submit" className="btn btn-primary btn-sm" disabled={submittingReview} style={{ alignSelf: 'flex-start' }}>
                        {submittingReview ? 'Submitting...' : 'Submit Review'}
                      </button>
                    </form>
                  </div>
                )}
                
                {reviews.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {reviews.map(r => (
                    <div key={r._id} className="card" style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, var(--indigo), var(--indigo-dark))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 600, color: '#fff' }}>
                          {r.userName?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#fff' }}>{r.userName}</p>
                          <div className="stars">{[...Array(5)].map((_, i) => <span key={i}>{i < r.rating ? '★' : '☆'}</span>)}</div>
                        </div>
                      </div>
                      <p style={{ fontSize: '0.875rem', color: 'var(--lavender)', lineHeight: 1.6 }}>{r.comment}</p>
                    </div>
                  ))}
                  </div>
                ) : (
                  <div style={{ padding: 24, textAlign: 'center', background: 'var(--navy-600)', borderRadius: 12, color: 'var(--muted)' }}>
                    No reviews yet. {enrolled ? 'Be the first to review!' : ''}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'qa' && (
              <CourseQA courseId={course._id} isEnrolled={enrolled} />
            )}
          </div>

          {/* Sticky purchase card */}
          <div style={{ position: 'sticky', top: 88 }}>
            <div className="card" style={{ overflow: 'hidden' }}>
              {course.thumbnail?.url && (
                <img src={course.thumbnail.url} alt={course.title} style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover' }} />
              )}
              <div style={{ padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, color: '#fff' }}>
                    {price === 0 ? 'Free' : `₹${(price / 100).toLocaleString('en-IN')}`}
                  </span>
                  {hasDiscount && (
                    <span style={{ color: 'var(--muted)', textDecoration: 'line-through', fontSize: '1rem' }}>
                      ₹{(course.price / 100).toLocaleString('en-IN')}
                    </span>
                  )}
                  {hasDiscount && <span className="badge badge-gold">Sale</span>}
                </div>

                {enrolled ? (
                  <div>
                    <div className="btn btn-gold" style={{ width: '100%', justifyContent: 'center', marginBottom: 12, cursor: 'default' }}>
                      <CheckCircle size={16} /> Enrolled
                    </div>
                    
                    {enrollData?.progress === 100 && (
                      <button onClick={() => window.dispatchEvent(new CustomEvent('open-certificate', { detail: course }))} className="btn btn-outline" style={{ width: '100%', justifyContent: 'center', marginBottom: 12, color: 'var(--success)', borderColor: 'var(--success)' }}>
                        <Award size={16} /> View Certificate
                      </button>
                    )}

                    <Link to="/dashboard" className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }}>
                      Go to Dashboard
                    </Link>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    <button onClick={handleEnroll} disabled={paying} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', height: 48 }}>
                      <ShoppingCart size={16} /> {paying ? 'Processing...' : price === 0 ? 'Enroll Free' : 'Enroll Now'}
                    </button>
                    <button onClick={handleWishlist} className="btn btn-outline" style={{ width: 48, height: 48, padding: 0, justifyContent: 'center', flexShrink: 0, background: isWishlisted ? 'rgba(239, 68, 68, 0.1)' : 'transparent', borderColor: isWishlisted ? '#EF4444' : 'var(--glass-border)' }}>
                      <Heart size={20} color={isWishlisted ? '#EF4444' : 'var(--lavender)'} fill={isWishlisted ? '#EF4444' : 'transparent'} />
                    </button>
                  </div>
                )}

                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    [Play,  `${course.totalLectures} on-demand lectures`],
                    [Clock, `${fmtDur(course.totalDuration || 0)} total content`],
                    [CheckCircle, 'Certificate of completion'],
                    [BookOpen, 'Full lifetime access'],
                  ].map(([Icon, text]) => (
                    <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.82rem', color: 'var(--lavender)' }}>
                      <Icon size={14} color="var(--muted)" /> {text}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
