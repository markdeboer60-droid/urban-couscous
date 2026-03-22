import { useState } from 'react';
import { FIELDS } from '../utils';

const EMPTY = {
  month: '',
  spaarrekeningen: '',
  traderspublic: '',
  meesman: '',
  degiro: '',
  woning: '',
  hypotheek: '',
};

export default function InputForm({ entries, onSave }) {
  const [form, setForm] = useState(EMPTY);
  const [saved, setSaved] = useState(false);

  function handleMonthChange(e) {
    const month = e.target.value;
    const existing = entries.find(en => en.month === month);
    if (existing) {
      setForm({
        month,
        spaarrekeningen: existing.spaarrekeningen ?? '',
        traderspublic: existing.traderspublic ?? '',
        meesman: existing.meesman ?? '',
        degiro: existing.degiro ?? '',
        woning: existing.woning ?? '',
        hypotheek: existing.hypotheek ?? '',
      });
    } else {
      setForm({ ...EMPTY, month });
    }
    setSaved(false);
  }

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setSaved(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const entry = { ...form };
    FIELDS.forEach(f => {
      entry[f.key] = entry[f.key] === '' ? 0 : parseFloat(entry[f.key]);
    });
    await onSave(entry);
    setSaved(true);
  }

  return (
    <form className="input-form" onSubmit={handleSubmit}>
      <h2>Maandelijkse invoer</h2>
      <div className="form-group">
        <label>Maand</label>
        <input
          type="month"
          value={form.month}
          onChange={handleMonthChange}
          required
        />
      </div>
      {FIELDS.map(f => (
        <div className="form-group" key={f.key}>
          <label>{f.label}</label>
          <input
            type="number"
            name={f.key}
            value={form[f.key]}
            onChange={handleChange}
            placeholder="0"
            min="0"
            step="0.01"
          />
        </div>
      ))}
      <button type="submit">Opslaan</button>
      {saved && <span className="saved-msg">✓ Opgeslagen</span>}
    </form>
  );
}
