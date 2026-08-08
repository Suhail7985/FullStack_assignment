import { useEffect, useState } from 'react';
import api from '../api/client';
import Layout from '../components/Layout';
import { EmptyState, ErrorState, LoadingState, PageHeader } from '../components/ui';

export default function ReceivedFeedbackPage() {
  const [reviews, setReviews] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/feedback/received')
      .then((res) => setReviews(res.data.data.reviews || []))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load feedback'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <PageHeader title="My Feedback" subtitle="Reviews you have received" />

      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}

      {!loading && !error && reviews.length === 0 && (
        <EmptyState
          title="No feedback yet"
          description="When your manager submits a review, it will appear here."
        />
      )}

      <div className="space-y-6">
        {reviews.map((review) => (
          <section
            key={review.cycle._id}
            className="rounded-xl border border-mist bg-white/80 p-5"
          >
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-2xl">{review.cycle.label}</h2>
              <p className="text-sm text-slate">
                Reviewer: <span className="font-medium text-ink">{review.reviewer?.name}</span>
              </p>
            </div>
            <div className="space-y-4">
              {review.parameters.map((item) => (
                <div key={item._id} className="border-t border-mist pt-4 first:border-0 first:pt-0">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{item.parameter?.name}</p>
                    <p className="text-sea font-semibold">{item.score}/5</p>
                  </div>
                  <p className="mt-1 text-sm text-slate">&ldquo;{item.reason}&rdquo;</p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </Layout>
  );
}
