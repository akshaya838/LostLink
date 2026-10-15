import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { items as itemApi, claims as claimApi, errMsg } from '../api.js';
import { Alert, Badge, Spinner, fmtDate } from '../components/ui.jsx';

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
      setSuccess('Claim submitted! An admin will review it on the Claims page.');
      setForm(EMPTY_CLAIM);
      load();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  async function del() {
    if (!confirm('Delete this item and all its claims?')) return;
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
      setSuccess('Item marked as returned to its owner.');
      load();
    } catch (err) {
      setError(errMsg(err));
    }
  }

  if (!data) return error ? <Alert>{error}</Alert> : <Spinner />;
  const { item, claims, claimServiceAvailable } = data;
  const claimLabel = item.type === 'found' ? 'This is mine — claim it' : 'I found this item';

  return (
    <>
      <p><Link to="/">← Back to all items</Link></p>
      <Alert onClose={() => setError('')}>{error}</Alert>
      <Alert type="success" onClose={() => setSuccess('')}>{success}</Alert>

      <div className="detail">
        <div className="card">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.title} className="hero-img" />
          ) : (
            <div className={`hero-img thumb-placeholder ${item.type}`}>{item.category}</div>
          )}
          <div className="item-body">
            <div className="row">
              <Badge value={item.type} />
              <Badge value={item.status} />
              <span className="chip">{item.category}</span>
            </div>
            <h1>{item.title}</h1>
            <p>{item.description}</p>
            <dl className="facts">
              <dt>Location</dt><dd>{item.location}</dd>
              <dt>Date {item.type}</dt><dd>{fmtDate(item.date)}</dd>
              <dt>Reported by</dt><dd>{item.reporterName} · {item.reporterEmail}{item.reporterPhone && ` · ${item.reporterPhone}`}</dd>
              {item.claimedBy && (<><dt>Claimed by</dt><dd>{item.claimedBy}</dd></>)}
              <dt>Reported on</dt><dd>{fmtDate(item.createdAt)}</dd>
            </dl>
            <div className="row">
              <Link className="btn" to={`/items/${id}/edit`}>Edit</Link>
              {item.status === 'claimed' && <button className="btn btn-success" onClick={resolve}>Mark returned</button>}
              <button className="btn btn-danger" onClick={del}>Delete</button>
            </div>
          </div>
        </div>

        <div>
          {item.status === 'open' ? (
            <form className="card form" onSubmit={submitClaim}>
              <h2>{claimLabel}</h2>
              <div className="two">
                <label>Name *<input required value={form.claimantName} onChange={set('claimantName')} /></label>
                <label>Email *<input type="email" required value={form.claimantEmail} onChange={set('claimantEmail')} /></label>
              </div>
              <div className="two">
                <label>Phone<input value={form.claimantPhone} onChange={set('claimantPhone')} /></label>
                <label>Roll / Staff No.<input value={form.rollNumber} onChange={set('rollNumber')} /></label>
              </div>
              <label>
                {item.type === 'found' ? 'Proof of ownership *' : 'Where/how did you find it? *'}
                <textarea required minLength={10} rows={3} value={form.proofDescription} onChange={set('proofDescription')}
                  placeholder={item.type === 'found' ? 'Describe something only the owner would know (sticker, lock screen, contents)…' : 'Where you found it and where it is now…'} />
              </label>
              <button className="btn btn-primary" disabled={busy}>{busy ? 'Submitting…' : 'Submit claim'}</button>
            </form>
          ) : (
            <div className="card notice">This item is <Badge value={item.status} /> and no longer accepts claims.</div>
          )}

          <div className="card">
            <h2>Claims ({claims.length})</h2>
            <p className="muted small">Fetched by the Item Service from the Claim Service over REST.</p>
            {!claimServiceAvailable && <Alert type="warn">Claim Service is currently unreachable — claims could not be loaded.</Alert>}
            {claims.length === 0 ? (
              <p className="muted">No claims yet.</p>
            ) : (
              <ul className="claim-list">
                {claims.map((c) => (
                  <li key={c._id}>
                    <div className="row between">
                      <strong>{c.claimantName}</strong>
                      <Badge value={c.status} />
                    </div>
                    <p className="small muted">{fmtDate(c.createdAt)} · {c.claimantEmail}</p>
                    <p className="small">{c.proofDescription}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
