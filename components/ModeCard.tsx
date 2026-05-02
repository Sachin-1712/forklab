export function ModeCard({
  title,
  description,
  label,
}: {
  title: string;
  description: string;
  label: string;
}) {
  return (
    <div className="card">
      <span className="badge warn">{label}</span>
      <h3 style={{ marginTop: 10 }}>{title}</h3>
      <p style={{ color: "var(--outline)", marginBottom: 0, fontSize: 13 }}>
        {description}
      </p>
    </div>
  );
}
