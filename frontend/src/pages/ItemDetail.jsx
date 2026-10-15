import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { items as itemApi, claims as claimApi, errMsg } from '../api.js';
import { Alert, Badge, Spinner, Tag, fmtDate, timeAgo } from '../components/ui.jsx';

const EMPTY_CLAIM = { claimantName: '', claimantEmail: '', claimantPhone: '', rollNumber: '', proofDescription: '' };

export default function ItemDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null); // { item, claims, claimServiceAvailable }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submitClaim(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await claimApi.create({ ...form, itemId: id });
      setSuccess('Claim sent. The lost and found desk will review it and contact you by email.');
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
  const { item, claims, claimServiceAvailable } = data;
  const isFound = item.type === 'found';

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
              <br />
              <a href={`mailto:${item.reporterEmail}`}>{item.reporterEmail}</a>
              {item.reporterPhone && <> or {item.reporterPhone}</>}
            </dd>
            {item.claimedBy && (<><dt>Claimed by</dt><dd>{item.claimedBy}</dd></>)}
          </dl>

          <div className="actions-row">
            <Link className="btn" to={`/items/${id}/edit`}>Edit report</Link>
            {item.status === 'claimed' && <button className="btn btn-primary" onClick={resolve}>Mark as returned</button>}
            <button className="btn btn-quiet-danger" onClick={del}>Delete report</button>
          </div>
        </article>

        <aside className="detail-side">
          {item.status === 'open' ? (
            <form className="panel form" onSubmit={submitClaim}>
              <h2>{isFound ? 'Is this yours?' : 'Did you find this?'}</h2>
              <p className="muted small">
                {isFound
                  ? 'Tell the desk something only the owner would know. They check every claim before handing anything over.'
                  : 'Let the owner know where you found it and where it is now.'}
              </p>
              <label>
                {isFound ? 'Proof that it’s yours' : 'Where you found it'}
                <textarea required minLength={10} rows={4} value={form.proofDescription} onChange={set('proofDescription')}
                  placeholder={isFound ? 'A sticker, the lock screen photo, what was inside' : 'Found near the library entrance, handed to security'} />
              </label>
              <div className="two">
                <label>Your name<input required value={form.claimantName} onChange={set('claimantName')} autoComplete="name" /></label>
                <label>Email<input type="email" required value={form.claimantEmail} onChange={set('claimantEmail')} autoComplete="email" /></label>
              </div>
              <div className="two">
                <label><span className="label-row">Phone <span className="optional">optional</span></span><input value={form.claimantPhone} onChange={set('claimantPhone')} autoComplete="tel" /></label>
                <label><span className="label-row">Roll or staff number <span className="optional">optional</span></span><input value={form.rollNumber} onChange={set('rollNumber')} /></label>
              </div>
              <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Sending claim' : 'Send claim'}</button>
            </form>
          ) : (
            <div className="panel">
              <h2>{item.status === 'claimed' ? 'Already claimed' : 'Returned to its owner'}</h2>
              <p className="muted small">This item is no longer taking claims.</p>
            </div>
          )}

          <div className="panel">
            <div className="panel-head">
              <h2>Claims</h2>
              <span className="count">{claims.length}</span>
            </div>
            {!claimServiceAvailable && <Alert type="warn">Claims can't be loaded right now because the Claim Service isn't responding.</Alert>}
            {claims.length === 0 ? (
              <p className="muted small">No one has claimed this yet.</p>
            ) : (
              <ul className="claim-list">
                {claims.map((c) => (
                  <li key={c._id}>
                    <div className="claim-top">
                      <strong>{c.claimantName}</strong>
                      <Badge value={c.status} />
                    </div>
                    <p className="small">{c.proofDescription}</p>
                    <p className="small muted">Sent {timeAgo(c.createdAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
