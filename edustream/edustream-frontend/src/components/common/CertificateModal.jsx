import React, { useState, useEffect, useRef } from 'react';
import { X, Download, Award } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import toast from 'react-hot-toast';

export default function CertificateModal() {
  const { user } = useAuth();
  const [course, setCourse] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const certificateRef = useRef(null);

  useEffect(() => {
    const handleOpen = (e) => setCourse(e.detail);
    window.addEventListener('open-certificate', handleOpen);
    return () => window.removeEventListener('open-certificate', handleOpen);
  }, []);

  if (!course || !user) return null;

  const handleDownload = async () => {
    if (!certificateRef.current) return;
    setDownloading(true);
    const toastId = toast.loading('Generating PDF...');
    
    try {
      const element = certificateRef.current;
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${course.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_certificate.pdf`);
      
      toast.success('Certificate downloaded!', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate PDF', { id: toastId });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(10, 15, 30, 0.85)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20
    }}>
      <div style={{ maxWidth: 900, width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Controls */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button onClick={handleDownload} disabled={downloading} className="btn btn-primary">
            <Download size={18} /> {downloading ? 'Generating...' : 'Download PDF'}
          </button>
          <button onClick={() => setCourse(null)} className="btn btn-outline" style={{ background: 'var(--navy-800)' }}>
            <X size={18} /> Close
          </button>
        </div>

        {/* Certificate Container */}
        <div style={{ overflow: 'auto', background: '#0A0F1E', borderRadius: 16, boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
          <div 
            ref={certificateRef}
            style={{
              width: 800, height: 565, // A4 landscape aspect ratio approx
              margin: '0 auto', background: '#ffffff', color: '#1a1a1a',
              position: 'relative', overflow: 'hidden', padding: 40,
              fontFamily: 'Georgia, serif', textAlign: 'center',
              border: '20px solid #f1f5f9'
            }}
          >
            {/* Inner Border */}
            <div style={{ position: 'absolute', top: 30, left: 30, right: 30, bottom: 30, border: '2px solid #cbd5e1', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', top: 34, left: 34, right: 34, bottom: 34, border: '1px solid #cbd5e1', pointerEvents: 'none' }} />

            {/* Content */}
            <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center' }}>
              <Award size={64} color="#D97706" style={{ margin: '0 auto 20px' }} />
              
              <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#0f172a', marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Certificate of Completion
              </h1>
              <p style={{ fontSize: '1.2rem', color: '#475569', fontStyle: 'italic', marginBottom: 40 }}>
                This is to certify that
              </p>
              
              <h2 style={{ fontSize: '3rem', color: '#1e40af', marginBottom: 40, borderBottom: '2px solid #cbd5e1', display: 'inline-block', paddingBottom: 10, minWidth: '60%' }}>
                {user.name}
              </h2>
              
              <p style={{ fontSize: '1.2rem', color: '#475569', marginBottom: 20 }}>
                has successfully completed the online course
              </p>
              <h3 style={{ fontSize: '1.8rem', color: '#0f172a', fontWeight: 'bold', maxWidth: '80%', margin: '0 auto 40px' }}>
                {course.title}
              </h3>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'auto', padding: '0 40px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ borderBottom: '1px solid #1a1a1a', width: 150, marginBottom: 8, paddingBottom: 4, fontWeight: 'bold', color: '#1a1a1a' }}>EduStream</div>
                  <p style={{ fontSize: '0.9rem', color: '#475569' }}>Platform</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ borderBottom: '1px solid #1a1a1a', width: 150, marginBottom: 8, paddingBottom: 4, fontWeight: 'bold', color: '#1a1a1a' }}>{course.instructor?.name || 'Instructor'}</div>
                  <p style={{ fontSize: '0.9rem', color: '#475569' }}>Instructor</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
