import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { claims as claimApi, items as itemApi, errMsg } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Alert, Badge, Spinner, Tag, timeAgo } from '../components/ui.jsx';
import { Thread, Composer } from '../components/Thread.jsx';

export default function MyClaims() {
  const { user } = useAuth();
  const [list, setList] = useState(null);
  const [reported, setReported] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function load() {
    try {
      // Claim Service returns my claims, each enriched with item data from the Item Service
      const [mine, myItems] = await Promise.all([claimApi.mine(), itemApi.mine()]);
      setList(mine);
      setReported(myItems);
    } catch (err) {
      setError(errMsg(err));
      setList([]);
    }
  }

  useEffect(() => { load(); }, []);

  function replaced(updated, message) {
    setList((l) => l.map((c) => (c._id === updated._id ? { ...c, ...updated, item: c.item } : c)));
    setSuccess(message);
  }

  async function withdraw(id) {
    if (!confirm('Withdraw this claim? The desk will no longer review it.')) return;
    try {
      const res = await claimApi.remove(id);
      setSuccess(res.message);
      load();
    } catch (err) {
      setError(errMsg(err));
    }
  }

  if (!list) return <Spinner />;
  const waiting = list.filter((c) => c.status === 'pending' && c.awaitingReply).length;

  return (
    <>
      <div className="page-head">
        <h1>My claims</h1>
        <p className="lede">
          {waiting > 0
            ? `The desk has asked you ${waiting === 1 ? 'a question' : `${waiting} questions`}. Answer below so they can finish checking your claim.`
            : `Hi ${user.name.split(' ')[0]}. This is where you'll see each claim's status and any questions from the lost and found desk.`}
        </p>
      </div>

      <Alert onClose={() => setError('')}>{error}</Alert>
      <Alert type="success" onClose={() => setSuccess('')}>{success}</Alert>

      {list.length === 0 ? (
        <div className="empty">
          <h3>You haven't claimed anything yet</h3>
          <p>Spot your item on the board, open it, and send a claim.</p>
          <Link to="/" className="btn btn-primary">Browse the board</Link>
        </div>
      ) : (
        <ul className="my-claims">
          {list.map((c) => (
            <li key={c._id} className={`panel my-claim ${c.status === 'pending' && c.awaitingReply ? 'needs-you' : ''}`}>
              <div className="my-claim-head">
                <div className="my-claim-item">
                  {c.item ? <Tag item={c.item} /> : null}
                  {c.item ? <Link to={`/items/${c.itemId}`} className="claim-item-title">{c.item.title}</Link> : <strong>{c.itemTitle}</strong>}
                  {c.item && <span className="muted small">{c.item.location}</span>}
                </div>
                <div className="my-claim-status">
                  {c.status === 'pending' && c.awaitingReply ? <span className="badge badge-ask">Desk asked you a question</span> : <Badge value={c.status} />}
                  <span className="muted small">Sent {timeAgo(c.createdAt)}</span>
                </div>
              </div>

              <Thread claim={c} viewer="student" />

              {c.status === 'pending' ? (
                <>
                  <Composer claim={c} viewer="student" onSent={replaced} />
                  <button className="btn btn-quiet-danger btn-sm withdraw" onClick={() => withdraw(c._id)}>Withdraw claim</button>
                </>
              ) : (
                <p className={`outcome outcome-${c.status}`}>
                  {c.status === 'approved'
                    ? 'Approved. Collect your item from the lost and found desk with your college ID.'
                    : 'This claim was not approved.'}
                  {c.adminNote && <> Desk note: {c.adminNote}</>}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {reported.length > 0 && (
        <section className="reported" aria-labelledby="reported-title">
          <h2 id="reported-title">Items you reported</h2>
          <ul>
            {reported.map((it) => (
              <li key={it._id}>
                <Tag item={it} />
                <Link to={`/items/${it._id}`}>{it.title}</Link>
                <Badge value={it.status} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
