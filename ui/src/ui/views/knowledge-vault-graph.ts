import type { VaultGraphEdge, VaultGraphNode } from "../controllers/vault.ts";

export type GraphLayoutNode = VaultGraphNode & {
  x: number;
  y: number;
  vx: number;
  vy: number;
};

const NODE_RADIUS = 28;

export function layoutVaultGraph(
  nodes: VaultGraphNode[],
  edges: VaultGraphEdge[],
  width: number,
  height: number,
  selectedPath?: string | null,
): GraphLayoutNode[] {
  if (nodes.length === 0) return [];
  const cx = width / 2;
  const cy = height / 2;
  const radius =
    nodes.length === 1
      ? 0
      : Math.min(width, height) * (nodes.length <= 4 ? 0.28 : 0.35);
  const layout: GraphLayoutNode[] = nodes.map((n, i) => {
    const angle = (2 * Math.PI * i) / nodes.length - Math.PI / 2;
    return {
      ...n,
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
      vx: 0,
      vy: 0,
    };
  });
  const byPath = new Map(layout.map((n) => [n.path, n]));
  const iterations = edges.length === 0 ? 0 : Math.min(120, 40 + edges.length * 2);
  for (let step = 0; step < iterations; step++) {
    for (const n of layout) {
      n.vx = 0;
      n.vy = 0;
    }
    for (let i = 0; i < layout.length; i++) {
      for (let j = i + 1; j < layout.length; j++) {
        const a = layout[i];
        const b = layout[j];
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        const dist = Math.max(Math.hypot(dx, dy), 1);
        const force = 9000 / (dist * dist);
        dx = (dx / dist) * force;
        dy = (dy / dist) * force;
        a.vx += dx;
        a.vy += dy;
        b.vx -= dx;
        b.vy -= dy;
      }
    }
    for (const e of edges) {
      const a = byPath.get(e.source);
      const b = byPath.get(e.target);
      if (!a || !b) continue;
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      const dist = Math.max(Math.hypot(dx, dy), 1);
      const force = (dist - 140) * 0.04;
      dx = (dx / dist) * force;
      dy = (dy / dist) * force;
      a.vx += dx;
      a.vy += dy;
      b.vx -= dx;
      b.vy -= dy;
    }
    for (const n of layout) {
      n.vx += (cx - n.x) * 0.002;
      n.vy += (cy - n.y) * 0.002;
      n.x += n.vx * 0.15;
      n.y += n.vy * 0.15;
      n.x = Math.max(NODE_RADIUS + 8, Math.min(width - NODE_RADIUS - 8, n.x));
      n.y = Math.max(NODE_RADIUS + 8, Math.min(height - NODE_RADIUS - 8, n.y));
    }
  }
  if (selectedPath) {
    const sel = byPath.get(selectedPath);
    if (sel) {
      sel.x = cx;
      sel.y = cy;
    }
  }
  return layout;
}

export { NODE_RADIUS };
