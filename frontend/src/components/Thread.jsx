import { useState } from 'react';
import { claims as claimApi, errMsg } from '../api.js';
import { timeAgo } from './ui.jsx';

/**
 * The conversation on a claim: the student's original proof first, then
 * questions from the admin desk and the student's answers.
 * `viewer` is 'admin' or 'student' and decides which side is "you".
 */
export function Thread({ claim, viewer }) {
  const entries = [
    { _id: 'proof', from: 'student', authorName: claim.claimantName, text: claim.proofDescription, createdAt: claim.createdAt, proof: true },
    ...(claim.messages || []),
  ];
  return (
    <ol className="thread">
      {entries.map((m) => {
        const mine = m.from === viewer;
        return (
          <li key={m._id} className={`msg msg-${m.from} ${mine ? 'msg-mine' : ''}`}>
            <div className="msg-meta">
              <strong>{m.from === 'admin' ? 'Lost and found desk' : mine ? 'You' : m.authorName}</strong>
              <span>{m.proof ? 'Proof of ownership' : m.from === 'admin' ? 'Question' : 'Reply'}, {timeAgo(m.createdAt)}</span>
            </div>
            <p>{m.text}</p>
          </li>
        );
      })}
    </ol>
  );
}

// Box for asking (admin) or answering (student). Calls onSent with the updated claim.
export function Composer({ claim, viewer, onSent }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const admin = viewer === 'admin';

  async function send(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    setError('');
    try {
      const res = await claimApi.message(claim._id, text);
      setText('');
      onSent?.(res.data, res.message);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="composer" onSubmit={send}>
      <label className="sr-only" htmlFor={`msg-${claim._id}`}>{admin ? 'Ask the student a question' : 'Your answer'}</label>
      <textarea
        id={`msg-${claim._id}`}
        rows={2}
        maxLength={1000}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={admin ? 'Ask something only the owner would know, like the lock screen photo' : 'Answer the desk’s question'}
      />
      <div className="composer-foot">
        {error ? <span className="small error-text">{error}</span> : <span />}
        <button className="btn btn-sm" disabled={busy || !text.trim()}>{busy ? 'Sending' : admin ? 'Send question' : 'Send answer'}</button>
      </div>
    </form>
  );
}
