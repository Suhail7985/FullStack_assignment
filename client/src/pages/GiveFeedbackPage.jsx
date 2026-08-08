import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api/client';
import Layout from '../components/Layout';
import { ErrorState, LoadingState, PageHeader } from '../components/ui';

export default function GiveFeedbackPage() {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [scores, setScores] = useState({});
  const [reasons, setReasons] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .get('/feedback/to-give')
      .then((res) => {
        setData(res.data.data);
        const initialScores = {};
        const initialReasons = {};
        (res.data.data.parameters || []).forEach((p) => {
          initialScores[p._id] = '';
          initialReasons[p._id] = '';
        });
        setScores(initialScores);
        setReasons(initialReasons);
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load form'))
      .finally(() => setLoading(false));
  }, [employeeId]);

  const assignment = useMemo(
    () => data?.assignments?.find((a) => a.employee._id === employeeId),
    [data, employeeId]
  );

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    const parameters = data.parameters || [];
    for (const p of parameters) {
      const score = Number(scores[p._id]);
      if (!Number.isInteger(score) || score < 1 || score > 5) {
        setError(`Please select a score (1–5) for ${p.name}`);
        return;
      }
      if (!reasons[p._id]?.trim()) {
        setError(`Please provide a reason for ${p.name}`);
        return;
      }
    }

    setSubmitting(true);
    try {
      await api.post('/feedback', {
        cycleId: data.cycle._id,
        employeeId,
        responses: parameters.map((p) => ({
          parameterId: p._id,
          score: Number(scores[p._id]),
          reason: reasons[p._id].trim(),
        })),
      });
      setSuccess('Feedback submitted successfully.');
      setTimeout(() => navigate('/feedback/to-give'), 900);
    } catch (err) {
      setError(err.response?.data?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Layout>
      <PageHeader
        title="Give Feedback"
        subtitle={
          assignment
            ? `Employee: ${assignment.employee.name} · Cycle: ${data?.cycle?.label}`
            : undefined
        }
        actions={
          <Link to="/feedback/to-give" className="text-sm text-sea hover:underline">
            ← Back
          </Link>
        }
      />

      {loading && <LoadingState />}
      {!loading && !assignment && (
        <ErrorState message="No pending assignment found for this employee." />
      )}
      {!loading && assignment?.status === 'completed' && (
        <ErrorState message="Feedback already submitted for this employee in this cycle." />
      )}
      {!loading && data?.cycle?.status !== 'open' && (
        <ErrorState message="This feedback cycle is closed." />
      )}

      {!loading && assignment && assignment.status === 'pending' && data?.cycle?.status === 'open' && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>
          )}
          {success && (
            <div className="rounded-md bg-success/10 px-3 py-2 text-sm text-success">{success}</div>
          )}

          {data.parameters.map((param, index) => (
            <div key={param._id} className="rounded-xl border border-mist bg-white/80 p-5">
              <h2 className="font-display text-xl">
                {index + 1}. {param.name}
              </h2>
              <p className="mt-1 text-sm text-slate">{param.description}</p>

              <div className="mt-4">
                <p className="mb-2 text-sm font-medium">Score</p>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setScores((s) => ({ ...s, [param._id]: n }))}
                      className={`h-10 w-10 rounded-md border text-sm font-semibold transition ${
                        Number(scores[param._id]) === n
                          ? 'border-sea bg-sea text-white'
                          : 'border-mist bg-white hover:border-sea/50'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <label className="mt-4 block text-sm">
                <span className="mb-1 block font-medium">Reason</span>
                <textarea
                  required
                  rows={3}
                  value={reasons[param._id] || ''}
                  onChange={(e) =>
                    setReasons((r) => ({ ...r, [param._id]: e.target.value }))
                  }
                  className="w-full rounded-md border border-mist px-3 py-2 outline-none focus:border-sea"
                  placeholder={`Explain the ${param.name.toLowerCase()} rating...`}
                />
              </label>
            </div>
          ))}

          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-sea px-5 py-2.5 font-medium text-white hover:bg-sea-dark disabled:opacity-60"
          >
            {submitting ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </form>
      )}
    </Layout>
  );
}
