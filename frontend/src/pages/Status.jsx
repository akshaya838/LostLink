import { useEffect, useState } from 'react';
import { health, ITEM_URL, CLAIM_URL, errMsg } from '../api.js';
import { Spinner } from '../components/ui.jsx';

// Shows the live health of each independently deployed microservice
export default function Status() {
  const [state, setState] = useState({ item: null, claim: null });

  async function check() {
    setState({ item: null, claim: null });
    const run = async (key, fn) => {
      const t0 = performance.now();
      try {
        const data = await fn();
        setState((s) => ({ ...s, [key]: { ok: true, data, ms: Math.round(performance.now() - t0) } }));
      } catch (err) {
        setState((s) => ({ ...s, [key]: { ok: false, error: errMsg(err) } }));
      }
    };
    run('item', health.item);
    run('claim', health.claim);
  }

  useEffect(() => { check(); }, []);

  return (
    <>
      <h1>System status</h1>
      <p className="muted">LostLink runs as two independent microservices, each with its own database and deployment.</p>
      <div className="grid two-col">
        <ServiceCard name="Item Service" url={ITEM_URL} s={state.item} />
        <ServiceCard name="Claim Service" url={CLAIM_URL} s={state.claim} />
      </div>
      <button className="btn" onClick={check}>Re-check</button>

      <div className="card arch">
        <h2>Architecture</h2>
        <pre>{`  React (Vercel)
     │  Axios
     ├──────────────► Item Service (Render) ──► MongoDB Atlas: lostlink_items
     │                    ▲   │
     │       REST + key   │   │ GET /api/claims/item/:id
     │                    │   ▼
     └──────────────► Claim Service (Render) ─► MongoDB Atlas: lostlink_claims`}</pre>
      </div>
    </>
  );
}

function ServiceCard({ name, url, s }) {
  return (
    <div className="card service">
      <div className="row between">
        <h3>{name}</h3>
        {s && <span className={`dot ${s.ok ? 'up' : 'down'}`}>{s.ok ? 'UP' : 'DOWN'}</span>}
      </div>
      <p className="small muted break">{url}</p>
      {!s ? <Spinner label="Pinging…" /> : s.ok ? (
        <p className="small">Database: <strong>{s.data.database}</strong> · {s.ms} ms</p>
      ) : (
        <p className="small error-text">{s.error}</p>
      )}
    </div>
  );
}
