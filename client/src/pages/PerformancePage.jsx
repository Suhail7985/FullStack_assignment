import { useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import api from '../api/client';
import Layout from '../components/Layout';
import { EmptyState, ErrorState, LoadingState, PageHeader } from '../components/ui';

export default function PerformancePage() {
  const [data, setData] = useState(null);
  const [selectedParam, setSelectedParam] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/performance/history')
      .then((res) => {
        setData(res.data.data);
        const first = res.data.data.parameters?.[0]?.name;
        if (first) setSelectedParam(first);
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load history'))
      .finally(() => setLoading(false));
  }, []);

  const chartData = useMemo(() => {
    if (!data?.byParameter || !selectedParam) return [];
    const series = data.byParameter.find((p) => p.parameter.name === selectedParam);
    return (series?.series || [])
      .filter((point) => point.score != null)
      .map((point) => ({
        label: point.cycle.label,
        score: point.score,
      }));
  }, [data, selectedParam]);

  return (
    <Layout>
      <PageHeader
        title="My Performance"
        subtitle="Historical scores by parameter and month"
      />

      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}

      {!loading && !error && (!data?.history || data.history.length === 0) && (
        <EmptyState
          title="No performance history yet"
          description="Once your manager submits feedback, your monthly scores will show up here."
        />
      )}

      {!loading && !error && data?.history?.length > 0 && (
        <div className="space-y-8">
          <div className="overflow-x-auto rounded-xl border border-mist bg-white/80">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-mist/50 text-slate">
                <tr>
                  <th className="px-4 py-3 font-medium">Month</th>
                  {data.parameters.map((p) => (
                    <th key={p._id} className="px-4 py-3 font-medium">
                      {p.name}
                    </th>
                  ))}
                  <th className="px-4 py-3 font-medium">Avg</th>
                </tr>
              </thead>
              <tbody>
                {data.history.map((row) => (
                  <tr key={row.cycle._id} className="border-t border-mist">
                    <td className="px-4 py-3 font-medium">{row.cycle.label}</td>
                    {data.parameters.map((p) => (
                      <td key={p._id} className="px-4 py-3">
                        {row.scores[p.name] != null ? `${row.scores[p.name]}` : '—'}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-sea font-semibold">{row.average ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <section className="rounded-xl border border-mist bg-white/80 p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-xl">Parameter trend</h2>
              <select
                value={selectedParam}
                onChange={(e) => setSelectedParam(e.target.value)}
                className="rounded-md border border-mist px-3 py-2 text-sm"
              >
                {data.parameters.map((p) => (
                  <option key={p._id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8eef4" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="score"
                    name={selectedParam}
                    stroke="#1f6f8b"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="font-display text-xl">Details</h2>
            {data.history.map((row) => (
              <div key={`${row.cycle._id}-details`} className="rounded-xl border border-mist bg-white/80 p-5">
                <div className="mb-3 flex flex-wrap justify-between gap-2">
                  <p className="font-medium">{row.cycle.label}</p>
                  <p className="text-sm text-slate">Reviewer: {row.reviewer?.name}</p>
                </div>
                <div className="space-y-3">
                  {row.details.map((d) => (
                    <div key={`${row.cycle._id}-${d.parameterId}`}>
                      <p className="text-sm font-medium">
                        {d.parameter}: {d.score}/5
                      </p>
                      <p className="text-sm text-slate">{d.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>
        </div>
      )}
    </Layout>
  );
}
