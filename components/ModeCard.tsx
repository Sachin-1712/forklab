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
      <h3 style={{ marginTop: 14 }}>{title}</h3>
      <p style={{ color: "var(--muted)", marginBottom: 0 }}>{description}</p>
    </div>
  );
}
