import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { claims as claimApi, errMsg } from '../api.js';
import { Alert, Badge, Spinner, fmtDate } from '../components/ui.jsx';

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
    const note = action === 'remove' ? null : prompt(`Optional note for this ${action}:`, '');
    if (note === null && action !== 'remove') return; // cancelled
    if (action === 'remove' && !confirm('Delete this claim?')) return;
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

  return (
    <>
      <h1>Claims review</h1>
      <p className="muted">Approving a claim calls the Item Service to mark the item as <em>claimed</em>, and auto-rejects other pending claims on it.</p>

      {stats && (
        <div className="stats">
          {[['', 'All', stats.total], ['pending', 'Pending', stats.pending], ['approved', 'Approved', stats.approved], ['rejected', 'Rejected', stats.rejected]].map(([k, label, v]) => (
            <button key={label} className={`stat stat-btn ${status === k ? 'selected' : ''}`} onClick={() => setStatus(k)}>
              <strong>{v}</strong><span>{label}</span>
            </button>
          ))}
        </div>
      )}

      <Alert onClose={() => setError('')}>{error}</Alert>
      <Alert type="success" onClose={() => setSuccess('')}>{success}</Alert>

      {loading ? <Spinner /> : list.length === 0 ? (
        <p className="empty">No {status || ''} claims.</p>
      ) : (
        <div className="table-wrap card">
          <table>
            <thead>
              <tr><th>Item</th><th>Claimant</th><th>Proof</th><th>Filed</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c._id}>
                  <td>
                    {c.item ? (
                      <>
                        <Link to={`/items/${c.itemId}`}>{c.item.title}</Link>
                        <div className="small muted"><Badge value={c.item.type} /> {c.item.location}</div>
                      </>
                    ) : (
                      <span className="muted">{c.itemTitle || 'Item unavailable'}</span>
                    )}
                  </td>
                  <td>{c.claimantName}<div className="small muted">{c.claimantEmail}{c.rollNumber && ` · ${c.rollNumber}`}</div></td>
                  <td className="proof">{c.proofDescription}{c.adminNote && <div className="small muted">Note: {c.adminNote}</div>}</td>
                  <td>{fmtDate(c.createdAt)}</td>
                  <td><Badge value={c.status} /></td>
                  <td className="actions">
                    {c.status === 'pending' && (
                      <>
                        <button className="btn btn-success btn-sm" disabled={busyId === c._id} onClick={() => act(c._id, 'approve')}>Approve</button>
                        <button className="btn btn-sm" disabled={busyId === c._id} onClick={() => act(c._id, 'reject')}>Reject</button>
                      </>
                    )}
                    <button className="btn btn-danger btn-sm" disabled={busyId === c._id} onClick={() => act(c._id, 'remove')}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
