const steps = [
  "Boot BrowserPod",
  "Write sample project",
  "Run failing test",
  "Apply deterministic patch",
  "Rerun passing test",
  "Generate proof report",
];

export function SprintTimeline({ activeIndex }: { activeIndex: number }) {
  return (
    <div className="card">
      <h3>Sprint timeline</h3>
      <div className="timeline">
        {steps.map((step, index) => {
          const state =
            index < activeIndex ? "done" : index === activeIndex ? "active" : "";
          return (
            <div className={`timeline-step ${state}`} key={step}>
              <span className="dot" />
              <span>{step}</span>
              <span>{index < activeIndex ? "done" : index === activeIndex ? "now" : "queued"}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
