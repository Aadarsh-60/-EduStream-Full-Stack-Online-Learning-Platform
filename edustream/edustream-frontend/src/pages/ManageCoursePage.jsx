import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BookOpen, Upload, Plus, Video, Image as ImageIcon, CheckCircle, ArrowLeft } from 'lucide-react';
import { courseAPI, mediaAPI } from '../services/api.js';
import toast from 'react-hot-toast';

export default function ManageCoursePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [showLectureModal, setShowLectureModal] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState(null);

  // Forms state
  const [sectionTitle, setSectionTitle] = useState('');
  const [lectureForm, setLectureForm] = useState({ title: '', description: '', isFree: false });
  const [videoFile, setVideoFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef(null);

  const fetchCourse = async () => {
    try {
      const { data } = await courseAPI.getOne(id);
      setCourse(data.data);
    } catch (err) {
      toast.error('Failed to load course');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourse();
  }, [id]);

  const handleThumbnailUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('thumbnail', file);
    
    const loadingToast = toast.loading('Uploading thumbnail...');
    try {
      await courseAPI.uploadThumbnail(id, formData);
      toast.success('Thumbnail updated', { id: loadingToast });
      fetchCourse();
    } catch (err) {
      toast.error('Thumbnail upload failed', { id: loadingToast });
    }
  };

  const handleTogglePublish = async () => {
    if (!course) return;
    const newStatus = course.status === 'published' ? 'draft' : 'published';
    
    if (newStatus === 'published') {
      if (course.sections.length === 0) return toast.error('Add at least one section before publishing');
      if (!course.thumbnail?.url) return toast.error('Add a thumbnail before publishing');
    }

    try {
      await courseAPI.update(id, { status: newStatus });
      toast.success(`Course is now ${newStatus}`);
      fetchCourse();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleAddSection = async (e) => {
    e.preventDefault();
    if (!sectionTitle.trim()) return toast.error('Title required');
    try {
      await courseAPI.addSection(id, { title: sectionTitle });
      toast.success('Section added');
      setSectionTitle('');
      setShowSectionModal(false);
      fetchCourse();
    } catch (err) {
      toast.error('Failed to add section');
    }
  };

  const handleAddLecture = async (e) => {
    e.preventDefault();
    if (!lectureForm.title.trim()) return toast.error('Title required');
    if (!videoFile) return toast.error('Video file required');

    setUploading(true);
    setUploadProgress(0);

    try {
      // 1. Upload Video
      const formData = new FormData();
      formData.append('video', videoFile);
      formData.append('courseId', id);
      
      const mediaRes = await mediaAPI.uploadVideo(formData, (progress) => {
        setUploadProgress(progress);
      });
      
      const { videoUrl, duration } = mediaRes.data.data;

      // 2. Add Lecture
      await courseAPI.addLecture(id, activeSectionId, {
        ...lectureForm,
        videoUrl,
        duration,
      });

      toast.success('Lecture added successfully');
      setLectureForm({ title: '', description: '', isFree: false });
      setVideoFile(null);
      setShowLectureModal(false);
      fetchCourse();
    } catch (err) {
      toast.error('Failed to add lecture');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  if (loading) return <div style={{ paddingTop: 100, textAlign: 'center' }}>Loading course manager...</div>;
  if (!course) return null;

  return (
    <div style={{ paddingTop: 88, minHeight: '100vh', paddingBottom: 60 }}>
      <div className="container" style={{ maxWidth: 900 }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <button onClick={() => navigate('/dashboard')} className="btn btn-ghost btn-sm" style={{ padding: 0, marginBottom: 12 }}>
              <ArrowLeft size={16} /> Back to Dashboard
            </button>
            <h1 style={{ fontSize: '1.8rem', marginBottom: 6 }}>Manage Course</h1>
            <p style={{ color: 'var(--lavender)' }}>{course.title}</p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className={`btn ${course.status === 'published' ? 'btn-outline' : 'btn-primary'}`} onClick={handleTogglePublish}>
              {course.status === 'published' ? 'Unpublish Course' : 'Publish Course'}
            </button>
            <button className="btn btn-outline" onClick={() => navigate(`/courses/${id}`)}>
              Preview Public Page
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }}>
          
          {/* Thumbnail Section */}
          <div className="card" style={{ padding: 24 }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
              <ImageIcon size={20} color="var(--indigo-light)" /> Course Thumbnail
            </h2>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <div style={{ width: 300, height: 170, background: 'var(--navy-700)', borderRadius: 12, overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
                {course.thumbnail?.url ? (
                  <img src={course.thumbnail.url} alt="Thumbnail" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--muted)' }}>
                    <ImageIcon size={40} style={{ margin: '0 auto 8px' }} />
                    <p>No thumbnail yet</p>
                  </div>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 250 }}>
                <p style={{ fontSize: '0.9rem', marginBottom: 16, color: 'var(--lavender)' }}>
                  Upload a high-quality image to represent your course. 16:9 aspect ratio recommended.
                </p>
                <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleThumbnailUpload} />
                <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()}>
                  <Upload size={16} /> Upload New Image
                </button>
              </div>
            </div>
          </div>

          {/* Curriculum Section */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <h2 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: 10 }}>
                <BookOpen size={20} color="var(--indigo-light)" /> Curriculum Builder
              </h2>
              <button className="btn btn-primary btn-sm" onClick={() => setShowSectionModal(true)}>
                <Plus size={16} /> Add Section
              </button>
            </div>

            {course.sections.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', background: 'var(--navy-800)', borderRadius: 12, border: '1px dashed var(--border)' }}>
                <p style={{ color: 'var(--muted)', marginBottom: 12 }}>No sections added yet.</p>
                <button className="btn btn-outline btn-sm" onClick={() => setShowSectionModal(true)}>Create First Section</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {course.sections.map((section, idx) => (
                  <div key={section._id} style={{ background: 'var(--navy-800)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                    <div style={{ padding: '16px 20px', background: 'var(--navy-700)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Section {idx + 1}: {section.title}</h3>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setActiveSectionId(section._id); setShowLectureModal(true); }}>
                        <Plus size={14} /> Add Lecture
                      </button>
                    </div>
                    
                    <div style={{ padding: '16px 20px' }}>
                      {section.lectures.length === 0 ? (
                        <p style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>No lectures in this section.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          {section.lectures.map((lecture, lIdx) => (
                            <div key={lecture._id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: 12, background: 'var(--glass)', borderRadius: 8 }}>
                              <div style={{ background: 'rgba(108,99,255,0.1)', width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <Video size={16} color="var(--indigo-light)" />
                              </div>
                              <div style={{ flex: 1 }}>
                                <p style={{ fontWeight: 500, fontSize: '0.95rem' }}>{idx + 1}.{lIdx + 1} {lecture.title}</p>
                                {lecture.description && <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 4 }}>{lecture.description}</p>}
                                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                                  {lecture.isFree && <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>Free Preview</span>}
                                  {lecture.duration > 0 && <span className="badge badge-muted" style={{ fontSize: '0.7rem' }}>{Math.round(lecture.duration / 60)} mins</span>}
                                </div>
                              </div>
                              <CheckCircle size={18} color="var(--success)" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Section Modal */}
      {showSectionModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '100%', maxWidth: 400, padding: 24 }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: 16 }}>Add New Section</h3>
            <form onSubmit={handleAddSection}>
              <div style={{ marginBottom: 20 }}>
                <label className="input-label">Section Title</label>
                <input className="input" autoFocus value={sectionTitle} onChange={e => setSectionTitle(e.target.value)} placeholder="e.g. Getting Started" />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowSectionModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save Section</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Lecture Modal */}
      {showLectureModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div className="card" style={{ width: '100%', maxWidth: 500, padding: 24, maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: 16 }}>Add New Lecture</h3>
            <form onSubmit={handleAddLecture} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="input-label">Lecture Title *</label>
                <input className="input" required value={lectureForm.title} onChange={e => setLectureForm({...lectureForm, title: e.target.value})} placeholder="e.g. Introduction to React" />
              </div>
              <div>
                <label className="input-label">Description (Optional)</label>
                <textarea className="input" rows={3} value={lectureForm.description} onChange={e => setLectureForm({...lectureForm, description: e.target.value})} placeholder="What will be covered in this lecture..." />
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input type="checkbox" checked={lectureForm.isFree} onChange={e => setLectureForm({...lectureForm, isFree: e.target.checked})} />
                  Make this lecture free (Previewable)
                </label>
              </div>
              <div>
                <label className="input-label">Upload Video *</label>
                <div style={{ border: '2px dashed var(--border)', padding: 24, borderRadius: 12, textAlign: 'center', background: 'var(--navy-800)' }}>
                  <input type="file" accept="video/*" required onChange={e => setVideoFile(e.target.files?.[0])} style={{ display: 'block', width: '100%', marginBottom: 12 }} />
                  <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>MP4, WebM formats supported.</p>
                </div>
              </div>

              {uploading && (
                <div style={{ background: 'var(--navy-800)', borderRadius: 8, padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 6 }}>
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} disabled={uploading} onClick={() => { setShowLectureModal(false); setVideoFile(null); }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={uploading}>
                  {uploading ? 'Uploading & Saving...' : 'Save Lecture'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
