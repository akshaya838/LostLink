import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
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
  const lost = form.type === 'lost';

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
      <Link to={id ? `/items/${id}` : '/'} className="back">{id ? 'Back to the item' : 'Back to the board'}</Link>
      <h1>{id ? 'Edit your report' : 'Report an item'}</h1>
      <p className="lede">The more detail you give, the easier it is to match the item with its owner.</p>
      <Alert onClose={() => setError('')}>{error}</Alert>

      <form className="panel form" onSubmit={submit}>
        <fieldset className="choice">
          <legend>What happened?</legend>
          <label className={`choice-opt lost ${lost ? 'on' : ''}`}>
            <input type="radio" name="type" value="lost" checked={lost} onChange={set('type')} />
            <span className="choice-title">I lost something</span>
            <span className="choice-sub">Others can tell you if they've found it</span>
          </label>
          <label className={`choice-opt found ${!lost ? 'on' : ''}`}>
            <input type="radio" name="type" value="found" checked={!lost} onChange={set('type')} />
            <span className="choice-title">I found something</span>
            <span className="choice-sub">The owner can claim it with proof</span>
          </label>
        </fieldset>

        <label>What is it?<input required maxLength={100} value={form.title} onChange={set('title')} placeholder="Black HP laptop charger" /></label>
        <label>
          Describe it
          <textarea required rows={4} value={form.description} onChange={set('description')}
            placeholder={lost ? 'Colour, brand, stickers, anything that makes it yours' : 'Colour and brand. Keep back one detail so you can check the owner’s claim.'} />
        </label>

        <div className="two">
          <label>Category
            <select value={form.category} onChange={set('category')}>
              {categories.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label>{lost ? 'Date you lost it' : 'Date you found it'}<input type="date" required value={form.date} onChange={set('date')} /></label>
        </div>

        <label>{lost ? 'Where did you last have it?' : 'Where did you find it?'}<input required value={form.location} onChange={set('location')} placeholder="Library, 2nd floor reading hall" /></label>
        <label><span className="label-row">Photo link <span className="optional">optional</span></span><input type="url" value={form.imageUrl} onChange={set('imageUrl')} placeholder="https://" /></label>

        <h2 className="form-section">How can people reach you?</h2>
        <div className="two">
          <label>Your name<input required value={form.reporterName} onChange={set('reporterName')} autoComplete="name" /></label>
          <label>Email<input type="email" required value={form.reporterEmail} onChange={set('reporterEmail')} autoComplete="email" /></label>
        </div>
        <label><span className="label-row">Phone <span className="optional">optional</span></span><input value={form.reporterPhone} onChange={set('reporterPhone')} autoComplete="tel" /></label>

        <button className="btn btn-primary btn-block" disabled={saving}>
          {saving ? 'Saving' : id ? 'Save changes' : 'Post to the board'}
        </button>
      </form>
    </div>
  );
}
