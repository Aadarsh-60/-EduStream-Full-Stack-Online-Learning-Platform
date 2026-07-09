import { Link } from 'react-router-dom';
import { Star, Users, Clock, PlayCircle, Heart } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { userAPI } from '../../services/api.js';
import toast from 'react-hot-toast';

const formatPrice = (p) => p === 0 ? 'Free' : `₹${(p / 100).toLocaleString('en-IN')}`;
const formatDuration = (s) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

export default function CourseCard({ course }) {
  const {
    _id, title, thumbnail, instructor, price, discountPrice,
    rating, enrolledCount, totalLectures, totalDuration,
    level, category,
  } = course;

  const { user, profile, setProfile } = useAuth();

  const displayPrice = discountPrice || price;
  const hasDiscount  = discountPrice && discountPrice < price;

  const isWishlisted = profile?.wishlist?.includes(_id);

  const handleWishlist = async (e) => {
    e.preventDefault();
    if (!user) return toast.error('Please login to add to wishlist');
    try {
      // Optimistic update
      const newWishlist = isWishlisted 
        ? profile.wishlist.filter(id => id !== _id)
        : [...(profile.wishlist || []), _id];
      setProfile({ ...profile, wishlist: newWishlist });
      
      const { data } = await userAPI.toggleWishlist(_id);
      setProfile({ ...profile, wishlist: data.data });
      toast.success(isWishlisted ? 'Removed from wishlist' : 'Added to wishlist');
    } catch (error) {
      toast.error('Failed to update wishlist');
    }
  };

  return (
    <Link to={`/courses/${_id}`} style={{ textDecoration: 'none' }}>
      <div className="card" style={{ position: 'relative', overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }}>

        {/* Thumbnail */}
        <div style={{ position: 'relative', aspectRatio: '16/9', overflow: 'hidden', background: 'var(--navy-600)' }}>
          {thumbnail?.url ? (
            <img src={thumbnail.url} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s ease' }}
              onMouseEnter={e => e.target.style.transform = 'scale(1.05)'}
              onMouseLeave={e => e.target.style.transform = 'scale(1)'}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, var(--navy-500), var(--navy-600))' }}>
              <PlayCircle size={40} color="var(--indigo)" style={{ opacity: 0.5 }} />
            </div>
          )}
          {/* Level badge */}
          <span className="badge badge-indigo" style={{ position: 'absolute', top: 10, left: 10, textTransform: 'capitalize' }}>
            {level}
          </span>
          {hasDiscount && (
            <span className="badge badge-gold" style={{ position: 'absolute', top: 10, right: 10 }}>Sale</span>
          )}
          
          {/* Wishlist Heart */}
          <button 
            onClick={handleWishlist}
            style={{ 
              position: 'absolute', top: 10, right: hasDiscount ? 60 : 10,
              background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%',
              width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', zIndex: 10, backdropFilter: 'blur(4px)', transition: 'all 0.2s'
            }}
          >
            <Heart size={16} color={isWishlisted ? '#EF4444' : '#fff'} fill={isWishlisted ? '#EF4444' : 'transparent'} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
          {/* Category */}
          <p style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--indigo-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {category}
          </p>

          {/* Title */}
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#fff', lineHeight: 1.4,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {title}
          </h3>

          {/* Instructor */}
          <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>by {instructor?.name}</p>

          {/* Stats */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.78rem', color: 'var(--muted)', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--gold)' }}>
              <Star size={12} fill="currentColor" />
              <span style={{ fontWeight: 600 }}>{rating || 0}</span>
              <span style={{ color: 'var(--muted)' }}>({enrolledCount?.toLocaleString()})</span>
            </span>
            {totalLectures > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <PlayCircle size={12} /> {totalLectures} lectures
              </span>
            )}
            {totalDuration > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={12} /> {formatDuration(totalDuration)}
              </span>
            )}
          </div>

          {/* Price */}
          <div style={{ marginTop: 'auto', paddingTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', color: '#fff' }}>
              {formatPrice(displayPrice)}
            </span>
            {hasDiscount && (
              <span style={{ fontSize: '0.8rem', color: 'var(--muted)', textDecoration: 'line-through' }}>
                {formatPrice(price)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
