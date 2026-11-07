"use client";

/* Graphiques SVG légers, accessibles (titre + tableau de données masqué). */

export interface Series {
  name: string;
  color: string;
  points: (number | null)[]; // 0..1
}

export function LineChart({ labels, series, height = 200, title }: { labels: string[]; series: Series[]; height?: number; title: string }) {
  const W = 600;
  const H = height;
  const pad = { l: 34, r: 10, t: 10, b: 24 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const x = (i: number) => pad.l + (labels.length <= 1 ? iw / 2 : (i / (labels.length - 1)) * iw);
  const y = (v: number) => pad.t + ih - v * ih;
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={title}>
        {[0, 0.25, 0.5, 0.75, 1].map((g) => (
          <g key={g}>
            <line x1={pad.l} x2={W - pad.r} y1={y(g)} y2={y(g)} stroke="var(--border)" />
            <text x={pad.l - 6} y={y(g) + 4} textAnchor="end" fontSize="10" fill="var(--text-faint)">{Math.round(g * 100)}</text>
          </g>
        ))}
        {labels.map((l, i) => (i % Math.ceil(labels.length / 8) === 0 || i === labels.length - 1 ? <text key={i} x={x(i)} y={H - 6} textAnchor="middle" fontSize="10" fill="var(--text-faint)">{l}</text> : null))}
        {series.map((s) => {
          const segs: string[] = [];
          let d = "";
          s.points.forEach((p, i) => {
            if (p === null) {
              if (d) segs.push(d);
              d = "";
              return;
            }
            d += `${d ? "L" : "M"}${x(i).toFixed(1)} ${y(p).toFixed(1)}`;
          });
          if (d) segs.push(d);
          return (
            <g key={s.name}>
              {segs.map((seg, k) => <path key={k} d={seg} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />)}
              {s.points.map((p, i) => (p === null ? null : <circle key={i} cx={x(i)} cy={y(p)} r="3" fill={s.color} />))}
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-2 flex flex-wrap gap-3 text-xs">
        {series.map((s) => <span key={s.name} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />{s.name}</span>)}
      </figcaption>
      <table className="sr-only">
        <caption>{title}</caption>
        <thead><tr><th>Période</th>{series.map((s) => <th key={s.name}>{s.name}</th>)}</tr></thead>
        <tbody>{labels.map((l, i) => <tr key={l + i}><td>{l}</td>{series.map((s) => <td key={s.name}>{s.points[i] === null ? "—" : `${Math.round((s.points[i] as number) * 100)} %`}</td>)}</tr>)}</tbody>
      </table>
    </figure>
  );
}

export function BarChart({ labels, values, color = "var(--primary)", title, unit = "" }: { labels: string[]; values: number[]; color?: string; title: string; unit?: string }) {
  const max = Math.max(1, ...values);
  return (
    <figure>
      <div className="flex h-40 items-end gap-1" role="img" aria-label={title}>
        {values.map((v, i) => (
          <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1" title={`${labels[i]} : ${v}${unit}`}>
            <div className="w-full rounded-t-md transition-all" style={{ height: `${(v / max) * 100}%`, minHeight: v ? 3 : 0, background: color }} />
            <span className="text-[0.6rem] text-faint">{labels[i]}</span>
          </div>
        ))}
      </div>
      <table className="sr-only"><caption>{title}</caption><tbody>{labels.map((l, i) => <tr key={i}><td>{l}</td><td>{values[i]}{unit}</td></tr>)}</tbody></table>
    </figure>
  );
}
