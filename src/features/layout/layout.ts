import type { Layout, LayoutColumn, ModuleId } from "../../domain/types";
export function moveModule(
  layout: Layout,
  id: ModuleId,
  index: number,
): Layout {
  const next = structuredClone(layout),
    item = next.modules.find((x) => x.id === id)!;
  const column: LayoutColumn = item.column;
  const items = next.modules
    .filter((x) => x.column === column && x.id !== id)
    .sort((a, b) => a.order - b.order);
  items.splice(Math.max(0, index), 0, item);
  items.forEach((x, i) => {
    x.order = i;
  });
  return next;
}
