import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useData } from '../../context/DataContext';
import { Lote, EstadoLote } from '../../types/database';
import { toast } from 'sonner';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  ArrowRight, 
  RefreshCw,
  Info,
  ShieldCheck,
  Check,
  Search
} from 'lucide-react';

interface ImportarLotesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ParsedLotChange {
  matchedLote: Lote;
  original: {
    area_m2: number;
    precio_lista: number;
    referencia: string;
    estado: EstadoLote;
  };
  nuevo: {
    area_m2: number;
    precio_lista: number;
    referencia: string;
    estado: EstadoLote;
  };
  hasChanges: boolean;
  changesList: string[];
}

export const ImportarLotesModal: React.FC<ImportarLotesModalProps> = ({ isOpen, onClose }) => {
  const { lotes, actualizarLotesMasivo } = useData();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [protectSoldLots, setProtectSoldLots] = useState(true);

  // Analysis result
  const [parsedChanges, setParsedChanges] = useState<ParsedLotChange[]>([]);
  const [unmatchedRows, setUnmatchedRows] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'CHANGED' | 'ALL' | 'UNMATCHED'>('CHANGED');
  const [previewFilter, setPreviewFilter] = useState('');

  if (!isOpen) return null;

  // Clean and parse numbers (e.g. "S/ 29,800.00" -> 29800)
  const parseNumber = (val: any): number => {
    if (val === undefined || val === null || val === '') return 0;
    if (typeof val === 'number') return val;
    const str = String(val)
      .replace(/S\/?\.?/gi, '')
      .replace(/\$/g, '')
      .replace(/\s+/g, '')
      .replace(/,/g, '');
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
  };

  // Clean manzana (e.g. "MZ A" -> "A")
  const cleanManzana = (val: any): string => {
    if (!val) return '';
    return String(val)
      .toUpperCase()
      .replace(/^MZ\.?\s*/i, '')
      .replace(/^MANZANA\s*/i, '')
      .trim();
  };

  // Clean lote (e.g. "LT 12" -> "12")
  const cleanLote = (val: any): string => {
    if (!val) return '';
    return String(val)
      .replace(/^LT\.?\s*/i, '')
      .replace(/^LOTE\s*/i, '')
      .trim();
  };

  // Clean etapa (e.g. "Etapa 1" -> 1)
  const cleanEtapa = (val: any): number => {
    if (!val) return 1;
    const match = String(val).match(/\d+/);
    return match ? parseInt(match[0], 10) : 1;
  };

  // Generate lookup map of existing inventory: naturalKey -> Lote
  const getNaturalKey = (etapa: number | string, mz: string, lt: string | number) => {
    return `${Number(etapa || 1)}-${cleanManzana(mz)}-${cleanLote(lt)}`;
  };

  // Handle file upload and parsing
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsParsing(true);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (jsonData.length === 0) {
        toast.error('El archivo está vacío', {
          description: 'No se encontraron filas con datos en la primera hoja.'
        });
        setIsParsing(false);
        return;
      }

      // Build quick lookup for current lotes
      const currentLotsMap = new Map<string, Lote>();
      lotes.forEach(l => {
        const k = getNaturalKey(l.etapa, l.manzana, l.numero_lote);
        currentLotsMap.set(k, l);
      });

      const changes: ParsedLotChange[] = [];
      const unmatched: any[] = [];

      jsonData.forEach((row, index) => {
        // Normalize keys (case insensitive)
        const rowNorm: Record<string, any> = {};
        Object.keys(row).forEach(k => {
          rowNorm[k.trim().toUpperCase()] = row[k];
        });

        const rawEtapa = rowNorm['ETAPA'] ?? rowNorm['ETP'] ?? rowNorm['FASE'] ?? 1;
        const rawMz = rowNorm['MZ'] ?? rowNorm['MANZANA'] ?? rowNorm['MZA'] ?? '';
        const rawLt = rowNorm['LOTE'] ?? rowNorm['LT'] ?? rowNorm['NUMERO_LOTE'] ?? rowNorm['NUM_LOTE'] ?? '';
        const rawMetraje = rowNorm['METRAJE'] ?? rowNorm['AREA'] ?? rowNorm['AREA_M2'] ?? rowNorm['M2'] ?? '';
        const rawPrecio = rowNorm['PRECIO'] ?? rowNorm['PRECIO_LISTA'] ?? rowNorm['VALOR'] ?? rowNorm['MONTO'] ?? '';
        const rawRef = rowNorm['REFERENCIA'] ?? rowNorm['REF'] ?? rowNorm['UBICACION'] ?? '';
        const rawEstado = rowNorm['ESTADO'] ?? rowNorm['STATUS'] ?? '';

        if (!rawMz && !rawLt) return; // Skip empty rows

        const etapa = cleanEtapa(rawEtapa);
        const mz = cleanManzana(rawMz);
        const lt = cleanLote(rawLt);
        const key = `${etapa}-${mz}-${lt}`;

        const matched = currentLotsMap.get(key);

        if (!matched) {
          unmatched.push({
            rowNumber: index + 2,
            etapa,
            manzana: mz,
            numero_lote: lt,
            rawRow: row
          });
          return;
        }

        const newArea = rawMetraje !== '' ? parseNumber(rawMetraje) : matched.area_m2;
        const newPrecio = rawPrecio !== '' ? parseNumber(rawPrecio) : matched.precio_lista;
        const newRef = rawRef !== '' ? String(rawRef).trim().toUpperCase() : (matched.referencia || 'ESTANDAR');
        
        let newEstado: EstadoLote = matched.estado;
        if (rawEstado) {
          const st = String(rawEstado).trim().toUpperCase();
          if (['DISPONIBLE', 'VENDIDO', 'DESISTIDO'].includes(st)) {
            newEstado = st as EstadoLote;
          }
        }

        const diffs: string[] = [];
        if (newPrecio > 0 && Math.abs(newPrecio - matched.precio_lista) > 0.01) {
          diffs.push(`Precio: S/ ${matched.precio_lista.toLocaleString('es-PE')} → S/ ${newPrecio.toLocaleString('es-PE')}`);
        }
        if (newArea > 0 && Math.abs(newArea - matched.area_m2) > 0.01) {
          diffs.push(`Metraje: ${matched.area_m2} m² → ${newArea} m²`);
        }
        if (newRef && newRef !== (matched.referencia || 'ESTANDAR')) {
          diffs.push(`Referencia: ${matched.referencia || 'ESTANDAR'} → ${newRef}`);
        }
        if (newEstado !== matched.estado) {
          diffs.push(`Estado: ${matched.estado} → ${newEstado}`);
        }

        changes.push({
          matchedLote: matched,
          original: {
            area_m2: matched.area_m2,
            precio_lista: matched.precio_lista,
            referencia: matched.referencia || 'ESTANDAR',
            estado: matched.estado
          },
          nuevo: {
            area_m2: newArea > 0 ? newArea : matched.area_m2,
            precio_lista: newPrecio > 0 ? newPrecio : matched.precio_lista,
            referencia: newRef || matched.referencia || 'ESTANDAR',
            estado: newEstado
          },
          hasChanges: diffs.length > 0,
          changesList: diffs
        });
      });

      setParsedChanges(changes);
      setUnmatchedRows(unmatched);

      const modifiedCount = changes.filter(c => c.hasChanges).length;
      if (modifiedCount > 0) {
        setActiveTab('CHANGED');
        toast.info(`Lectura completada: ${changes.length} lotes reconocidos`, {
          description: `Se detectaron ${modifiedCount} lotes con actualizaciones de precio, metraje o referencia.`
        });
      } else {
        setActiveTab('ALL');
        toast.success(`Lectura completada: ${changes.length} lotes reconocidos`, {
          description: 'Todos los datos coinciden exactamente con el inventario actual.'
        });
      }
    } catch (err: any) {
      console.error('Error parsing excel:', err);
      toast.error('Error al leer el archivo Excel', {
        description: err?.message || 'Asegúrese de subir un archivo .xlsx o .csv válido.'
      });
    } finally {
      setIsParsing(false);
    }
  };

  // Download official Excel template with current lots
  const handleDownloadTemplate = () => {
    try {
      const templateData = lotes.map(l => ({
        ETAPA: l.etapa,
        MZ: l.manzana,
        LOTE: l.numero_lote,
        Metraje: l.area_m2,
        REFERENCIA: l.referencia || 'ESTANDAR',
        PRECIO: l.precio_lista,
        ESTADO: l.estado
      }));

      const ws = XLSX.utils.json_to_sheet(templateData);
      
      // Auto column widths
      ws['!cols'] = [
        { wch: 8 },  // ETAPA
        { wch: 8 },  // MZ
        { wch: 8 },  // LOTE
        { wch: 12 }, // Metraje
        { wch: 22 }, // REFERENCIA
        { wch: 14 }, // PRECIO
        { wch: 14 }  // ESTADO
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Plantilla_Inventario');
      XLSX.writeFile(wb, `Plantilla_Actualizar_Lotes_ECOSOL.xlsx`);

      toast.success('Plantilla descargada', {
        description: 'Edite los precios o metrajes en este archivo y vuelva a subirlo.'
      });
    } catch (err: any) {
      toast.error('Error al generar plantilla', { description: err?.message });
    }
  };

  // Apply updates to Supabase and Context
  const handleApplyUpdates = async () => {
    const toUpdate = parsedChanges.filter(c => c.hasChanges);

    if (toUpdate.length === 0) {
      toast.info('No hay cambios para aplicar', {
        description: 'Todos los lotes en el archivo tienen los mismos datos que el sistema.'
      });
      return;
    }

    setIsApplying(true);

    try {
      const payload = toUpdate.map(c => {
        // If protection is enabled and lot is sold, do not change state back to available
        const finalEstado: EstadoLote = (protectSoldLots && c.original.estado === 'VENDIDO')
          ? 'VENDIDO'
          : c.nuevo.estado;

        return {
          id: c.matchedLote.id,
          etapa: c.matchedLote.etapa,
          manzana: c.matchedLote.manzana,
          numero_lote: c.matchedLote.numero_lote,
          area_m2: c.nuevo.area_m2,
          precio_lista: c.nuevo.precio_lista,
          referencia: c.nuevo.referencia,
          estado: finalEstado
        };
      });

      const res = await actualizarLotesMasivo(payload);

      if (res.success) {
        toast.success('¡Inventario actualizado con éxito!', {
          description: `Se actualizaron ${res.count} lotes en la base de datos y en el CRM.`
        });
        onClose();
      } else {
        toast.error('Error al aplicar cambios', {
          description: res.error || 'Ocurrió un problema guardando en Supabase.'
        });
      }
    } catch (err: any) {
      console.error('Error applying lot updates:', err);
      toast.error('Error inesperado', { description: err?.message });
    } finally {
      setIsApplying(false);
    }
  };

  const changedItems = parsedChanges.filter(c => c.hasChanges);
  const unchangedItems = parsedChanges.filter(c => !c.hasChanges);

  const displayList = parsedChanges.filter(c => {
    if (activeTab === 'CHANGED' && !c.hasChanges) return false;
    if (previewFilter.trim()) {
      const q = previewFilter.toLowerCase();
      const mzMatch = `mz ${c.matchedLote.manzana}`.toLowerCase().includes(q) || c.matchedLote.manzana.toLowerCase().includes(q);
      const ltMatch = `lt ${c.matchedLote.numero_lote}`.toLowerCase().includes(q) || String(c.matchedLote.numero_lote).includes(q);
      const refMatch = c.nuevo.referencia.toLowerCase().includes(q);
      if (!mzMatch && !ltMatch && !refMatch) return false;
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100/80 border border-emerald-200 text-emerald-700 flex items-center justify-center shadow-2xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Actualizar Inventario con Excel / CSV
              </h2>
              <p className="text-xs text-slate-500">
                Sube una hoja de cálculo con nuevos precios, metrajes o referencias
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadTemplate}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              title="Descargar plantilla con los lotes actuales"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Descargar Plantilla Base</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* File Upload Zone */}
          {parsedChanges.length === 0 ? (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/30 hover:bg-emerald-50/60 rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center group"
              >
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform shadow-xs">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-bold text-slate-800 mb-1">
                  Arrastra o haz clic para subir tu Excel
                </h3>
                <p className="text-xs text-slate-500 max-w-md">
                  Formatos compatibles: <span className="font-semibold text-slate-700">.xlsx, .xls, .csv</span>.
                  El sistema cruzará automáticamente las filas por <b>Etapa</b>, <b>Manzana</b> y <b>Lote</b>.
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFile}
                  className="hidden"
                />
              </div>

              {/* Instructions Callout */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs text-slate-600 space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-800">
                  <Info className="w-4 h-4 text-emerald-600" />
                  <span>Columnas reconocidas automáticamente:</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="font-semibold text-emerald-700">ETAPA:</span> 1 o 2
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="font-semibold text-emerald-700">MZ:</span> A, B, C, D...
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="font-semibold text-emerald-700">LOTE:</span> 1, 2, 3...
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="font-semibold text-emerald-700">PRECIO:</span> ej. 29320
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="font-semibold text-emerald-700">Metraje:</span> ej. 120
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="font-semibold text-emerald-700">REFERENCIA:</span> PARQUE, etc.
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary Stats bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                    {changedItems.length}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-emerald-900">Con Cambios Detectados</div>
                    <div className="text-[11px] text-emerald-700">Precios, metrajes o referencias</div>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm">
                    {unchangedItems.length}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">Sin Cambios (Idénticos)</div>
                    <div className="text-[11px] text-slate-500">Mantienen sus valores actuales</div>
                  </div>
                </div>

                <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                    {unmatchedRows.length}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-amber-900">No Encontrados</div>
                    <div className="text-[11px] text-amber-700">Filas sin coincidencia en plano</div>
                  </div>
                </div>
              </div>

              {/* Protection switch */}
              <div className="bg-emerald-50/40 border border-emerald-200/80 rounded-xl p-3 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-emerald-900">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    <b>Proteger lotes vendidos:</b> Los lotes con contrato activo mantendrán su estado <b>VENDIDO</b> y solo se actualizará su precio de lista, metraje y referencia.
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={protectSoldLots}
                    onChange={(e) => setProtectSoldLots(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Navigation Tabs and Quick Search */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                <div className="flex items-center gap-1.5 text-xs">
                  <button
                    onClick={() => setActiveTab('CHANGED')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                      activeTab === 'CHANGED'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Lotes con Cambios ({changedItems.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('ALL')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                      activeTab === 'ALL'
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Todos Reconocidos ({parsedChanges.length})
                  </button>
                  {unmatchedRows.length > 0 && (
                    <button
                      onClick={() => setActiveTab('UNMATCHED')}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                        activeTab === 'UNMATCHED'
                          ? 'bg-amber-600 text-white shadow-2xs'
                          : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                      }`}
                    >
                      No encontrados ({unmatchedRows.length})
                    </button>
                  )}
                </div>

                <div className="relative w-full sm:w-60">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={previewFilter}
                    onChange={(e) => setPreviewFilter(e.target.value)}
                    placeholder="Filtrar por Mz, Lote..."
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Preview Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                {activeTab === 'UNMATCHED' ? (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3">Fila Excel</th>
                        <th className="py-2.5 px-3">Etapa</th>
                        <th className="py-2.5 px-3">Manzana</th>
                        <th className="py-2.5 px-3">Lote</th>
                        <th className="py-2.5 px-3">Motivo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {unmatchedRows.map((u, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-mono text-slate-500">#{u.rowNumber}</td>
                          <td className="py-2 px-3">Etapa {u.etapa}</td>
                          <td className="py-2 px-3 font-bold">Mz {u.manzana}</td>
                          <td className="py-2 px-3 font-bold">Lt {u.numero_lote}</td>
                          <td className="py-2 px-3 text-amber-600">No existe en el inventario maestro de 806 lotes</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3">Ubicación</th>
                        <th className="py-2.5 px-3">Estado</th>
                        <th className="py-2.5 px-3">Precio Lista</th>
                        <th className="py-2.5 px-3">Metraje</th>
                        <th className="py-2.5 px-3">Referencia</th>
                        <th className="py-2.5 px-3">Detalle Cambios</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {displayList.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            No hay lotes para mostrar en este filtro
                          </td>
                        </tr>
                      ) : (
                        displayList.map((item, idx) => {
                          const l = item.matchedLote;
                          const hasPriceChange = Math.abs(item.nuevo.precio_lista - item.original.precio_lista) > 0.01;
                          const hasAreaChange = Math.abs(item.nuevo.area_m2 - item.original.area_m2) > 0.01;
                          const hasRefChange = item.nuevo.referencia !== item.original.referencia;

                          return (
                            <tr key={idx} className={`hover:bg-slate-50 ${item.hasChanges ? 'bg-emerald-50/20' : ''}`}>
                              <td className="py-2 px-3">
                                <span className="font-bold text-slate-900">
                                  Mz {l.manzana} Lt {l.numero_lote}
                                </span>
                                <span className="block text-[10px] text-slate-400">
                                  Etapa {l.etapa} (ID: {l.id})
                                </span>
                              </td>

                              <td className="py-2 px-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                  l.estado === 'DISPONIBLE'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : l.estado === 'VENDIDO'
                                      ? 'bg-slate-100 text-slate-700 border-slate-200'
                                      : 'bg-rose-50 text-rose-700 border-rose-200'
                                }`}>
                                  {l.estado}
                                </span>
                              </td>

                              <td className="py-2 px-3">
                                {hasPriceChange ? (
                                  <div>
                                    <span className="line-through text-slate-400 mr-1.5 text-[11px]">
                                      S/ {item.original.precio_lista.toLocaleString('es-PE')}
                                    </span>
                                    <span className="font-bold text-emerald-700">
                                      S/ {item.nuevo.precio_lista.toLocaleString('es-PE')}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-slate-600 font-medium">
                                    S/ {l.precio_lista.toLocaleString('es-PE')}
                                  </span>
                                )}
                              </td>

                              <td className="py-2 px-3">
                                {hasAreaChange ? (
                                  <div>
                                    <span className="line-through text-slate-400 mr-1.5 text-[11px]">
                                      {item.original.area_m2} m²
                                    </span>
                                    <span className="font-bold text-emerald-700">
                                      {item.nuevo.area_m2} m²
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-slate-600">{l.area_m2} m²</span>
                                )}
                              </td>

                              <td className="py-2 px-3">
                                {hasRefChange ? (
                                  <span className="font-semibold text-emerald-700">
                                    {item.nuevo.referencia}
                                  </span>
                                ) : (
                                  <span className="text-slate-500">
                                    {l.referencia || 'ESTANDAR'}
                                  </span>
                                )}
                              </td>

                              <td className="py-2 px-3">
                                {item.hasChanges ? (
                                  <div className="flex flex-col gap-0.5">
                                    {item.changesList.map((ch, cIdx) => (
                                      <span key={cIdx} className="text-[10px] text-emerald-800 font-medium">
                                        • {ch}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-slate-400 italic">Sin cambios</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            {fileName && (
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Archivo: <b>{fileName}</b></span>
                <button
                  onClick={() => {
                    setParsedChanges([]);
                    setFileName(null);
                  }}
                  className="text-xs text-rose-600 hover:underline cursor-pointer ml-2"
                >
                  Cambiar archivo
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isApplying}
              className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            {parsedChanges.length > 0 && (
              <button
                onClick={handleApplyUpdates}
                disabled={isApplying || changedItems.length === 0}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isApplying ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Guardando en Supabase...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Aplicar {changedItems.length} Cambios al CRM</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
