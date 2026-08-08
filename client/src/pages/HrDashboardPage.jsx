import { useEffect, useState } from 'react';
import api from '../api/client';
import Layout from '../components/Layout';
import { Badge, EmptyState, ErrorState, LoadingState, PageHeader } from '../components/ui';

export default function HrDashboardPage() {
  const [cycles, setCycles] = useState([]);
  const [cycleId, setCycleId] = useState('');
  const [status, setStatus] = useState(null);
  const [pending, setPending] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [showPending, setShowPending] = useState(true);

  useEffect(() => {
    api
      .get('/feedback/cycles')
      .then((res) => {
        const list = res.data.data.cycles || [];
        setCycles(list);
        const open = list.find((c) => c.status === 'open') || list[0];
        if (open) setCycleId(open._id);
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load cycles'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!cycleId) return;
    setLoading(true);
    Promise.all([
      api.get('/hr/feedback-status', { params: { cycleId } }),
      api.get('/hr/pending-feedback', { params: { cycleId } }),
    ])
      .then(([statusRes, pendingRes]) => {
        setStatus(statusRes.data.data);
        setPending(pendingRes.data.data.pending || []);
        setError('');
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load HR data'))
      .finally(() => setLoading(false));
  }, [cycleId]);

  const summary = status?.summary;

  return (
    <Layout>
      <PageHeader
        title="HR Dashboard"
        subtitle={status?.company?.name ? `Company: ${status.company.name}` : 'Company feedback tracking'}
        actions={
          <select
            value={cycleId}
            onChange={(e) => setCycleId(e.target.value)}
            className="rounded-md border border-mist bg-white px-3 py-2 text-sm"
          >
            {cycles.map((c) => (
              <option key={c._id} value={c._id}>
                {c.label} ({c.status})
              </option>
            ))}
          </select>
        }
      />

      {error && <ErrorState message={error} />}
      {loading && <LoadingState />}

      {!loading && !error && status && (
        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-4">
            <Stat label="Expected" value={summary?.expected ?? 0} />
            <Stat label="Completed" value={summary?.submitted ?? 0} />
            <Stat label="Pending" value={summary?.pending ?? 0} />
            <Stat label="Completion" value={`${summary?.completion ?? 0}%`} />
          </div>

          <section>
            <h2 className="mb-3 font-display text-xl">Feedback Completion</h2>
            {(status.reviewers || []).length === 0 ? (
              <EmptyState title="No assignments" description="No feedback assignments for this cycle." />
            ) : (
              <div className="overflow-hidden rounded-xl border border-mist bg-white/80">
                <table className="w-full text-left text-sm">
                  <thead className="bg-mist/50 text-slate">
                    <tr>
                      <th className="px-4 py-3 font-medium">Reviewer</th>
                      <th className="px-4 py-3 font-medium">Expected</th>
                      <th className="px-4 py-3 font-medium">Submitted</th>
                      <th className="px-4 py-3 font-medium">Pending</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {status.reviewers.map((row) => (
                      <tr key={row.reviewer._id} className="border-t border-mist">
                        <td className="px-4 py-3 font-medium">{row.reviewer.name}</td>
                        <td className="px-4 py-3">{row.expected}</td>
                        <td className="px-4 py-3">{row.submitted}</td>
                        <td className="px-4 py-3">
                          {row.pending > 0 ? (
                            <button
                              type="button"
                              className="font-medium text-coral hover:underline"
                              onClick={() => setShowPending(true)}
                            >
                              {row.pending}
                            </button>
                          ) : (
                            0
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone={row.status === 'Complete' ? 'success' : 'warning'}>
                            {row.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {showPending && (
            <section>
              <h2 className="mb-3 font-display text-xl">Pending Feedback</h2>
              {pending.length === 0 ? (
                <EmptyState
                  title="No pending feedback"
                  description="All expected reviews for this cycle are complete."
                />
              ) : (
                <ul className="space-y-2 rounded-xl border border-mist bg-white/80 p-4">
                  {pending.map((item) => (
                    <li key={item._id} className="text-sm">
                      <span className="font-medium">{item.reviewer.name}</span>
                      <span className="text-slate"> → </span>
                      <span className="font-medium">{item.employee.name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      )}
    </Layout>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-mist bg-white/80 p-4">
      <p className="text-sm text-slate">{label}</p>
      <p className="mt-1 font-display text-3xl text-ink">{value}</p>
    </div>
  );
}
