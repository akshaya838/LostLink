import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { items as itemApi, errMsg } from '../api.js';
import { Badge, Alert, Spinner, fmtDate } from '../components/ui.jsx';

export default function Home() {
  const [list, setList] = useState([]);
  const [stats, setStats] = useState(null);
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({ type: '', category: '', status: '', search: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    itemApi.categories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 300); // debounce search typing
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
      const [res, s] = await Promise.all([itemApi.list(params), itemApi.stats()]);
      setList(res.data);
      setStats(s);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  }

  const set = (k) => (e) => setFilters({ ...filters, [k]: e.target.value });

  return (
    <>
      <section className="hero">
        <div>
          <h1>Lost something on campus?</h1>
          <p>Report lost or found items, browse what others have found, and claim what's yours.</p>
        </div>
        <Link to="/report" className="btn btn-primary">+ Report an item</Link>
      </section>

      {stats && (
        <div className="stats">
          <Stat label="Total reports" value={stats.total} />
          <Stat label="Lost" value={stats.lost} tone="lost" />
          <Stat label="Found" value={stats.found} tone="found" />
          <Stat label="Open" value={stats.open} />
          <Stat label="Claimed" value={stats.claimed} />
          <Stat label="Returned" value={stats.resolved} />
        </div>
      )}

      <div className="filters card">
        <input placeholder="Search title, description, location…" value={filters.search} onChange={set('search')} />
        <select value={filters.type} onChange={set('type')}>
          <option value="">All types</option>
          <option value="lost">Lost</option>
          <option value="found">Found</option>
        </select>
        <select value={filters.category} onChange={set('category')}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={filters.status} onChange={set('status')}>
          <option value="">Any status</option>
          <option value="open">Open</option>
          <option value="claimed">Claimed</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      <Alert onClose={() => setError('')}>{error}</Alert>

      {loading ? (
        <Spinner label="Loading items (first load may take ~30s while the server wakes up)…" />
      ) : list.length === 0 ? (
        <p className="empty">No items match. <Link to="/report">Report one</Link>.</p>
      ) : (
        <div className="grid">
          {list.map((it) => (
            <Link to={`/items/${it._id}`} key={it._id} className="card item-card">
              {it.imageUrl ? (
                <img src={it.imageUrl} alt={it.title} className="thumb" onError={(e) => (e.target.style.display = 'none')} />
              ) : (
                <div className={`thumb thumb-placeholder ${it.type}`}>{it.category}</div>
              )}
              <div className="item-body">
                <div className="row">
                  <Badge value={it.type} />
                  <Badge value={it.status} />
                </div>
                <h3>{it.title}</h3>
                <p className="muted clamp">{it.description}</p>
                <p className="meta">📍 {it.location} · {fmtDate(it.date)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

function Stat({ label, value, tone = '' }) {
  return (
    <div className={`stat ${tone}`}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
