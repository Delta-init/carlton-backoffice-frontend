import { Button } from './ui/button';

export default function PaginationControls({ currentPage, totalPages, totalItems, pageSize, onPageChange, onPageSizeChange }) {
  const pageSizes = [10, 20, 50, 100];
  const start = Math.min(((currentPage - 1) * pageSize) + 1, totalItems);
  const end = Math.min(currentPage * pageSize, totalItems);

  const getPageNumbers = () => {
    const pages = [];
    let s = Math.max(1, currentPage - 2);
    let e = Math.min(totalPages, s + 4);
    if (e - s < 4) s = Math.max(1, e - 4);
    for (let i = s; i <= e; i++) pages.push(i);
    return pages;
  };

  if (totalItems === 0) return null;

  return (
    <div className="flex items-center justify-between px-2 py-3" data-testid="pagination-controls">
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-500">Rows per page:</span>
        <select
          value={pageSize}
          onChange={e => onPageSizeChange(Number(e.target.value))}
          className="px-2 py-1 text-sm border border-slate-200 rounded-md bg-white text-slate-700"
          data-testid="page-size-select"
        >
          {pageSizes.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="text-sm text-slate-400">{start}–{end} of {totalItems}</span>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => onPageChange(1)} className="h-8 px-2 text-xs border-slate-200" data-testid="page-first">First</Button>
        <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)} className="h-8 px-3 text-xs border-slate-200" data-testid="page-prev">Prev</Button>
        {getPageNumbers().map(i => (
          <Button
            key={i}
            variant={i === currentPage ? 'default' : 'outline'}
            size="sm"
            onClick={() => onPageChange(i)}
            className={`h-8 w-8 text-xs ${i === currentPage ? 'bg-indigo-600 !text-white border-indigo-600 hover:bg-indigo-700' : 'border-slate-200 text-slate-700'}`}
            data-testid={`page-${i}`}
          >
            {i}
          </Button>
        ))}
        <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => onPageChange(currentPage + 1)} className="h-8 px-3 text-xs border-slate-200" data-testid="page-next">Next</Button>
        <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => onPageChange(totalPages)} className="h-8 px-2 text-xs border-slate-200" data-testid="page-last">Last</Button>
      </div>
    </div>
  );
}
