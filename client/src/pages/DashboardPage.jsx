import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import { Badge, EmptyState, ErrorState, LoadingState, PageHeader } from '../components/ui';

export default function DashboardPage() {
  const { user, isHr } = useAuth();
  const [data, setData] = useState(null);
  const [team, setTeam] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/feedback/to-give'), api.get('/employees/team')])
      .then(([toGive, teamRes]) => {
        setData(toGive.data.data);
        setTeam(teamRes.data.data.team || []);
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  const pending = data?.assignments?.filter((a) => a.status === 'pending') || [];
  const submitted = data?.assignments?.filter((a) => a.status === 'completed') || [];

  return (
    <Layout>
      <PageHeader
        title={`Welcome, ${user?.name}`}
        subtitle={`${user?.company?.name} · ${data?.cycle?.label || 'No open cycle'}`}
      />

      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}

      {!loading && !error && (
        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-3">
            <Link
              to="/feedback/received"
              className="rounded-xl border border-mist bg-white/80 p-5 transition hover:border-sea/40"
            >
              <p className="text-sm text-slate">My Feedback</p>
              <p className="mt-2 font-display text-2xl">Reviews received</p>
            </Link>
            <Link
              to="/feedback/to-give"
              className="rounded-xl border border-mist bg-white/80 p-5 transition hover:border-sea/40"
            >
              <p className="text-sm text-slate">Team Feedback</p>
              <p className="mt-2 font-display text-2xl">
                {pending.length} pending
              </p>
            </Link>
            <Link
              to="/performance"
              className="rounded-xl border border-mist bg-white/80 p-5 transition hover:border-sea/40"
            >
              <p className="text-sm text-slate">Performance History</p>
              <p className="mt-2 font-display text-2xl">Scores over time</p>
            </Link>
          </div>

          {isHr && (
            <Link
              to="/hr"
              className="block rounded-xl border border-sea/20 bg-sea/5 px-5 py-4 text-sea hover:bg-sea/10"
            >
              Open HR Dashboard →
            </Link>
          )}

          <section>
            <h2 className="mb-3 font-display text-xl">My Team</h2>
            {team.length === 0 ? (
              <EmptyState
                title="No direct reports"
                description="You are not currently assigned as a manager for any employees."
              />
            ) : (
              <div className="overflow-hidden rounded-xl border border-mist bg-white/80">
                <table className="w-full text-left text-sm">
                  <thead className="bg-mist/50 text-slate">
                    <tr>
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Email</th>
                      <th className="px-4 py-3 font-medium">Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {team.map((member) => (
                      <tr key={member._id} className="border-t border-mist">
                        <td className="px-4 py-3 font-medium">{member.name}</td>
                        <td className="px-4 py-3 text-slate">{member.email}</td>
                        <td className="px-4 py-3 capitalize">{member.role}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 font-display text-xl">Pending Feedback</h2>
            {pending.length === 0 ? (
              <EmptyState
                title="All caught up"
                description={
                  submitted.length
                    ? `You have submitted feedback for ${submitted.length} team member(s) this cycle.`
                    : 'No feedback assignments for the current cycle.'
                }
              />
            ) : (
              <div className="space-y-3">
                {pending.map((a) => (
                  <div
                    key={a._id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-mist bg-white/80 px-4 py-3"
                  >
                    <div>
                      <p className="font-medium">{a.employee.name}</p>
                      <p className="text-sm text-slate">
                        {a.submittedCount}/{a.expectedCount} parameters ·{' '}
                        <Badge tone="warning">Pending</Badge>
                      </p>
                    </div>
                    <Link
                      to={`/feedback/give/${a.employee._id}`}
                      className="rounded-md bg-sea px-3 py-2 text-sm font-medium text-white hover:bg-sea-dark"
                    >
                      Give Feedback
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </Layout>
  );
}
