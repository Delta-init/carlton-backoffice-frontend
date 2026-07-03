import { useState, useRef } from "react";

/**
 * Column visibility + drag-reorder preferences, persisted to localStorage.
 *
 * @param {Array<{id: string, label: string, defaultVisible?: boolean, alwaysVisible?: boolean, headClass?: string}>} columns
 * @param {string} storageKey  base key; uses `${storageKey}_columns` and `${storageKey}_order`
 */
export function useColumnPreferences(columns, storageKey) {
  const defaultVisible = new Set(
    columns.filter((c) => c.defaultVisible !== false).map((c) => c.id),
  );

  const [visibleColumns, setVisibleColumns] = useState(() => {
    if (typeof window === "undefined") return defaultVisible;
    try {
      const saved = localStorage.getItem(`${storageKey}_columns`);
      if (saved) return new Set(JSON.parse(saved));
    } catch (e) { /* ignore */ }
    return defaultVisible;
  });

  const [columnOrder, setColumnOrder] = useState(() => {
    const allIds = columns.map((c) => c.id);
    if (typeof window === "undefined") return allIds;
    try {
      const saved = localStorage.getItem(`${storageKey}_order`);
      if (saved) {
        const parsed = JSON.parse(saved);
        const savedSet = new Set(parsed);
        // keep saved order, then append any columns added since it was saved
        return [
          ...parsed.filter((id) => allIds.includes(id)),
          ...allIds.filter((id) => !savedSet.has(id)),
        ];
      }
    } catch (e) { /* ignore */ }
    return allIds;
  });

  // Drag state kept in a ref so dragging doesn't re-render every column
  const dragColId = useRef(null);
  const [dragOverId, setDragOverId] = useState(null);

  function onColDragStart(id) {
    dragColId.current = id;
  }

  function onColDragOver(e, id) {
    e.preventDefault();
    if (dragColId.current && dragColId.current !== id) setDragOverId(id);
  }

  function onColDrop(e, targetId) {
    e.preventDefault();
    const sourceId = dragColId.current;
    if (!sourceId || sourceId === targetId) { setDragOverId(null); return; }
    setColumnOrder((prev) => {
      const next = [...prev];
      const from = next.indexOf(sourceId);
      const to = next.indexOf(targetId);
      if (from === -1 || to === -1) return prev;
      next.splice(from, 1);
      next.splice(to, 0, sourceId);
      try { localStorage.setItem(`${storageKey}_order`, JSON.stringify(next)); } catch (e) { /* ignore */ }
      return next;
    });
    dragColId.current = null;
    setDragOverId(null);
  }

  function onColDragEnd() {
    dragColId.current = null;
    setDragOverId(null);
  }

  function toggleColumn(id) {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      try { localStorage.setItem(`${storageKey}_columns`, JSON.stringify(Array.from(next))); } catch (e) { /* ignore */ }
      return next;
    });
  }

  function resetToDefault() {
    const allIds = columns.map((c) => c.id);
    setColumnOrder(allIds);
    setVisibleColumns(new Set(defaultVisible));
    try {
      localStorage.setItem(`${storageKey}_columns`, JSON.stringify(Array.from(defaultVisible)));
      localStorage.setItem(`${storageKey}_order`, JSON.stringify(allIds));
    } catch (e) { /* ignore */ }
  }

  const orderedColumns = columnOrder
    .map((id) => columns.find((c) => c.id === id))
    .filter(Boolean);

  const isVisible = (id) => visibleColumns.has(id);

  return {
    orderedColumns,
    visibleColumns,
    isVisible,
    toggleColumn,
    resetToDefault,
    dragOverId,
    onColDragStart,
    onColDragOver,
    onColDrop,
    onColDragEnd,
  };
}
