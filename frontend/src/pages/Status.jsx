import { useEffect, useState } from 'react';
import { health, ITEM_URL, CLAIM_URL, USER_URL, errMsg } from '../api.js';

const SERVICES = [
  ['item', 'Item Service', 'Lost and found reports', 'lostlink_items', ITEM_URL],
  ['claim', 'Claim Service', 'Claims, questions and reviews', 'lostlink_claims', CLAIM_URL],
  ['user', 'User Service', 'Student and admin accounts', 'lostlink_users', USER_URL],
];

// Shows the live health of each independently deployed microservice
export default function Status() {
  const [state, setState] = useState({});

  async function check() {
    setState({});
    SERVICES.forEach(async ([key]) => {
      const t0 = performance.now();
      try {
        const data = await health[key]();
        setState((s) => ({ ...s, [key]: { ok: true, data, ms: Math.round(performance.now() - t0) } }));
      } catch (err) {
        setState((s) => ({ ...s, [key]: { ok: false, error: errMsg(err) } }));
      }
    });
  }

  useEffect(() => { check(); }, []);

  return (
    <>
      <div className="page-head">
        <h1>System status</h1>
        <p className="lede">
          LostLink runs as three separate services. Each is deployed on its own, has its own database, and talks to the
          others over REST.
        </p>
      </div>

      <div className="services">
        {SERVICES.map(([key, name, role, db, url]) => (
          <ServiceCard key={key} name={name} role={role} db={db} url={url} s={state[key]} />
        ))}
      </div>
      <button className="btn" onClick={check}>Check again</button>

      <section className="panel arch" aria-labelledby="arch-title">
        <h2 id="arch-title">How the pieces connect</h2>
        <svg viewBox="0 0 720 330" role="img" aria-label="React frontend calls all three services. The Claim Service calls the Item Service and the User Service; the Item Service calls the Claim Service. Each service has its own MongoDB database.">
          <defs>
            <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
              <path d="M0 0 L10 5 L0 10 z" className="a-head" />
            </marker>
            <marker id="arrb" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
              <path d="M0 0 L10 5 L0 10 z" className="a-head-rest" />
            </marker>
          </defs>

          <rect x="260" y="8" width="200" height="54" rx="10" className="a-box" />
          <text x="360" y="33" className="a-t">React frontend</text>
          <text x="360" y="51" className="a-s">Vercel, Axios + login token</text>

          <path d="M300 62 L130 138" className="a-line" markerEnd="url(#arr)" />
          <path d="M360 62 L360 138" className="a-line" markerEnd="url(#arr)" />
          <path d="M420 62 L590 138" className="a-line" markerEnd="url(#arr)" />

          <rect x="20" y="140" width="210" height="62" rx="10" className="a-box a-strong" />
          <text x="125" y="167" className="a-t">Item Service</text>
          <text x="125" y="186" className="a-s">/api/items</text>

          <rect x="255" y="140" width="210" height="62" rx="10" className="a-box a-strong" />
          <text x="360" y="167" className="a-t">Claim Service</text>
          <text x="360" y="186" className="a-s">/api/claims</text>

          <rect x="490" y="140" width="210" height="62" rx="10" className="a-box a-strong" />
          <text x="595" y="167" className="a-t">User Service</text>
          <text x="595" y="186" className="a-s">/api/auth, /api/users</text>

          <path d="M253 158 L233 158" className="a-line a-rest" markerEnd="url(#arrb)" />
          <path d="M232 184 L252 184" className="a-line a-rest" markerEnd="url(#arrb)" />
          <path d="M467 171 L487 171" className="a-line a-rest" markerEnd="url(#arrb)" />
          <text x="242" y="228" className="a-s a-note">check item, set status</text>
          <text x="242" y="244" className="a-s a-note">list and delete claims</text>
          <text x="478" y="228" className="a-s a-note">claimant profile</text>

          <path d="M125 202 L125 270" className="a-line" />
          <path d="M360 202 L360 270" className="a-line" />
          <path d="M595 202 L595 270" className="a-line" />
          <rect x="35" y="272" width="180" height="44" rx="22" className="a-db" />
          <text x="125" y="299" className="a-s">lostlink_items</text>
          <rect x="270" y="272" width="180" height="44" rx="22" className="a-db" />
          <text x="360" y="299" className="a-s">lostlink_claims</text>
          <rect x="505" y="272" width="180" height="44" rx="22" className="a-db" />
          <text x="595" y="299" className="a-s">lostlink_users</text>
        </svg>
        <p className="small muted">
          Logins are checked inside each service using a shared signing secret, so a request never has to wait on the
          User Service just to prove who you are.
        </p>
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
