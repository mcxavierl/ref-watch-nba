export function SlateOfficialsLine({
  line,
  headRef,
  className = "",
}: {
  line?: string;
  headRef?: string;
  className?: string;
}) {
  if (!line) return null;

  if (!headRef || !line.includes(headRef)) {
    return <p className={className}>{line}</p>;
  }

  const index = line.indexOf(headRef);
  return (
    <p className={className}>
      {line.slice(0, index)}
      <strong>{headRef}</strong>
      {line.slice(index + headRef.length)}
    </p>
  );
}
