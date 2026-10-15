// Human-friendly labels for every status the APIs return
const LABELS = {
  lost: 'Lost',
  found: 'Found',
  open: 'Waiting for owner',
  claimed: 'Claimed',
  resolved: 'Returned',
  pending: 'Pending review',
  approved: 'Approved',
  rejected: 'Rejected',
};

export function Badge({ value }) {
  return <span className={`badge badge-${value}`}>{LABELS[value] || value}</span>;
}

// Short reference number shown on each claim tag, e.g. LL-4FE2
// (hashed so items created close together still get clearly different numbers)
export const refNo = (id = '') => {
  let h = 2166136261;
  for (const ch of String(id)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return `LL-${(h % 46656).toString(36).toUpperCase().padStart(3, '0')}${(h % 9) + 1}`;
};

// The manila claim tag - the visual signature of LostLink
export function Tag({ item, size = '' }) {
  return (
    <div className={`tag tag-${item.type} ${size}`}>
      <span className="tag-hole" aria-hidden="true" />
      <span className="tag-kind">{item.type === 'lost' ? 'Lost' : 'Found'}</span>
      <span className="tag-ref">{refNo(item._id)}</span>
    </div>
  );
}

export function Alert({ type = 'error', children, onClose }) {
  if (!children) return null;
  return (
    <div className={`alert alert-${type}`} role={type === 'error' ? 'alert' : 'status'}>
      <span>{children}</span>
      {onClose && (
        <button className="alert-close" onClick={onClose} aria-label="Dismiss">
          ×
        </button>
      )}
    </div>
  );
}

export function Spinner({ label = 'Loading' }) {
  return (
    <div className="spinner-wrap" role="status">
      <div className="spinner" />
      <span>{label}</span>
    </div>
  );
}

export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

export const timeAgo = (d) => {
  if (!d) return '';
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  return fmtDate(d);
};
