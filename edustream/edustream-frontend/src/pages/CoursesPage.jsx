import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X, ChevronDown } from 'lucide-react';
import { searchAPI } from '../services/api.js';
import CourseCard from '../components/course/CourseCard.jsx';

const LEVELS    = ['beginner', 'intermediate', 'advanced'];
const SORT_OPTS = [
  { value: 'relevance', label: 'Most Relevant' },
  { value: 'popular',   label: 'Most Popular' },
  { value: 'rating',    label: 'Top Rated' },
  { value: 'newest',    label: 'Newest' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc',label: 'Price: High to Low' },
];

export default function CoursesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [courses,    setCourses]    = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [total,      setTotal]      = useState(0);
  const [page,       setPage]       = useState(1);
  const [showFilter, setShowFilter] = useState(false);

  const q        = searchParams.get('q')        || '';
  const category = searchParams.get('category') || '';
  const level    = searchParams.get('level')    || '';
  const sort     = searchParams.get('sort')     || 'relevance';
  const [searchInput, setSearchInput] = useState(q);

  useEffect(() => {
    setLoading(true);
    searchAPI.search({ q, category, level, sort, page, limit: 12 })
      .then(({ data }) => {
        setCourses(data.data.courses || []);
        setTotal(data.data.pagination?.total || 0);
      })
      .catch(() => setCourses([]))
      .finally(() => setLoading(false));
  }, [q, category, level, sort, page]);

  useEffect(() => {
    searchAPI.categories()
      .then(({ data }) => setCategories(data.data || []))
      .catch(() => {});
  }, []);

  const setParam = (key, val) => {
    const p = new URLSearchParams(searchParams);
    val ? p.set(key, val) : p.delete(key);
    p.delete('page');
    setSearchParams(p);
    setPage(1);
  };

  const clearAll = () => { setSearchParams({}); setSearchInput(''); setPage(1); };

  const hasFilters = q || category || level;

  return (
    <div style={{ paddingTop: 88, minHeight: '100vh' }}>
      <div className="container">

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', marginBottom: 6 }}>
            {q ? `Results for "${q}"` : 'All Courses'}
          </h1>
          <p>{loading ? 'Searching...' : `${total} courses found`}</p>
        </div>

        {/* Search + Controls */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <form onSubmit={(e) => { e.preventDefault(); setParam('q', searchInput); }}
            style={{ flex: 1, minWidth: 240, position: 'relative' }}>
            <Search size={16} color="var(--muted)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input value={searchInput} onChange={e => setSearchInput(e.target.value)}
              placeholder="Search courses..." className="input"
              style={{ paddingLeft: 38, paddingRight: searchInput ? 38 : 12 }} />
            {searchInput && (
              <button type="button" onClick={() => { setSearchInput(''); setParam('q', ''); }}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
                <X size={14} />
              </button>
            )}
          </form>

          {/* Sort */}
          <div style={{ position: 'relative' }}>
            <select value={sort} onChange={e => setParam('sort', e.target.value)}
              style={{ appearance: 'none', background: 'var(--glass)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)', color: '#fff', padding: '10px 36px 10px 14px', fontSize: '0.875rem', cursor: 'pointer', outline: 'none' }}>
              {SORT_OPTS.map(o => <option key={o.value} value={o.value} style={{ background: 'var(--navy-700)' }}>{o.label}</option>)}
            </select>
            <ChevronDown size={14} color="var(--muted)" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          </div>

          <button className="btn btn-outline btn-sm" onClick={() => setShowFilter(!showFilter)}>
            <SlidersHorizontal size={15} /> Filters {hasFilters && <span className="badge badge-indigo" style={{ padding: '1px 6px', fontSize: '0.7rem' }}>ON</span>}
          </button>
        </div>

        {/* Active filters */}
        {hasFilters && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Active:</span>
            {q && <span className="badge badge-indigo">"{q}" <X size={10} style={{ cursor: 'pointer', marginLeft: 4 }} onClick={() => { setSearchInput(''); setParam('q', ''); }} /></span>}
            {category && <span className="badge badge-indigo">{category} <X size={10} style={{ cursor: 'pointer', marginLeft: 4 }} onClick={() => setParam('category', '')} /></span>}
            {level && <span className="badge badge-indigo" style={{ textTransform: 'capitalize' }}>{level} <X size={10} style={{ cursor: 'pointer', marginLeft: 4 }} onClick={() => setParam('level', '')} /></span>}
            <button onClick={clearAll} style={{ fontSize: '0.78rem', color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Clear all</button>
          </div>
        )}

        {/* Filter panel */}
        {showFilter && (
          <div style={{ background: 'var(--glass)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20, marginBottom: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24 }}>
            <div>
              <div className="input-label">Category</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
                {categories.map(cat => (
                  <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.875rem', color: category === cat ? 'var(--indigo-light)' : 'var(--lavender)' }}>
                    <input type="radio" name="category" checked={category === cat} onChange={() => setParam('category', category === cat ? '' : cat)} style={{ accentColor: 'var(--indigo)' }} />
                    {cat}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <div className="input-label">Level</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {LEVELS.map(l => (
                  <label key={l} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.875rem', textTransform: 'capitalize', color: level === l ? 'var(--indigo-light)' : 'var(--lavender)' }}>
                    <input type="radio" name="level" checked={level === l} onChange={() => setParam('level', level === l ? '' : l)} style={{ accentColor: 'var(--indigo)' }} />
                    {l}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Course grid */}
        {loading ? (
          <div className="grid-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border)' }}>
                <div className="skeleton" style={{ aspectRatio: '16/9' }} />
                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[60, 90, 80, 40].map((w, j) => <div key={j} className="skeleton" style={{ height: 14, width: `${w}%` }} />)}
                </div>
              </div>
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>🔍</div>
            <h3 style={{ marginBottom: 8, color: '#fff' }}>No courses found</h3>
            <p style={{ marginBottom: 24 }}>Try adjusting your search or filters</p>
            <button onClick={clearAll} className="btn btn-primary">Clear Filters</button>
          </div>
        ) : (
          <>
            <div className="grid-4">
              {courses.map(c => <CourseCard key={c._id} course={c} />)}
            </div>
            {/* Pagination */}
            {total > 12 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 40 }}>
                {[...Array(Math.ceil(total / 12))].map((_, i) => (
                  <button key={i} onClick={() => setPage(i + 1)}
                    style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid', borderColor: page === i+1 ? 'var(--indigo)' : 'var(--border)', background: page === i+1 ? 'var(--indigo)' : 'transparent', color: page === i+1 ? '#fff' : 'var(--muted)', cursor: 'pointer', fontSize: '0.875rem', transition: 'all 0.2s' }}>
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
        <div style={{ height: 60 }} />
      </div>
    </div>
  );
}
