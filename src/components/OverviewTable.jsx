import { FIELDS, calcTotaal, formatEur, formatMonth } from '../utils';

export default function OverviewTable({ entries }) {
  if (entries.length === 0) return null;

  return (
    <div className="table-wrapper">
      <h2>Overzicht per maand</h2>
      <div className="table-scroll">
        <table className="overview-table">
          <thead>
            <tr>
              <th className="label-col">Categorie</th>
              {entries.map(e => (
                <th key={e.month}>{formatMonth(e.month)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FIELDS.map(f => (
              <tr key={f.key}>
                <td className="label-col">{f.label}</td>
                {entries.map(e => (
                  <td key={e.month}>{formatEur(e[f.key] || 0)}</td>
                ))}
              </tr>
            ))}
            <tr className="totaal-row">
              <td className="label-col">Totaal vermogen</td>
              {entries.map(e => (
                <td key={e.month}>{formatEur(calcTotaal(e))}</td>
              ))}
            </tr>
            <tr className="diff-row">
              <td className="label-col">Verschil t.o.v. vorige maand</td>
              {entries.map((e, i) => {
                if (i === 0) return <td key={e.month}>—</td>;
                const diff = calcTotaal(e) - calcTotaal(entries[i - 1]);
                return (
                  <td key={e.month} className={diff >= 0 ? 'pos' : 'neg'}>
                    {diff >= 0 ? '+' : ''}{formatEur(diff)}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
