import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { 
  Database, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Code, 
  X
} from 'lucide-react';

type TableKey = 'clientes' | 'lotes' | 'contratos' | 'pagos' | 'egresos';

export const AuditoriaModule: React.FC = () => {
  const { clientes, lotes, contratos, pagos, egresos } = useData();

  const [activeTable, setActiveTable] = useState<TableKey>('contratos');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [inspectedRow, setInspectedRow] = useState<any | null>(null);

  // Table options
  const tableOptions: { key: TableKey; label: string; count: number; desc: string }[] = [
    { key: 'contratos', label: 'contratos', count: contratos.length, desc: 'Expedientes y financiamiento' },
    { key: 'clientes', label: 'clientes', count: clientes.length, desc: 'Padrón de adquirentes' },
    { key: 'lotes', label: 'lotes', count: lotes.length, desc: 'Inventario y zonificación' },
    { key: 'pagos', label: 'pagos', count: pagos.length, desc: 'Historial de transacciones' },
    { key: 'egresos', label: 'egresos', count: egresos.length, desc: 'Caja chica y gastos' },
  ];

  // Current dataset
  const currentDataset = useMemo(() => {
    switch (activeTable) {
      case 'clientes': return clientes;
      case 'lotes': return lotes;
      case 'contratos': return contratos;
      case 'pagos': return pagos;
      case 'egresos': return egresos;
    }
  }, [activeTable, clientes, lotes, contratos, pagos, egresos]);

  // Columns from first item
  const columns = useMemo(() => {
    if (!currentDataset || currentDataset.length === 0) return [];
    return Object.keys(currentDataset[0]).filter(k => k !== 'cliente' && k !== 'lote');
  }, [currentDataset]);

  // Universal text search
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return currentDataset;
    const q = searchTerm.toLowerCase();

    return currentDataset.filter((item: any) => {
      return Object.entries(item).some(([k, val]) => {
        if (val === null || val === undefined) return false;
        if (typeof val === 'object') return false;
        return String(val).toLowerCase().includes(q);
      });
    });
  }, [currentDataset, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  // Export CSV
  const handleExportTable = () => {
    if (filteredData.length === 0) return;
    const headers = columns;
    const rows = filteredData.map((row: any) => {
      return headers.map(h => {
        const val = row[h];
        if (val === null || val === undefined) return '""';
        return `"${String(val).replace(/"/g, '""')}"`;
      });
    });

    const csv = '\uFEFF' + [headers.join(','), ...rows.map((r: string[]) => r.join(','))].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Supabase_${activeTable}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">
              Auditoría de Base de Datos
            </h1>
            <span className="px-2 py-0.5 rounded-md text-xs font-mono font-medium bg-slate-100 text-slate-700 border border-slate-200">
              public.{activeTable}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Inspección de tablas relacionales de PostgreSQL en Supabase
          </p>
        </div>

        <button
          onClick={handleExportTable}
          className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          <span>Exportar Tabla (CSV)</span>
        </button>
      </div>

      {/* Table Selector Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        {tableOptions.map((tbl) => {
          const isActive = activeTable === tbl.key;
          return (
            <button
              key={tbl.key}
              onClick={() => {
                setActiveTable(tbl.key);
                setSearchTerm('');
                setCurrentPage(1);
              }}
              className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                isActive
                  ? 'bg-white border-emerald-500 ring-1 ring-emerald-500/20 shadow-xs'
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`font-mono text-xs font-semibold ${isActive ? 'text-emerald-700' : 'text-slate-800'}`}>
                  {tbl.label}
                </span>
                <span className={`text-[10px] font-medium px-1.5 py-0.2 rounded ${
                  isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
                }`}>
                  {tbl.count}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                {tbl.desc}
              </p>
            </button>
          );
        })}
      </div>

      {/* Search & Dynamic Page Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={`Buscar en ${activeTable}...`}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-slate-500">
          <span>Filas:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-2 py-1 bg-white border border-slate-200 rounded-md text-slate-700 text-xs focus:outline-none"
          >
            <option value={15}>15</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      {/* Main Data Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-mono text-[11px] font-medium border-b border-slate-200 tracking-wider">
              <tr>
                <th className="px-3.5 py-2.5 w-12 text-center">#</th>
                {columns.map((col) => (
                  <th key={col} className="px-3.5 py-2.5 whitespace-nowrap">
                    {col}
                  </th>
                ))}
                <th className="px-3.5 py-2.5 text-center">JSON</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {paginatedData.map((row: any, idx: number) => {
                const rowIndex = (currentPage - 1) * pageSize + idx + 1;
                return (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-3.5 py-2.5 text-center font-mono text-[11px] text-slate-400">
                      {rowIndex}
                    </td>
                    {columns.map((col) => {
                      const val = row[col];
                      const isNumeric = typeof val === 'number';
                      const isDate = col.includes('fecha');

                      return (
                        <td key={col} className={`px-3.5 py-2.5 whitespace-nowrap ${isNumeric ? 'font-mono text-slate-900 font-medium' : ''}`}>
                          {val === null || val === undefined ? (
                            <span className="text-slate-300 italic">null</span>
                          ) : isDate ? (
                            <span className="font-mono text-slate-500">{String(val)}</span>
                          ) : (
                            String(val)
                          )}
                        </td>
                      );
                    })}
                    <td className="px-3.5 py-2.5 text-center">
                      <button
                        onClick={() => setInspectedRow(row)}
                        title="Ver payload JSON"
                        className="p-1 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        <Code className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-3 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            <span>Página <b>{currentPage}</b> de <b>{totalPages}</b></span>
            <span className="mx-2">•</span>
            <span>Total: <b>{filteredData.length}</b> registros en <code>{activeTable}</code></span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage >= totalPages}
              className="p-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* JSON Inspector Modal */}
      {inspectedRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-xl shadow-xl p-5 flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-emerald-700" />
                <h3 className="font-mono text-xs font-semibold text-slate-900">
                  PostgreSQL Row ({activeTable})
                </h3>
              </div>
              <button
                onClick={() => setInspectedRow(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="my-3 flex-1 overflow-auto rounded-lg bg-slate-50 p-3.5 border border-slate-200">
              <pre className="text-xs font-mono text-slate-800 whitespace-pre-wrap">
                {JSON.stringify(inspectedRow, null, 2)}
              </pre>
            </div>

            <div className="pt-2 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setInspectedRow(null)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 shadow-xs cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
