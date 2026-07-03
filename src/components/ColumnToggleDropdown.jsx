import { Columns3, GripVertical, Check } from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";

/**
 * "Columns" dropdown — toggle column visibility (checkbox) and drag-to-reorder.
 * Driven entirely by a useColumnPreferences() return value passed as `prefs`.
 */
export function ColumnToggleDropdown({ prefs, align = "end" }) {
  const {
    orderedColumns,
    isVisible,
    dragOverId,
    onColDragStart,
    onColDragOver,
    onColDrop,
    onColDragEnd,
    toggleColumn,
    resetToDefault,
  } = prefs;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="border-slate-200 text-slate-600 hover:bg-slate-50 text-xs gap-1.5"
          data-testid="columns-toggle-btn"
        >
          <Columns3 className="w-3.5 h-3.5" /> Columns
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        className="w-56"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className="px-2 py-1.5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Columns</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Toggle · Drag to reorder</p>
        </div>
        <DropdownMenuSeparator />
        <div className="py-1">
          {orderedColumns
            .filter((c) => !c.alwaysVisible)
            .map((c) => (
              <div
                key={c.id}
                draggable
                onDragStart={() => onColDragStart(c.id)}
                onDragOver={(e) => onColDragOver(e, c.id)}
                onDrop={(e) => onColDrop(e, c.id)}
                onDragEnd={onColDragEnd}
                className={`flex items-center gap-2 px-2 py-1.5 rounded mx-1 cursor-grab active:cursor-grabbing transition-colors select-none ${
                  dragOverId === c.id
                    ? "bg-slate-100 border border-slate-300"
                    : "hover:bg-slate-100"
                }`}
              >
                <GripVertical className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                <span
                  className="flex-1 text-sm text-slate-700 cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); toggleColumn(c.id); }}
                >
                  {c.label}
                </span>
                <div
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors cursor-pointer ${
                    isVisible(c.id) ? "bg-slate-700 border-slate-700" : "border-slate-300"
                  }`}
                  onClick={(e) => { e.stopPropagation(); toggleColumn(c.id); }}
                >
                  {isVisible(c.id) && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                </div>
              </div>
            ))}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(e) => { e.preventDefault(); resetToDefault(); }}
          className="text-xs text-slate-500"
        >
          Reset to default
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
