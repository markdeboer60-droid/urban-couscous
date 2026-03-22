import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { formatEur, formatMonth } from '../utils';

function eurFormatter(value) {
  return formatEur(value);
}

export default function Charts({ entries }) {
  if (entries.length === 0) return null;

  const data = entries.map(e => ({
    name: formatMonth(e.month),
    Spaargeld: (e.spaarrekeningen || 0) + (e.traderspublic || 0),
    Beleggingen: (e.meesman || 0) + (e.degiro || 0),
    'Eigen woningwaarde': (e.woning || 0) - (e.hypotheek || 0),
    'Totaal vermogen':
      (e.spaarrekeningen || 0) +
      (e.traderspublic || 0) +
      (e.meesman || 0) +
      (e.degiro || 0) +
      (e.woning || 0) -
      (e.hypotheek || 0),
  }));

  return (
    <div className="charts">
      <h2>Vermogensontwikkeling</h2>

      <div className="chart-block">
        <h3>Totaal vermogen</h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis tickFormatter={eurFormatter} width={90} />
            <Tooltip formatter={eurFormatter} />
            <Legend />
            <Line type="monotone" dataKey="Totaal vermogen" stroke="#2563eb" strokeWidth={2} dot />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-block">
        <h3>Spaargeld, beleggingen &amp; eigen woningwaarde</h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis tickFormatter={eurFormatter} width={90} />
            <Tooltip formatter={eurFormatter} />
            <Legend />
            <Line type="monotone" dataKey="Spaargeld" stroke="#16a34a" strokeWidth={2} dot />
            <Line type="monotone" dataKey="Beleggingen" stroke="#d97706" strokeWidth={2} dot />
            <Line type="monotone" dataKey="Eigen woningwaarde" stroke="#7c3aed" strokeWidth={2} dot />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
