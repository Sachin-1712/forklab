export function DiffViewer({ diff }: { diff: string }) {
  return (
    <div className="diff" aria-label="Before and after diff">
      <pre>{diff}</pre>
    </div>
  );
}
