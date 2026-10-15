import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { items as itemApi, errMsg } from '../api.js';
import { Alert, Spinner } from '../components/ui.jsx';

const EMPTY = {
  type: 'lost',
  title: '',
  description: '',
  category: 'Other',
  location: '',
  date: new Date().toISOString().slice(0, 10),
  imageUrl: '',
  reporterName: '',
  reporterEmail: '',
  reporterPhone: '',
};

export default function ReportItem() {
  const { id } = useParams(); // present when editing
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    itemApi.categories().then(setCategories).catch(() => {});
    if (id) {
      itemApi
        .get(id)
        .then((it) => setForm({ ...EMPTY, ...it, date: it.date?.slice(0, 10) }))
        .catch((e) => setError(errMsg(e)))
        .finally(() => setLoading(false));
    }
  }, [id]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = id ? await itemApi.update(id, form) : await itemApi.create(form);
      navigate(`/items/${res.data._id}`);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Spinner />;

  return (
    <div className="narrow">
      <h1>{id ? 'Edit item' : 'Report an item'}</h1>
      <Alert onClose={() => setError('')}>{error}</Alert>

      <form className="card form" onSubmit={submit}>
        <div className="toggle">
          {['lost', 'found'].map((t) => (
            <button type="button" key={t} className={form.type === t ? `active ${t}` : ''} onClick={() => setForm({ ...form, type: t })}>
              I {t} something
            </button>
          ))}
        </div>

        <label>Title *<input required maxLength={100} value={form.title} onChange={set('title')} placeholder="e.g. Black HP laptop charger" /></label>
        <label>Description *<textarea required rows={4} value={form.description} onChange={set('description')} placeholder="Colour, brand, distinguishing marks…" /></label>

        <div className="two">
          <label>Category
            <select value={form.category} onChange={set('category')}>
              {categories.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label>Date {form.type === 'lost' ? 'lost' : 'found'} *<input type="date" required value={form.date} onChange={set('date')} /></label>
        </div>

        <label>Location *<input required value={form.location} onChange={set('location')} placeholder="e.g. Library 2nd floor, Canteen, Block C" /></label>
        <label>Image URL (optional)<input type="url" value={form.imageUrl} onChange={set('imageUrl')} placeholder="https://…" /></label>

        <h3>Your contact details</h3>
        <div className="two">
          <label>Name *<input required value={form.reporterName} onChange={set('reporterName')} /></label>
          <label>Email *<input type="email" required value={form.reporterEmail} onChange={set('reporterEmail')} /></label>
        </div>
        <label>Phone<input value={form.reporterPhone} onChange={set('reporterPhone')} /></label>

        <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : id ? 'Save changes' : 'Submit report'}</button>
      </form>
    </div>
  );
}
