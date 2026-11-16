import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Calendar,
  ChevronRight,
  X,
  Copy,
  Download,
  Share2,
  ArrowDownLeft,
  ArrowUpRight,
  FileText,
} from 'lucide-react';
import { BankMovement, MovementFilter } from '../types';
import { money } from '../utils/speech';
import {
  formatMovementDayDate,
  formatMovementTime,
  getMovementDateKey,
} from '../data/movements';
import { DEFAULT_ORIGIN_ACCOUNT } from '../data/contacts';
import { BancoEstadoLogo } from './BancoEstadoLogo';
import { hapticTap, hapticSelection, hapticSuccess } from '../utils/haptics';

interface MovementsViewProps {
  balance: number;
  movements: BankMovement[];
  initialFilter?: MovementFilter;
  onBack: () => void;
  onNotify: (msg: string) => void;
}

export const MovementsView: React.FC<MovementsViewProps> = ({
  balance,
  movements,
  initialFilter = 'todos',
  onBack,
  onNotify,
}) => {
  const [showBalance, setShowBalance] = useState(true);
  const [filter, setFilter] = useState<MovementFilter>(initialFilter);
  const [selectedMovement, setSelectedMovement] = useState<BankMovement | null>(null);
  const [isCartolaOpen, setIsCartolaOpen] = useState(false);

  // Filtrado y agrupación por día y fecha en orden descendente
  const filteredMovements = useMemo(() => {
    return movements
      .filter((m) => {
        if (filter === 'abonos') return m.type === 'abono';
        if (filter === 'cargos') return m.type === 'cargo';
        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.timestampIso).getTime() - new Date(a.timestampIso).getTime()
      );
  }, [movements, filter]);

  const groupedMovements = useMemo(() => {
    const groups: Array<{
      dateKey: string;
      label: string;
      items: BankMovement[];
    }> = [];

    for (const item of filteredMovements) {
      const key = getMovementDateKey(item.timestampIso);
      const existing = groups.find((g) => g.dateKey === key);
      if (existing) {
        existing.items.push(item);
      } else {
        groups.push({
          dateKey: key,
          label: formatMovementDayDate(item.timestampIso),
          items: [item],
        });
      }
    }

    return groups;
  }, [filteredMovements]);

  const emittedAt = useMemo(() => {
    return new Intl.DateTimeFormat('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date());
  }, [isCartolaOpen]);

  const handleOpenCartolaPreview = () => {
    hapticTap();
    setIsCartolaOpen(true);
  };

  // Genera una imagen PNG de alta resolución representando la cartola oficial para descargar o compartir
  const renderCartolaPngBlob = async (): Promise<Blob | null> => {
    const rows = filteredMovements.slice(0, 12);
    const width = 920;
    const rowHeight = 84;
    const headerHeight = 320;
    const footerHeight = 96;
    const height = headerHeight + Math.max(rows.length, 1) * rowHeight + footerHeight;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Fondo documento blanco limpio
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    // Franja superior corporativa naranja BancoEstado
    const grad = ctx.createLinearGradient(0, 0, width, 0);
    grad.addColorStop(0, '#F77F00');
    grad.addColorStop(1, '#FF9A3C');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, 116);

    // Isotipo cuadrado simplificado en canvas
    ctx.fillStyle = '#C8082B';
    ctx.fillRect(36, 26, 56, 56);
    ctx.fillStyle = '#F26822';
    ctx.fillRect(72, 36, 20, 36);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(54, 34, 18, 38);
    ctx.fillStyle = '#004B93';
    ctx.fillRect(36, 72, 56, 10);

    // Título marca y subtítulo documento
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 34px "Open Sans", Arial, sans-serif';
    ctx.fillText('BancoEstado', 108, 60);
    ctx.font = '600 18px "Open Sans", Arial, sans-serif';
    ctx.fillStyle = '#FFF7ED';
    ctx.fillText('CARTOLA OFICIAL DE MOVIMIENTOS · EMPRENDIMIENTO', 108, 88);

    // Fecha de emisión a la derecha
    ctx.textAlign = 'right';
    ctx.font = '600 16px "Open Sans", Arial, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`Emitida: ${emittedAt} hrs`, width - 36, 62);
    ctx.textAlign = 'left';

    // Bloque resumen de cuenta y saldo actual
    ctx.fillStyle = '#F4F6FA';
    ctx.fillRect(36, 140, width - 72, 144);
    ctx.strokeStyle = '#DCE1EB';
    ctx.lineWidth = 2;
    ctx.strokeRect(36, 140, width - 72, 144);

    ctx.fillStyle = '#535F7A';
    ctx.font = 'bold 16px "Open Sans", Arial, sans-serif';
    ctx.fillText('PRODUCTO', 60, 174);
    ctx.fillStyle = '#1E2538';
    ctx.font = 'bold 24px "Open Sans", Arial, sans-serif';
    ctx.fillText(DEFAULT_ORIGIN_ACCOUNT, 60, 206);
    ctx.fillStyle = '#535F7A';
    ctx.font = '600 16px "Open Sans", Arial, sans-serif';
    ctx.fillText('Retenciones: $0 · Estado: Vigente', 60, 240);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#535F7A';
    ctx.font = 'bold 16px "Open Sans", Arial, sans-serif';
    ctx.fillText('SALDO DISPONIBLE ACTUAL', width - 60, 174);
    ctx.fillStyle = '#1E2538';
    ctx.font = 'bold 40px "Open Sans", Arial, sans-serif';
    ctx.fillText(money(balance), width - 60, 224);
    ctx.fillStyle = '#29398E';
    ctx.font = 'bold 16px "Open Sans", Arial, sans-serif';
    ctx.fillText(`Filtro: ${filter.toUpperCase()} (${rows.length} movimientos)`, width - 60, 254);
    ctx.textAlign = 'left';

    // Título de tabla
    ctx.fillStyle = '#1E2538';
    ctx.font = 'bold 20px "Open Sans", Arial, sans-serif';
    ctx.fillText('Detalle de movimientos', 36, 312);

    // Filas de movimientos
    let y = 328;
    if (rows.length === 0) {
      ctx.fillStyle = '#535F7A';
      ctx.font = '600 18px "Open Sans", Arial, sans-serif';
      ctx.fillText('No hay movimientos registrados para este filtro.', 36, y + 44);
    } else {
      rows.forEach((m, index) => {
        if (index % 2 === 0) {
          ctx.fillStyle = '#FAFBFD';
          ctx.fillRect(36, y, width - 72, rowHeight);
        }
        ctx.strokeStyle = '#E6EAF2';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(36, y + rowHeight);
        ctx.lineTo(width - 36, y + rowHeight);
        ctx.stroke();

        // Título y contraparte
        ctx.fillStyle = '#1E2538';
        ctx.font = 'bold 20px "Open Sans", Arial, sans-serif';
        ctx.fillText(m.title.slice(0, 46), 52, y + 34);

        ctx.fillStyle = '#535F7A';
        ctx.font = '600 16px "Open Sans", Arial, sans-serif';
        const dateLine = `${formatMovementDayDate(m.timestampIso)} · ${formatMovementTime(
          m.timestampIso
        )} hrs · ${m.counterpartyName}${m.counterpartyRut ? ` (${m.counterpartyRut})` : ''}`;
        ctx.fillText(dateLine.slice(0, 68), 52, y + 62);

        // Monto a la derecha
        ctx.textAlign = 'right';
        ctx.fillStyle = m.type === 'abono' ? '#0D8F72' : '#D9383A';
        ctx.font = 'bold 22px "Open Sans", Arial, sans-serif';
        const signed = m.type === 'abono' ? `+${money(m.amount)}` : `-${money(m.amount)}`;
        ctx.fillText(signed, width - 52, y + 40);

        ctx.fillStyle = '#535F7A';
        ctx.font = '600 14px "Open Sans", Arial, sans-serif';
        ctx.fillText(`Folio ${m.opNumber}`, width - 52, y + 64);
        ctx.textAlign = 'left';

        y += rowHeight;
      });
    }

    // Pie institucional
    ctx.fillStyle = '#535F7A';
    ctx.font = '600 15px "Open Sans", Arial, sans-serif';
    ctx.fillText(
      'Comprobante visual de cartola generado desde la aplicación para respaldo de tu emprendimiento.',
      36,
      height - 38
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    });
  };

  const handleDownloadCartolaPng = async () => {
    hapticSuccess();
    const blob = await renderCartolaPngBlob();
    if (!blob) {
      onNotify('No se pudo generar la imagen de la cartola.');
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cartola-bancoestado-${getMovementDateKey(new Date().toISOString())}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    onNotify('✓ Cartola oficial descargada');
  };

  const handleShareCartolaDocument = async () => {
    hapticTap();
    const textLines = [
      `CARTOLA OFICIAL BANCOESTADO · ${DEFAULT_ORIGIN_ACCOUNT}`,
      `Emitida: ${emittedAt} hrs`,
      `Saldo disponible actual: ${money(balance)}`,
      '',
      ...filteredMovements.slice(0, 12).map((m) => {
        const sign = m.type === 'abono' ? '+' : '-';
        return `• ${formatMovementDayDate(m.timestampIso)} (${formatMovementTime(
          m.timestampIso
        )}): ${m.title} — ${m.counterpartyName} | ${sign}${money(m.amount)}`;
      }),
    ];
    const shareText = textLines.join('\n');

    try {
      const blob = await renderCartolaPngBlob();
      if (blob && navigator.share) {
        const file = new File([blob], 'cartola-bancoestado.png', { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: 'Cartola Oficial BancoEstado',
            text: `Cartola ${DEFAULT_ORIGIN_ACCOUNT} · Saldo ${money(balance)}`,
            files: [file],
          });
          onNotify('✓ Cartola compartida');
          return;
        }
      }
      if (navigator.share) {
        await navigator.share({
          title: 'Cartola Oficial BancoEstado',
          text: shareText,
        });
        onNotify('✓ Cartola compartida');
        return;
      }
    } catch {
      // Si el usuario cancela o no está disponible, continuar a respaldo
    }

    navigator.clipboard?.writeText(shareText).catch(() => {});
    await handleDownloadCartolaPng();
    onNotify('✓ Cartola descargada y copiada para compartir');
  };

  const handleCopyMovementDetail = (m: BankMovement) => {
    hapticTap();
    const sign = m.type === 'abono' ? 'Abono (+)' : 'Cargo (-)';
    const text = [
      `Detalle de Movimiento BancoEstado`,
      `Tipo: ${sign}`,
      `Monto: ${money(m.amount)}`,
      `Fecha: ${formatMovementDayDate(m.timestampIso)}`,
      `Hora: ${formatMovementTime(m.timestampIso)} hrs`,
      `${m.type === 'abono' ? 'Remitente' : 'Destinatario'}: ${m.counterpartyName}`,
      `RUT: ${m.counterpartyRut || 'No informado'}`,
      `Banco: ${m.counterpartyBank || 'BancoEstado'}`,
      `Cuenta: ${m.counterpartyAccount || 'CuentaRUT'}`,
      `Concepto: ${m.concept || m.title}`,
      `N° Operación: ${m.opNumber}`,
    ].join('\n');

    navigator.clipboard?.writeText(text).catch(() => {});
    onNotify('Detalle del movimiento copiado.');
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#F4F6FA] relative">
      {/* Barra superior blanca oficial "Saldos y movimientos" */}
      <header className="bg-white border-b border-slate-200/80 px-3 py-3 flex items-center gap-2 shrink-0">
        <button
          onClick={() => {
            hapticTap();
            onBack();
          }}
          className="min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center text-[#29398E] hover:bg-indigo-50/70 transition-colors active:scale-95 cursor-pointer"
          aria-label="Volver al inicio"
          type="button"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-[19px] font-extrabold text-[#1E2538] tracking-tight">
          Saldos y movimientos
        </h1>
      </header>

      {/* Contenido principal desplazable */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8 space-y-4 overscroll-contain">
        {/* Tarjeta resumen de saldo CuentaRUT */}
        <section className="bg-white rounded-2xl p-4 shadow-[0_2px_10px_rgba(25,35,70,0.06)] border border-slate-100">
          <div className="text-[15px] text-[#1E2538]">
            <span className="font-extrabold">CuentaRUT</span>{' '}
            <span className="font-semibold text-slate-600 tabular-nums">00015748293</span>
          </div>

          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-[32px] font-black tracking-tight text-[#1E2538] tabular-nums font-['Nunito']">
              {showBalance ? money(balance) : '$ •••••••'}
            </span>
            <button
              onClick={() => {
                hapticSelection();
                setShowBalance(!showBalance);
              }}
              className="min-w-[40px] min-h-[40px] text-[#29398E] rounded-full flex items-center justify-center hover:bg-indigo-50/60 transition-colors cursor-pointer"
              aria-label={showBalance ? 'Ocultar saldos' : 'Mostrar saldos'}
              type="button"
            >
              {showBalance ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
            </button>
          </div>

          <div className="text-[13px] font-bold text-[#535F7A]">Saldo disponible</div>

          <div className="border-t border-slate-200/80 my-3" />

          <div className="space-y-2 text-[14px]">
            <div className="flex items-center justify-between text-slate-600">
              <span>Saldo contable</span>
              <span className="font-bold text-[#1E2538] tabular-nums">
                {showBalance ? money(balance) : '$ ••••••'}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>Retenciones</span>
              <span className="font-bold text-[#1E2538] tabular-nums">
                {showBalance ? '$0' : '$ •'}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>Disponible total</span>
              <span className="font-extrabold text-[#1E2538] tabular-nums">
                {showBalance ? money(balance) : '$ ••••••'}
              </span>
            </div>
          </div>
        </section>

        {/* Botón oficial Cartolas + Descargar cartola */}
        <div className="space-y-2.5">
          <button
            onClick={handleOpenCartolaPreview}
            className="w-full min-h-[48px] rounded-full bg-[#29398E] hover:bg-[#1f2c73] text-white font-extrabold text-[16px] shadow-sm transition-all active:scale-[0.98] cursor-pointer"
            type="button"
          >
            Cartolas
          </button>

          <button
            onClick={handleOpenCartolaPreview}
            className="w-full min-h-[46px] rounded-full bg-white border-2 border-[#29398E] text-[#29398E] hover:bg-indigo-50/60 font-extrabold text-[15px] flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
            type="button"
          >
            <Download className="w-4 h-4" />
            <span>Descargar cartola</span>
          </button>
        </div>

        {/* Sección Movimientos + Filtros Todos / Abonos / Cargos */}
        <section className="pt-1 space-y-3">
          <h2 className="text-[18px] font-extrabold text-[#1E2538]">Movimientos</h2>

          {/* 3 botones de filtro estilo BancoEstado */}
          <div className="grid grid-cols-3 gap-2.5">
            {(
              [
                { key: 'todos', label: 'Todos' },
                { key: 'abonos', label: 'Abonos' },
                { key: 'cargos', label: 'Cargos' },
              ] as const
            ).map((tab) => {
              const active = filter === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => {
                    hapticSelection();
                    setFilter(tab.key);
                  }}
                  className={`min-h-[42px] rounded-xl text-[14px] transition-all active:scale-[0.97] cursor-pointer whitespace-nowrap ${
                    active
                      ? 'bg-[#E8ECFB] border-2 border-[#29398E] text-[#29398E] font-extrabold shadow-xs'
                      : 'bg-white border border-slate-300 text-slate-600 font-bold hover:border-slate-400'
                  }`}
                  type="button"
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Lista agrupada por Día y Fecha */}
          {groupedMovements.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center border border-slate-100 shadow-xs">
              <p className="text-sm font-bold text-slate-600">
                No hay movimientos registrados en esta categoría.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {groupedMovements.map((group) => (
                <article
                  key={group.dateKey}
                  className="bg-white rounded-2xl px-4 py-3.5 shadow-[0_2px_10px_rgba(25,35,70,0.06)] border border-slate-100"
                >
                  {/* Encabezado de fecha con ícono de calendario */}
                  <div className="flex items-center gap-2 text-[14px] text-[#535F7A] font-semibold pb-2.5 border-b border-slate-100">
                    <Calendar className="w-4 h-4 text-[#535F7A] shrink-0" />
                    <span className="capitalize">{group.label}</span>
                  </div>

                  {/* Filas de movimientos del día */}
                  <div className="divide-y divide-slate-100">
                    {group.items.map((mov) => {
                      const isAbono = mov.type === 'abono';
                      return (
                        <button
                          key={mov.id}
                          onClick={() => {
                            hapticTap();
                            setSelectedMovement(mov);
                          }}
                          className="w-full min-h-[64px] py-2.5 flex items-center justify-between gap-3 text-left hover:bg-slate-50/80 active:bg-slate-100/70 rounded-xl px-1.5 -mx-1.5 transition-colors cursor-pointer"
                          type="button"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-[15px] font-extrabold text-[#1E2538] leading-snug truncate">
                              {mov.title}
                            </div>
                            <div className="text-[13px] font-semibold text-[#535F7A] mt-0.5 flex items-center gap-1.5 truncate">
                              <span className="tabular-nums shrink-0">
                                {formatMovementTime(mov.timestampIso)}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="truncate">{mov.counterpartyName}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span
                              className={`text-[15px] font-extrabold tabular-nums ${
                                isAbono ? 'text-[#0D8F72]' : 'text-[#D9383A]'
                              }`}
                            >
                              {isAbono ? `+${money(mov.amount)}` : `-${money(mov.amount)}`}
                            </span>
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ================= MODAL 1: FICHA COMPLETA DEL MOVIMIENTO ================= */}
      {selectedMovement && (
        <div
          className="absolute inset-0 z-50 bg-slate-900/50 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Detalle del movimiento"
        >
          <div className="bg-white w-full rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border border-slate-200 animate-msg-in max-h-[88dvh] overflow-y-auto space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    selectedMovement.type === 'abono'
                      ? 'bg-[#E3F7F0] text-[#0D8F72]'
                      : 'bg-[#FEECEE] text-[#D9383A]'
                  }`}
                >
                  {selectedMovement.type === 'abono' ? (
                    <ArrowDownLeft className="w-5 h-5" />
                  ) : (
                    <ArrowUpRight className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-extrabold uppercase tracking-wider text-[#535F7A]">
                    {selectedMovement.type === 'abono'
                      ? 'Abono · Ingreso recibido'
                      : 'Cargo · Pago o transferencia'}
                  </div>
                  <h3 className="text-[17px] font-extrabold text-[#1E2538] leading-tight">
                    {selectedMovement.title}
                  </h3>
                </div>
              </div>

              <button
                onClick={() => {
                  hapticTap();
                  setSelectedMovement(null);
                }}
                className="min-w-[40px] min-h-[40px] rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center cursor-pointer"
                aria-label="Cerrar detalle"
                type="button"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Monto destacado */}
            <div className="bg-[#F4F6FA] rounded-2xl p-4 text-center border border-slate-200/70">
              <div className="text-xs font-bold text-[#535F7A] uppercase tracking-wider">
                Monto de la operación
              </div>
              <div
                className={`text-[30px] font-black font-['Nunito'] tabular-nums mt-0.5 ${
                  selectedMovement.type === 'abono'
                    ? 'text-[#0D8F72]'
                    : 'text-[#D9383A]'
                }`}
              >
                {selectedMovement.type === 'abono'
                  ? `+${money(selectedMovement.amount)}`
                  : `-${money(selectedMovement.amount)}`}
              </div>
            </div>

            {/* Desglose completo: Día, Fecha, Hora, Destinatario/Remitente, RUT, Banco, Cuenta, Folio */}
            <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 text-[14px]">
              <div className="flex items-start justify-between gap-4 px-3.5 py-2.5">
                <span className="text-[#535F7A] font-semibold">Día y fecha</span>
                <span className="font-extrabold text-[#1E2538] text-right capitalize">
                  {formatMovementDayDate(selectedMovement.timestampIso)}
                </span>
              </div>
              <div className="flex items-start justify-between gap-4 px-3.5 py-2.5">
                <span className="text-[#535F7A] font-semibold">Hora</span>
                <span className="font-extrabold text-[#1E2538] tabular-nums text-right">
                  {formatMovementTime(selectedMovement.timestampIso)} hrs
                </span>
              </div>
              <div className="flex items-start justify-between gap-4 px-3.5 py-2.5">
                <span className="text-[#535F7A] font-semibold">
                  {selectedMovement.type === 'abono' ? 'Quien transfirió' : 'A quién se transfirió'}
                </span>
                <span className="font-extrabold text-[#1E2538] text-right">
                  {selectedMovement.counterpartyName}
                </span>
              </div>
              <div className="flex items-start justify-between gap-4 px-3.5 py-2.5">
                <span className="text-[#535F7A] font-semibold">RUT</span>
                <span className="font-bold text-[#1E2538] font-mono text-right">
                  {selectedMovement.counterpartyRut || 'No informado'}
                </span>
              </div>
              <div className="flex items-start justify-between gap-4 px-3.5 py-2.5">
                <span className="text-[#535F7A] font-semibold">Banco / Medio</span>
                <span className="font-bold text-[#1E2538] text-right">
                  {selectedMovement.counterpartyBank || 'BancoEstado'}
                </span>
              </div>
              <div className="flex items-start justify-between gap-4 px-3.5 py-2.5">
                <span className="text-[#535F7A] font-semibold">Cuenta</span>
                <span className="font-bold text-[#1E2538] text-right">
                  {selectedMovement.counterpartyAccount || 'CuentaRUT'}
                </span>
              </div>
              <div className="flex items-start justify-between gap-4 px-3.5 py-2.5">
                <span className="text-[#535F7A] font-semibold">Concepto</span>
                <span className="font-bold text-[#1E2538] text-right">
                  {selectedMovement.concept || selectedMovement.title}
                </span>
              </div>
              <div className="flex items-start justify-between gap-4 px-3.5 py-2.5">
                <span className="text-[#535F7A] font-semibold">N° de operación</span>
                <span className="font-bold text-[#29398E] font-mono tabular-nums text-right">
                  {selectedMovement.opNumber}
                </span>
              </div>
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                onClick={() => handleCopyMovementDetail(selectedMovement)}
                className="flex-1 min-h-[46px] rounded-full border-2 border-[#29398E] text-[#29398E] font-extrabold text-sm flex items-center justify-center gap-1.5 hover:bg-indigo-50/50 cursor-pointer"
                type="button"
              >
                <Copy className="w-4 h-4" />
                <span>Copiar detalle</span>
              </button>
              <button
                onClick={() => {
                  hapticTap();
                  setSelectedMovement(null);
                }}
                className="flex-1 min-h-[46px] rounded-full bg-[#29398E] text-white font-extrabold text-sm hover:bg-[#1f2c73] cursor-pointer"
                type="button"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: REPRESENTACIÓN VISUAL DE CARTOLA OFICIAL ================= */}
      {isCartolaOpen && (
        <div
          className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-0 sm:p-3"
          role="dialog"
          aria-modal="true"
          aria-label="Documento oficial de cartola"
        >
          <div className="bg-white w-full rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl border border-slate-200 animate-msg-in max-h-[92dvh] flex flex-col">
            {/* Barra superior del visor de documento */}
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-[#F4F6FA] shrink-0">
              <div className="flex items-center gap-2 text-[#1E2538] font-extrabold text-sm">
                <FileText className="w-4 h-4 text-[#29398E]" />
                <span>Documento Oficial de Cartola</span>
              </div>
              <button
                onClick={() => {
                  hapticTap();
                  setIsCartolaOpen(false);
                }}
                className="min-w-[40px] min-h-[40px] rounded-full bg-white text-slate-600 hover:bg-slate-100 flex items-center justify-center cursor-pointer border border-slate-200"
                aria-label="Cerrar cartola"
                type="button"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cuerpo visual del documento tipo Cartola BancoEstado */}
            <div className="flex-1 overflow-y-auto p-4 bg-[#EEF2F8]">
              <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                {/* Encabezado oficial del documento */}
                <div className="bg-gradient-to-r from-[#F77F00] to-[#FF9A3C] px-4 py-3.5 text-white">
                  <div className="flex items-center justify-between gap-2">
                    <BancoEstadoLogo
                      variant="vector"
                      className="h-7 w-auto drop-shadow-xs select-none"
                    />
                    <span className="text-[11px] font-bold text-orange-50 tabular-nums">
                      {emittedAt} hrs
                    </span>
                  </div>
                  <div className="mt-2 text-xs font-extrabold uppercase tracking-wider text-white/95">
                    Cartola Oficial · CuentaRUT Emprendimiento
                  </div>
                </div>

                {/* Datos de la cuenta y saldo actual */}
                <div className="p-4 bg-[#FAFBFD] border-b border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-[#535F7A]">
                    <span>CUENTA</span>
                    <span>SALDO DISPONIBLE</span>
                  </div>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-extrabold text-[#1E2538] tabular-nums">
                      {DEFAULT_ORIGIN_ACCOUNT}
                    </span>
                    <span className="text-2xl font-black text-[#1E2538] tabular-nums font-['Nunito']">
                      {money(balance)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-[#535F7A] pt-1 border-t border-slate-200/70">
                    <span>Saldo contable: {money(balance)}</span>
                    <span>Retenciones: $0</span>
                  </div>
                </div>

                {/* Listado oficial de movimientos */}
                <div className="p-4 space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-[#535F7A]">
                    <span>Detalle de movimientos ({filteredMovements.length})</span>
                    <span>Monto</span>
                  </div>

                  {filteredMovements.length === 0 ? (
                    <p className="text-xs font-semibold text-slate-500 py-4 text-center">
                      No hay movimientos para mostrar en este filtro.
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {filteredMovements.map((mov) => {
                        const isAbono = mov.type === 'abono';
                        return (
                          <div
                            key={mov.id}
                            className="py-2.5 flex items-start justify-between gap-3 text-xs"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="font-extrabold text-[#1E2538] leading-snug">
                                {mov.title}
                              </div>
                              <div className="text-[11px] font-semibold text-[#535F7A] mt-0.5 capitalize">
                                {formatMovementDayDate(mov.timestampIso)} ·{' '}
                                {formatMovementTime(mov.timestampIso)} hrs
                              </div>
                              <div className="text-[11px] font-semibold text-slate-600 mt-0.5">
                                {mov.counterpartyName}
                                {mov.counterpartyRut ? ` · RUT ${mov.counterpartyRut}` : ''}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div
                                className={`font-extrabold tabular-nums text-[13px] ${
                                  isAbono ? 'text-[#0D8F72]' : 'text-[#D9383A]'
                                }`}
                              >
                                {isAbono ? `+${money(mov.amount)}` : `-${money(mov.amount)}`}
                              </div>
                              <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                                #{mov.opNumber}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-200 text-[10px] text-center font-semibold text-slate-400">
                    Documento oficial de respaldo generado para tu emprendimiento
                  </div>
                </div>
              </div>
            </div>

            {/* Botones de acción: Descargar PNG y Compartir */}
            <div className="p-4 border-t border-slate-200 bg-white flex gap-2.5 shrink-0">
              <button
                onClick={handleDownloadCartolaPng}
                className="flex-1 min-h-[46px] rounded-full border-2 border-[#29398E] text-[#29398E] font-extrabold text-sm flex items-center justify-center gap-1.5 hover:bg-indigo-50/50 transition-all active:scale-[0.98] cursor-pointer"
                type="button"
              >
                <Download className="w-4 h-4" />
                <span>Descargar imagen</span>
              </button>
              <button
                onClick={handleShareCartolaDocument}
                className="flex-1 min-h-[46px] rounded-full bg-[#29398E] hover:bg-[#1f2c73] text-white font-extrabold text-sm flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-[0.98] cursor-pointer"
                type="button"
              >
                <Share2 className="w-4 h-4" />
                <span>Compartir</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
