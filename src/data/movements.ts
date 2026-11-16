import { BankMovement } from '../types';
import { INITIAL_BALANCE } from './contacts';

const BALANCE_STORAGE_KEY = 'be_emprendimiento_balance_v1';
const MOVEMENTS_STORAGE_KEY = 'be_emprendimiento_movements_v1';

export const INITIAL_MOVEMENTS: BankMovement[] = [
  {
    id: 'mov-init-1',
    type: 'abono',
    title: 'Abono Venta Emprendimiento',
    counterpartyName: 'Camila Riquelme Soto',
    counterpartyRut: '18.432.910-5',
    counterpartyBank: 'Banco de Chile',
    counterpartyAccount: 'Cuenta Corriente · 9482710',
    concept: 'Pago pedido semanal',
    amount: 24500,
    timestampIso: '2026-11-15T11:25:00',
    opNumber: '8492104',
  },
  {
    id: 'mov-init-2',
    type: 'cargo',
    title: 'Pago Distribuidora El Roble SpA',
    counterpartyName: 'Distribuidora El Roble SpA',
    counterpartyRut: '76.418.290-K',
    counterpartyBank: 'BancoEstado',
    counterpartyAccount: 'Cuenta Vista · 50192837',
    concept: 'Reposición de insumos y empaques',
    amount: 12800,
    timestampIso: '2026-11-14T22:40:00',
    opNumber: '8491872',
  },
  {
    id: 'mov-init-3',
    type: 'abono',
    title: 'Transferencia Recibida',
    counterpartyName: 'Rodrigo Muñoz Vera',
    counterpartyRut: '15.904.112-8',
    counterpartyBank: 'Banco Santander',
    counterpartyAccount: 'Cuenta Corriente · 6102938',
    concept: 'Abono compra presencial',
    amount: 18500,
    timestampIso: '2026-11-14T16:15:00',
    opNumber: '8491540',
  },
  {
    id: 'mov-init-4',
    type: 'cargo',
    title: 'Transferencia a Belén Pardo Escobar',
    counterpartyName: 'Belén Pardo Escobar',
    counterpartyRut: '20.968.963-3',
    counterpartyBank: 'BancoEstado',
    counterpartyAccount: 'CuentaRUT · 20968963',
    concept: 'Pago despacho y reparto',
    amount: 6500,
    timestampIso: '2026-11-13T21:41:00',
    opNumber: '8490931',
  },
  {
    id: 'mov-init-5',
    type: 'abono',
    title: 'Abono Pago Cliente',
    counterpartyName: 'Marcela Fuentes Díaz',
    counterpartyRut: '13.765.401-2',
    counterpartyBank: 'BCI',
    counterpartyAccount: 'Cuenta Corriente · 3329184',
    concept: 'Venta pack emprendimiento',
    amount: 32000,
    timestampIso: '2026-11-13T10:12:00',
    opNumber: '8490418',
  },
];

export function formatMovementDayDate(iso: string): string {
  const date = new Date(iso);
  if (isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function formatMovementTime(iso: string): string {
  const date = new Date(iso);
  if (isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function getMovementDateKey(iso: string): string {
  const date = new Date(iso);
  if (isNaN(date.getTime())) return iso.slice(0, 10);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function loadStoredBalance(): number {
  try {
    const raw = localStorage.getItem(BALANCE_STORAGE_KEY);
    if (!raw) return INITIAL_BALANCE;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : INITIAL_BALANCE;
  } catch {
    return INITIAL_BALANCE;
  }
}

export function saveStoredBalance(balance: number): void {
  try {
    localStorage.setItem(BALANCE_STORAGE_KEY, String(balance));
  } catch {
    // Ignorar errores de almacenamiento
  }
}

export function loadStoredMovements(): BankMovement[] {
  try {
    const raw = localStorage.getItem(MOVEMENTS_STORAGE_KEY);
    if (!raw) return INITIAL_MOVEMENTS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return INITIAL_MOVEMENTS;
  } catch {
    return INITIAL_MOVEMENTS;
  }
}

export function saveStoredMovements(movements: BankMovement[]): void {
  try {
    localStorage.setItem(MOVEMENTS_STORAGE_KEY, JSON.stringify(movements));
  } catch {
    // Ignorar errores de almacenamiento
  }
}
