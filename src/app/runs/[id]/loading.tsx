export default function Loading() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading recommendations">
      <div className="skeleton h-16 w-80" />
      <div className="skeleton h-24 rounded-2xl" />
      <div className="card space-y-3 p-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="skeleton h-12" style={{ animationDelay: `${i * 80}ms` }} />
        ))}
      </div>
    </div>
  );
}
