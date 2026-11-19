export interface HandPoint {
  hand_index: number;
  landmark_id: number;
  x: number;
  y: number;
}

const CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [0, 17], [17, 18], [18, 19], [19, 20],
];

export function HandSkeleton({ points, width, height }: {
  points: HandPoint[]; width: number; height: number;
}) {
  if (!points.length || width <= 0 || height <= 0) return null;
  const hands = new Map<number, Map<number, HandPoint>>();
  for (const point of points) {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) continue;
    if (!hands.has(point.hand_index)) hands.set(point.hand_index, new Map());
    hands.get(point.hand_index)!.set(point.landmark_id, point);
  }
  return (
    <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid slice">
      {[...hands].map(([handId, joints]) => (
        <g key={handId} stroke="#22ff66" strokeLinecap="round" strokeLinejoin="round">
          {CONNECTIONS.map(([from, to]) => {
            const a = joints.get(from);
            const b = joints.get(to);
            return a && b ? <line key={`${from}-${to}`} x1={a.x * width} y1={a.y * height}
              x2={b.x * width} y2={b.y * height} strokeWidth={3} vectorEffect="non-scaling-stroke" /> : null;
          })}
          {[...joints.values()].map((point) => <circle key={point.landmark_id}
            cx={point.x * width} cy={point.y * height} r={2.5} fill="#bbffcc" strokeWidth={1} />)}
        </g>
      ))}
    </svg>
  );
}
