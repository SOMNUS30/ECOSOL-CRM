import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { TipoEgreso, CategoriaEgreso } from '../../types/database';
import { toast } from 'sonner';
import { 
  Wallet, 
  Plus, 
  Receipt, 
  PieChart, 
  TrendingDown,
  X,
  Check
} from 'lucide-react';

export const CajaChicaModule: React.FC = () => {
  const { egresos, registrarEgreso } = useData();

  // Filters
  const [selectedCategoria, setSelectedCategoria] = useState<string>('ALL');
  const [selectedTipo, setSelectedTipo] = useState<string>('ALL');

  // New Egreso Form Modal State
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [fecha, setFecha] = useState<string>(new Date().toISOString().split('T')[0]);
  const [tipo, setTipo] = useState<TipoEgreso>('VARIABLE');
  const [categoria, setCategoria] = useState<CategoriaEgreso>('Publicidad y Marketing');
  const [descripcion, setDescripcion] = useState<string>('');
  const [monto, setMonto] = useState<string>('');
  const [comprobante, setComprobante] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Financial summary
  const summary = useMemo(() => {
    const total = egresos.reduce((sum, e) => sum + Number(e.monto || 0), 0);
    const fijos = egresos.filter(e => e.tipo === 'FIJO').reduce((sum, e) => sum + Number(e.monto || 0), 0);
    const variables = egresos.filter(e => e.tipo === 'VARIABLE').reduce((sum, e) => sum + Number(e.monto || 0), 0);

    // Group by category
    const categoryMap = new Map<string, number>();
    egresos.forEach((e) => {
      const cat = e.categoria || 'Otros';
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + Number(e.monto || 0));
    });

    const categoriesBreakdown = Array.from(categoryMap.entries()).map(([cat, amount]) => ({
      categoria: cat,
      monto: amount,
      porcentaje: total > 0 ? Math.round((amount / total) * 100) : 0
    })).sort((a, b) => b.monto - a.monto);

    return { total, fijos, variables, categoriesBreakdown };
  }, [egresos]);

  // Filtered egresos
  const filteredEgresos = useMemo(() => {
    return egresos.filter((e) => {
      if (selectedCategoria !== 'ALL' && e.categoria !== selectedCategoria) return false;
      if (selectedTipo !== 'ALL' && e.tipo !== selectedTipo) return false;
      return true;
    });
  }, [egresos, selectedCategoria, selectedTipo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const parsedMonto = parseFloat(monto);
    if (isNaN(parsedMonto) || parsedMonto <= 0) {
      setErrorMsg('Por favor ingrese un monto válido.');
      return;
    }

    if (!descripcion.trim()) {
      setErrorMsg('La descripción del gasto es obligatoria.');
      return;
    }

    setIsSubmitting(true);
    try {
      const ok = await registrarEgreso({
        fecha,
        tipo,
        categoria,
        descripcion: descripcion.trim(),
        monto: parsedMonto,
        comprobante: comprobante.trim() || undefined
      });

      if (ok) {
        toast.success('Gasto registrado con éxito', {
          description: `S/ ${parsedMonto.toFixed(2)} registrado en ${categoria}.`,
          duration: 4000
        });
        setShowAddModal(false);
        setDescripcion('');
        setMonto('');
        setComprobante('');
      } else {
        setErrorMsg('No se pudo guardar el gasto.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error inesperado.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">
              Caja Chica &amp; Egresos
            </h1>
            <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
              {egresos.length} registros
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Control de gastos administrativos, publicidad y costos operativos
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Egreso</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Total Egresos */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              Total Egresos
            </span>
            <div className="w-7 h-7 rounded-md bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center">
              <TrendingDown className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold text-slate-900">
              S/ {summary.total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
            </span>
            <p className="text-[11px] text-slate-400 mt-0.5">Gasto operativo acumulado</p>
          </div>
        </div>

        {/* Egresos Fijos */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              Costos Fijos (Planilla / Local)
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
              Fijo
            </span>
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold text-slate-900">
              S/ {summary.fijos.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
            </span>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {summary.total > 0 ? Math.round((summary.fijos / summary.total) * 100) : 0}% del total
            </p>
          </div>
        </div>

        {/* Egresos Variables */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              Gastos Variables (Marketing / Campo)
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
              Variable
            </span>
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold text-slate-900">
              S/ {summary.variables.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
            </span>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {summary.total > 0 ? Math.round((summary.variables / summary.total) * 100) : 0}% del total
            </p>
          </div>
        </div>
      </div>

      {/* Category Breakdown & Table Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Category Breakdown List */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
          <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
            <PieChart className="w-4 h-4 text-slate-500" />
            <h3 className="font-semibold text-slate-800 text-xs">Porcentaje por Categoría</h3>
          </div>

          <div className="space-y-3">
            {summary.categoriesBreakdown.map((cat, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-700">{cat.categoria}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-slate-900">S/ {cat.monto.toLocaleString('es-PE')}</span>
                    <span className="text-slate-400 text-[10px]">({cat.porcentaje}%)</span>
                  </div>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${cat.porcentaje}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Expenses Table */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs flex flex-col">
          <div className="p-3.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-slate-500" />
              <h3 className="font-semibold text-slate-800 text-xs">Movimientos Registrados</h3>
            </div>

            {/* Filter selects */}
            <div className="flex items-center gap-2">
              <select
                value={selectedTipo}
                onChange={(e) => setSelectedTipo(e.target.value)}
                className="px-2 py-1 bg-white border border-slate-200 rounded-md text-slate-700 text-xs focus:outline-none"
              >
                <option value="ALL">Todos los Tipos</option>
                <option value="FIJO">Fijos</option>
                <option value="VARIABLE">Variables</option>
              </select>

              <select
                value={selectedCategoria}
                onChange={(e) => setSelectedCategoria(e.target.value)}
                className="px-2 py-1 bg-white border border-slate-200 rounded-md text-slate-700 text-xs focus:outline-none"
              >
                <option value="ALL">Todas las Categorías</option>
                <option value="Sueldos y Comisiones">Sueldos y Comisiones</option>
                <option value="Servicios Básicos">Servicios Básicos</option>
                <option value="Publicidad y Marketing">Publicidad y Marketing</option>
                <option value="Movilidad y Viáticos">Movilidad y Viáticos</option>
                <option value="Mantenimiento y Oficina">Mantenimiento y Oficina</option>
                <option value="Notaría y Trámites Legales">Notaría y Trámites</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-medium border-b border-slate-200 tracking-wider">
                <tr>
                  <th className="px-3.5 py-2.5">Fecha</th>
                  <th className="px-3.5 py-2.5">Tipo</th>
                  <th className="px-3.5 py-2.5">Categoría</th>
                  <th className="px-3.5 py-2.5">Descripción</th>
                  <th className="px-3.5 py-2.5">Comprobante</th>
                  <th className="px-3.5 py-2.5 text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredEgresos.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-3.5 py-2.5 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                      {e.fecha}
                    </td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        e.tipo === 'FIJO' 
                          ? 'bg-slate-100 text-slate-700' 
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {e.tipo}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 font-medium text-slate-800 whitespace-nowrap">
                      {e.categoria}
                    </td>
                    <td className="px-3.5 py-2.5 text-slate-600">
                      {e.descripcion}
                    </td>
                    <td className="px-3.5 py-2.5 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                      {e.comprobante || 'S/N'}
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-medium text-slate-900 whitespace-nowrap">
                      S/ {Number(e.monto).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Egreso Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-xl p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-700" />
                <span>Registrar Egreso Operativo</span>
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="mb-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-700 mb-1 font-medium text-[11px]">Fecha</label>
                  <input
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1 font-medium text-[11px]">Tipo de Gasto</label>
                  <select
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value as TipoEgreso)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="VARIABLE">Variable</option>
                    <option value="FIJO">Fijo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-medium text-[11px]">Categoría</label>
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value as CategoriaEgreso)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="Publicidad y Marketing">Publicidad y Marketing</option>
                  <option value="Sueldos y Comisiones">Sueldos y Comisiones</option>
                  <option value="Servicios Básicos">Servicios Básicos (Luz/Agua)</option>
                  <option value="Movilidad y Viáticos">Movilidad y Viáticos</option>
                  <option value="Mantenimiento y Oficina">Mantenimiento y Oficina</option>
                  <option value="Notaría y Trámites Legales">Notaría y Trámites</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-medium text-[11px]">Descripción</label>
                <input
                  type="text"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Ej: Publicidad en redes sociales"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-700 mb-1 font-medium text-[11px]">Monto (S/)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-semibold text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1 font-medium text-[11px]">N° Comprobante (opcional)</label>
                  <input
                    type="text"
                    value={comprobante}
                    onChange={(e) => setComprobante(e.target.value)}
                    placeholder="Ej: F001-120"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 uppercase font-mono text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 text-xs font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg text-xs flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Guardar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
