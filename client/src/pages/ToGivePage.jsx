import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import Layout from '../components/Layout';
import { Badge, EmptyState, ErrorState, LoadingState, PageHeader } from '../components/ui';

export default function ToGivePage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/feedback/to-give')
      .then((res) => setData(res.data.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load assignments'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <PageHeader
        title="Team Feedback"
        subtitle={data?.cycle ? `Cycle: ${data.cycle.label} (${data.cycle.status})` : 'No open cycle'}
      />

      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}

      {!loading && !error && (!data?.assignments || data.assignments.length === 0) && (
        <EmptyState
          title="No feedback to give"
          description="You have no direct reports assigned for feedback in this cycle."
        />
      )}

      {!loading && !error && data?.assignments?.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-mist bg-white/80">
          <table className="w-full text-left text-sm">
            <thead className="bg-mist/50 text-slate">
              <tr>
                <th className="px-4 py-3 font-medium">Employee</th>
                <th className="px-4 py-3 font-medium">Parameters</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {data.assignments.map((a) => (
                <tr key={a._id} className="border-t border-mist">
                  <td className="px-4 py-3">
                    <p className="font-medium">{a.employee.name}</p>
                    <p className="text-xs text-slate">{a.employee.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    {a.submittedCount}/{a.expectedCount}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={a.status === 'completed' ? 'success' : 'warning'}>
                      {a.status === 'completed' ? 'Submitted' : 'Pending'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {a.status === 'pending' && data.cycle?.status === 'open' ? (
                      <Link
                        to={`/feedback/give/${a.employee._id}`}
                        className="font-medium text-sea hover:underline"
                      >
                        Give Feedback
                      </Link>
                    ) : (
                      <span className="text-slate">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}
