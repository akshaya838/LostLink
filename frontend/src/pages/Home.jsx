import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { items as itemApi, errMsg } from '../api.js';
import { Badge, Alert, Spinner, Tag, timeAgo } from '../components/ui.jsx';

const TYPES = [
  ['', 'Everything'],
  ['lost', 'Lost'],
  ['found', 'Found'],
];

export default function Home() {
  const [list, setList] = useState([]);
  const [latest, setLatest] = useState([]);
  const [stats, setStats] = useState(null);
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({ type: '', category: '', status: 'open', search: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    itemApi.categories().then(setCategories).catch(() => {});
    itemApi.list({ limit: 3 }).then((r) => setLatest(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 250); // debounce typing in search
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

  const set = (k, v) => setFilters((f) => ({ ...f, [k]: v }));

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <h1>Lost something on campus? Check the board first.</h1>
          <p className="lede">
            Students and staff post what they've lost and what they've found. Search the board, and if you spot your
            item, claim it with proof that it's yours.
          </p>
          <form className="search" role="search" onSubmit={(e) => e.preventDefault()}>
            <input
              aria-label="Search items"
              placeholder="Try “ID card”, “charger” or “library”"
              value={filters.search}
              onChange={(e) => set('search', e.target.value)}
            />
            <div className="segmented" role="group" aria-label="Item type">
              {TYPES.map(([v, label]) => (
                <button type="button" key={label} aria-pressed={filters.type === v} onClick={() => set('type', v)}>
                  {label}
                </button>
              ))}
            </div>
          </form>
          {stats && (
            <p className="summary">
              <strong>{stats.open}</strong> {stats.open === 1 ? 'item is' : 'items are'} waiting for an owner.{' '}
              <strong>{stats.resolved}</strong> returned so far.
            </p>
          )}
        </div>

        <div className="tag-stack" aria-hidden="true">
          {latest.map((it, i) => (
            <Link to={`/items/${it._id}`} key={it._id} className={`stack-tag stack-${i}`} tabIndex={-1}>
              <Tag item={it} size="tag-lg" />
              <span className="stack-title">{it.title}</span>
              <span className="stack-where">{it.location}</span>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="board-title">
        <div className="board-head">
          <h2 id="board-title">On the board</h2>
          <div className="board-filters">
            <select aria-label="Category" value={filters.category} onChange={(e) => set('category', e.target.value)}>
              <option value="">All categories</option>
              {categories.map((c) => <option key={c}>{c}</option>)}
            </select>
            <select aria-label="Status" value={filters.status} onChange={(e) => set('status', e.target.value)}>
              <option value="open">Waiting for owner</option>
              <option value="claimed">Claimed</option>
              <option value="resolved">Returned</option>
              <option value="">Any status</option>
            </select>
          </div>
        </div>

        <Alert onClose={() => setError('')}>{error}</Alert>

        {loading ? (
          <Spinner label="Loading the board. The first visit can take up to 30 seconds while the server wakes up." />
        ) : list.length === 0 ? (
          <div className="empty">
            <h3>Nothing matches yet</h3>
            <p>Try another search, or be the first to post it.</p>
            <Link to="/report" className="btn btn-primary">Report an item</Link>
          </div>
        ) : (
          <div className="grid">
            {list.map((it) => (
              <Link to={`/items/${it._id}`} key={it._id} className="item">
                <div className="item-media">
                  {it.imageUrl ? (
                    <img src={it.imageUrl} alt="" loading="lazy" onError={(e) => (e.currentTarget.style.display = 'none')} />
                  ) : (
                    <span className="item-cat">{it.category}</span>
                  )}
                  <Tag item={it} />
                </div>
                <div className="item-body">
                  <h3>{it.title}</h3>
                  <p className="item-where">{it.location}</p>
                  <div className="item-foot">
                    <Badge value={it.status} />
                    <span className="muted small">{timeAgo(it.date)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
