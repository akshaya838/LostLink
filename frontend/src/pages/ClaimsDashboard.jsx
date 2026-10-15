import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { claims as claimApi, errMsg } from '../api.js';
import { Alert, Badge, Spinner, Tag, timeAgo } from '../components/ui.jsx';

const TABS = [
  ['pending', 'Pending'],
  ['approved', 'Approved'],
  ['rejected', 'Rejected'],
  ['', 'All'],
];

export default function ClaimsDashboard() {
  const [list, setList] = useState([]);
  const [stats, setStats] = useState(null);
  const [status, setStatus] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busyId, setBusyId] = useState(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      // Claim Service enriches each claim with item data fetched from the Item Service
      const [data, s] = await Promise.all([claimApi.withItems(status ? { status } : {}), claimApi.stats()]);
      setList(data);
      setStats(s);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function act(id, action) {
    let note = '';
    if (action === 'remove') {
      if (!confirm('Delete this claim?')) return;
    } else {
      note = prompt(action === 'approve' ? 'Add a note for the approval (optional)' : 'Why is this claim rejected? (optional)', '');
      if (note === null) return; // cancelled
    }
    setBusyId(id);
    setError('');
    try {
      const res =
        action === 'approve' ? await claimApi.approve(id, note)
        : action === 'reject' ? await claimApi.reject(id, note)
        : await claimApi.remove(id);
      setSuccess(res.message);
      load();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusyId(null);
    }
  }

  const countFor = (k) => (stats ? (k ? stats[k] : stats.total) : '');

  return (
    <>
      <div className="page-head">
        <h1>Claims</h1>
        <p className="lede">
          Check each claim's proof against the item. Approving one marks the item as claimed and turns down any other
          pending claims on it.
        </p>
      </div>

      <div className="tabs" role="tablist" aria-label="Filter claims">
        {TABS.map(([k, label]) => (
          <button key={label} role="tab" aria-selected={status === k} onClick={() => setStatus(k)}>
            {label} <span className="count">{countFor(k)}</span>
          </button>
        ))}
      </div>

      <Alert onClose={() => setError('')}>{error}</Alert>
      <Alert type="success" onClose={() => setSuccess('')}>{success}</Alert>

      {loading ? (
        <Spinner />
      ) : list.length === 0 ? (
        <div className="empty">
          <h3>{status === 'pending' ? 'No claims to review' : 'Nothing here'}</h3>
          <p>{status === 'pending' ? 'New claims show up here as soon as someone sends one.' : 'Try another tab.'}</p>
        </div>
      ) : (
        <ul className="claims">
          {list.map((c) => (
            <li key={c._id} className="claim-row">
              <div className="claim-item">
                {c.item ? (
                  <>
                    <Tag item={c.item} />
                    <Link to={`/items/${c.itemId}`} className="claim-item-title">{c.item.title}</Link>
                    <span className="muted small">{c.item.location}</span>
                  </>
                ) : (
                  <span className="muted">{c.itemTitle || 'Item no longer available'}</span>
                )}
              </div>
              <div className="claim-who">
                <strong>{c.claimantName}</strong>
                <span className="small muted">{c.claimantEmail}</span>
                {c.rollNumber && <span className="small muted">Roll no. {c.rollNumber}</span>}
              </div>
              <div className="claim-proof">
                <p>{c.proofDescription}</p>
                {c.adminNote && <p className="small muted">Desk note: {c.adminNote}</p>}
                <span className="small muted">Sent {timeAgo(c.createdAt)}</span>
              </div>
              <div className="claim-actions">
                {c.status === 'pending' ? (
                  <>
                    <button className="btn btn-primary btn-sm" disabled={busyId === c._id} onClick={() => act(c._id, 'approve')}>Approve</button>
                    <button className="btn btn-sm" disabled={busyId === c._id} onClick={() => act(c._id, 'reject')}>Reject</button>
                  </>
                ) : (
                  <Badge value={c.status} />
                )}
                <button className="btn btn-quiet-danger btn-sm" disabled={busyId === c._id} onClick={() => act(c._id, 'remove')}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
