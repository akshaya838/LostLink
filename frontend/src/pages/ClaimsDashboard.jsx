import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { claims as claimApi, errMsg } from '../api.js';
import { Alert, Badge, Spinner, Tag, timeAgo } from '../components/ui.jsx';
import { Thread, Composer } from '../components/Thread.jsx';

// [key, label, query params, stats field]
const TABS = [
  ['review', 'To review', { status: 'pending' }, 'pending'],
  ['waiting', 'Waiting on student', { status: 'pending', awaitingReply: 'true' }, 'awaitingReply'],
  ['approved', 'Approved', { status: 'approved' }, 'approved'],
  ['rejected', 'Rejected', { status: 'rejected' }, 'rejected'],
  ['all', 'All', {}, 'total'],
];

export default function ClaimsDashboard() {
  const [list, setList] = useState([]);
  const [stats, setStats] = useState(null);
  const [tab, setTab] = useState('review');
  const [open, setOpen] = useState(null); // claim whose conversation is expanded
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busyId, setBusyId] = useState(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const params = TABS.find((t) => t[0] === tab)[2];
      // Claim Service enriches each claim with item data fetched from the Item Service
      const [data, s] = await Promise.all([claimApi.withItems(params), claimApi.stats()]);
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
  }, [tab]);

  async function act(c, action) {
    let note = '';
    if (action === 'approve') {
      if (!confirm(`Approve ${c.claimantName}'s claim? The item will be marked as claimed and other pending claims on it will be turned down.`)) return;
    } else if (action === 'reject') {
      note = prompt('Why is this claim being turned down? The student will see this.', '');
      if (note === null) return;
    } else if (!confirm('Delete this claim permanently?')) return;

    setBusyId(c._id);
    setError('');
    try {
      const res =
        action === 'approve' ? await claimApi.approve(c._id, note)
        : action === 'reject' ? await claimApi.reject(c._id, note)
        : await claimApi.remove(c._id);
      setSuccess(res.message);
      load();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusyId(null);
    }
  }

  function messageSent(updated, message) {
    setList((l) => l.map((c) => (c._id === updated._id ? { ...c, ...updated, item: c.item } : c)));
    setSuccess(message);
    claimApi.stats().then(setStats).catch(() => {});
  }

  return (
    <>
      <div className="page-head">
        <h1>Claims desk</h1>
        <p className="lede">
          Check each claim's proof against the item. If you're not sure, ask the student a question first. Approving
          one marks the item as claimed and turns down any other pending claims on it.
        </p>
      </div>

      <div className="tabs" role="tablist" aria-label="Filter claims">
        {TABS.map(([k, label, , field]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => { setTab(k); setOpen(null); }}>
            {label} <span className="count">{stats ? stats[field] : ''}</span>
          </button>
        ))}
      </div>

      <Alert onClose={() => setError('')}>{error}</Alert>
      <Alert type="success" onClose={() => setSuccess('')}>{success}</Alert>

      {loading ? (
        <Spinner />
      ) : list.length === 0 ? (
        <div className="empty">
          <h3>{tab === 'review' ? 'No claims to review' : 'Nothing here'}</h3>
          <p>{tab === 'review' ? 'New claims show up here as soon as a student sends one.' : 'Try another tab.'}</p>
        </div>
      ) : (
        <ul className="claims">
          {list.map((c) => {
            const expanded = open === c._id;
            const pending = c.status === 'pending';
            const count = (c.messages || []).length;
            return (
              <li key={c._id} className={`claim-card ${pending && c.awaitingReply ? 'is-waiting' : ''}`}>
                <div className="claim-row">
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
                    {c.claimantPhone && <span className="small muted">{c.claimantPhone}</span>}
                  </div>
                  <div className="claim-proof">
                    <p>{c.proofDescription}</p>
                    <span className="small muted">Sent {timeAgo(c.createdAt)}</span>
                    {pending && c.awaitingReply && <span className="badge badge-ask">Waiting for the student's answer</span>}
                    {pending && !c.awaitingReply && count > 0 && <span className="badge badge-open">Student answered</span>}
                  </div>
                  <div className="claim-actions">
                    {pending ? (
                      <>
                        <button className="btn btn-primary btn-sm" disabled={busyId === c._id} onClick={() => act(c, 'approve')}>Approve</button>
                        <button className="btn btn-sm" disabled={busyId === c._id} onClick={() => act(c, 'reject')}>Reject</button>
                      </>
                    ) : (
                      <Badge value={c.status} />
                    )}
                    <button className="btn btn-quiet-danger btn-sm" disabled={busyId === c._id} onClick={() => act(c, 'remove')}>Delete</button>
                  </div>
                </div>

                <button className="convo-toggle" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : c._id)}>
                  {expanded ? 'Hide conversation' : pending ? (count ? `Conversation (${count})` : 'Ask the student a question') : `Conversation (${count})`}
                </button>

                {expanded && (
                  <div className="convo">
                    <Thread claim={c} viewer="admin" />
                    {pending ? <Composer claim={c} viewer="admin" onSent={messageSent} /> : <p className="muted small">This claim has been decided, so the conversation is closed.</p>}
                    {c.adminNote && <p className="small muted">Desk note: {c.adminNote}</p>}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
