import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { items as itemApi, claims as claimApi, errMsg } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Alert, Badge, Spinner, Tag, fmtDate, timeAgo } from '../components/ui.jsx';

const EMPTY_CLAIM = { proofDescription: '', claimantPhone: '' };

export default function ItemDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin, isStudent } = useAuth();
  const [data, setData] = useState(null); // { item, claims, claimServiceAvailable, canManage }
  const [form, setForm] = useState(EMPTY_CLAIM);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      // One call to the Item Service, which itself calls the Claim Service
      setData(await itemApi.withClaims(id));
    } catch (err) {
      setError(errMsg(err));
    }
  }

  useEffect(() => {
    load();
    // reload when the user logs in or out, since what we may see changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?._id]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submitClaim(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await claimApi.create({ ...form, itemId: id });
      setSuccess('Claim sent. You can follow it, and answer any questions from the desk, on My claims.');
      setForm(EMPTY_CLAIM);
      load();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  async function del() {
    if (!confirm('Delete this report and every claim on it? This cannot be undone.')) return;
    try {
      await itemApi.remove(id);
      navigate('/');
    } catch (err) {
      setError(errMsg(err));
    }
  }

  async function resolve() {
    try {
      await itemApi.resolve(id);
      setSuccess('Marked as returned to its owner.');
      load();
    } catch (err) {
      setError(errMsg(err));
    }
  }

  if (!data) return error ? <Alert>{error}</Alert> : <Spinner />;
  const { item, claims, claimServiceAvailable, canManage } = data;
  const isFound = item.type === 'found';
  const isReporter = user && item.reporterId === user._id;
  const myClaim = claims.find((c) => c.mine);

  function sidePanel() {
    if (item.status !== 'open') {
      return (
        <div className="panel">
          <h2>{item.status === 'claimed' ? 'Already claimed' : 'Returned to its owner'}</h2>
          <p className="muted small">This item is no longer taking claims.</p>
        </div>
      );
    }
    if (!user) {
      return (
        <div className="panel">
          <h2>{isFound ? 'Is this yours?' : 'Did you find this?'}</h2>
          <p className="muted small">Log in with your student account to send a claim. The desk checks every claim before handing anything over.</p>
          <div className="actions-row">
            <Link className="btn btn-primary" to={`/login?next=/items/${id}`}>Log in to claim</Link>
            <Link className="btn" to={`/signup?next=/items/${id}`}>Create account</Link>
          </div>
        </div>
      );
    }
    if (isAdmin) {
      return (
        <div className="panel">
          <h2>Reviewing this item</h2>
          <p className="muted small">Read each claim below, ask questions, and approve the right one from the Claims desk.</p>
          <Link className="btn btn-primary" to="/claims">Open the Claims desk</Link>
        </div>
      );
    }
    if (isReporter) {
      return (
        <div className="panel">
          <h2>You posted this</h2>
          <p className="muted small">When someone claims it, the desk reviews their proof. You'll see the number of claims below.</p>
        </div>
      );
    }
    if (myClaim && myClaim.status === 'pending') {
      return (
        <div className="panel">
          <h2>Your claim is with the desk</h2>
          <p className="muted small">Check My claims for questions from the desk.</p>
          <Link className="btn btn-primary" to="/my-claims">Go to My claims</Link>
        </div>
      );
    }
    return (
      <form className="panel form" onSubmit={submitClaim}>
        <h2>{isFound ? 'Is this yours?' : 'Did you find this?'}</h2>
        <p className="muted small">
          {isFound
            ? 'Tell the desk something only the owner would know. They may ask you a follow-up question before handing it over.'
            : 'Let the owner know where you found it and where it is now.'}
        </p>
        <label>
          {isFound ? 'Proof that it’s yours' : 'Where you found it'}
          <textarea required minLength={10} rows={4} value={form.proofDescription} onChange={set('proofDescription')}
            placeholder={isFound ? 'A sticker, the lock screen photo, what was inside' : 'Found near the library entrance, handed to security'} />
        </label>
        <p className="posting-as">Claiming as <strong>{user.name}</strong>{user.rollNumber && `, ${user.rollNumber}`}</p>
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Sending claim' : 'Send claim'}</button>
      </form>
    );
  }

  return (
    <>
      <Link to="/" className="back">Back to the board</Link>
      <Alert onClose={() => setError('')}>{error}</Alert>
      <Alert type="success" onClose={() => setSuccess('')}>{success}</Alert>

      <div className="detail">
        <article className="detail-main">
          <div className="detail-media">
            {item.imageUrl ? <img src={item.imageUrl} alt={item.title} /> : <span className="item-cat">{item.category}</span>}
          </div>
          <div className="detail-head">
            <Tag item={item} size="tag-lg" />
            <Badge value={item.status} />
          </div>
          <h1>{item.title}</h1>
          <p className="detail-desc">{item.description}</p>

          <dl className="facts">
            <dt>Where</dt><dd>{item.location}</dd>
            <dt>When</dt><dd>{fmtDate(item.date)}</dd>
            <dt>Category</dt><dd>{item.category}</dd>
            <dt>Posted by</dt>
            <dd>
              {item.reporterName}
              {user && (
                <>
                  <br />
                  <a href={`mailto:${item.reporterEmail}`}>{item.reporterEmail}</a>
                  {item.reporterPhone && <> or {item.reporterPhone}</>}
                </>
              )}
            </dd>
            {item.claimedBy && (<><dt>Claimed by</dt><dd>{item.claimedBy}</dd></>)}
          </dl>

          {(canManage || isAdmin) && (
            <div className="actions-row">
              {canManage && <Link className="btn" to={`/items/${id}/edit`}>Edit report</Link>}
              {isAdmin && item.status === 'claimed' && <button className="btn btn-primary" onClick={resolve}>Mark as returned</button>}
              {canManage && <button className="btn btn-quiet-danger" onClick={del}>Delete report</button>}
            </div>
          )}
        </article>

        <aside className="detail-side">
          {sidePanel()}

          <div className="panel">
            <div className="panel-head">
              <h2>Claims</h2>
              <span className="count">{claims.length}</span>
            </div>
            {!claimServiceAvailable && <Alert type="warn">Claims can't be loaded right now because the Claim Service isn't responding.</Alert>}
            {claims.length === 0 ? (
              <p className="muted small">No one has claimed this yet.</p>
            ) : (
              <>
                {!isAdmin && <p className="muted small">Proof is only shared with the desk, so others can't copy it.</p>}
                <ul className="claim-list">
                  {claims.map((c) => (
                    <li key={c._id} className={c.mine ? 'is-mine' : ''}>
                      <div className="claim-top">
                        <strong>{c.mine ? 'Your claim' : c.claimantName}</strong>
                        <Badge value={c.status} />
                      </div>
                      {c.proofDescription && <p className="small">{c.proofDescription}</p>}
                      <p className="small muted">Sent {timeAgo(c.createdAt)}</p>
                      {isStudent && c.mine && <Link className="small" to="/my-claims">Open in My claims</Link>}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
