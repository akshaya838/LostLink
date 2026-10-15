import { useEffect, useState } from 'react';
import { health, ITEM_URL, CLAIM_URL, errMsg } from '../api.js';

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
      <div className="page-head">
        <h1>System status</h1>
        <p className="lede">
          LostLink runs as two separate services, each deployed on its own and each with its own database. They talk to
          each other over REST.
        </p>
      </div>

      <div className="services">
        <ServiceCard name="Item Service" role="Lost and found reports" db="lostlink_items" url={ITEM_URL} s={state.item} />
        <ServiceCard name="Claim Service" role="Ownership claims and reviews" db="lostlink_claims" url={CLAIM_URL} s={state.claim} />
      </div>
      <button className="btn" onClick={check}>Check again</button>

      <section className="panel arch" aria-labelledby="arch-title">
        <h2 id="arch-title">How the pieces connect</h2>
        <svg viewBox="0 0 720 300" role="img" aria-label="React frontend calls both services; the services call each other; each has its own MongoDB database">
          <rect x="260" y="10" width="200" height="56" rx="10" className="a-box" />
          <text x="360" y="36" className="a-t">React frontend</text>
          <text x="360" y="54" className="a-s">Vercel</text>

          <rect x="40" y="130" width="230" height="64" rx="10" className="a-box a-strong" />
          <text x="155" y="158" className="a-t">Item Service</text>
          <text x="155" y="177" className="a-s">Render, /api/items</text>

          <rect x="450" y="130" width="230" height="64" rx="10" className="a-box a-strong" />
          <text x="565" y="158" className="a-t">Claim Service</text>
          <text x="565" y="177" className="a-s">Render, /api/claims</text>

          <rect x="55" y="240" width="200" height="46" rx="23" className="a-db" />
          <text x="155" y="268" className="a-s">MongoDB lostlink_items</text>
          <rect x="465" y="240" width="200" height="46" rx="23" className="a-db" />
          <text x="565" y="268" className="a-s">MongoDB lostlink_claims</text>

          <path d="M320 66 L190 128" className="a-line" markerEnd="url(#arr)" />
          <path d="M400 66 L530 128" className="a-line" markerEnd="url(#arr)" />
          <path d="M272 150 L446 150" className="a-line a-rest" markerEnd="url(#arr)" />
          <path d="M448 176 L274 176" className="a-line a-rest" markerEnd="url(#arr)" />
          <text x="360" y="143" className="a-s">validate item, set status</text>
          <text x="360" y="192" className="a-s">fetch and delete claims</text>
          <path d="M155 196 L155 238" className="a-line" />
          <path d="M565 196 L565 238" className="a-line" />
          <defs>
            <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
              <path d="M0 0 L10 5 L0 10 z" className="a-head" />
            </marker>
          </defs>
        </svg>
      </section>
    </>
  );
}

function ServiceCard({ name, role, db, url, s }) {
  const state = !s ? 'checking' : s.ok ? 'up' : 'down';
  return (
    <div className={`panel service service-${state}`}>
      <div className="service-top">
        <h2>{name}</h2>
        <span className="light">
          <span className="light-dot" aria-hidden="true" />
          {state === 'checking' ? 'Checking' : state === 'up' ? 'Running' : 'Not responding'}
        </span>
      </div>
      <p className="muted small">{role}</p>
      <dl className="facts compact">
        <dt>Address</dt><dd className="break">{url}</dd>
        <dt>Database</dt><dd>{db}{s?.ok && ` (${s.data.database === 'CONNECTED' ? 'connected' : 'disconnected'})`}</dd>
        {s?.ok && (<><dt>Response</dt><dd>{s.ms} ms</dd></>)}
      </dl>
      {s && !s.ok && <p className="small error-text">{s.error}</p>}
    </div>
  );
}
