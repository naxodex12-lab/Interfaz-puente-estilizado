import React from 'react';
import { Search, Bell, Menu } from 'lucide-react';
import { BancoEstadoLogo } from './BancoEstadoLogo';

interface HeaderProps {
  onNotify?: (msg: string) => void;
  onResetToHome?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onNotify, onResetToHome }) => {
  return (
    <header className="relative bg-gradient-to-r from-[#F77F00] to-[#FF9A3C] h-[148px] rounded-b-[44px] px-4 pt-3 flex items-start justify-between shadow-sm">
      {/* Imagotipo corporativo BancoEstado tamaño mediano */}
      <button
        onClick={onResetToHome}
        className="flex items-center min-h-[36px] pt-1 cursor-pointer transition-opacity active:opacity-85 text-left focus:outline-none shrink-0"
        aria-label="BancoEstado - Ir a Inicio"
        type="button"
      >
        <BancoEstadoLogo
          variant="official-asset"
          className="w-[155px] h-auto drop-shadow-sm select-none"
        />
      </button>

      {/* Acciones de cabecera */}
      <div className="flex items-center gap-1.5 pt-1">
        <button
          onClick={() => onNotify?.('Buscar estará disponible en la versión final.')}
          className="w-9 h-9 rounded-full bg-[#FFF1E2] text-[#29398E] flex items-center justify-center transition-transform active:scale-95 shadow-sm"
          aria-label="Buscar en la aplicación"
          type="button"
        >
          <Search className="w-5 h-5" />
        </button>
        <button
          onClick={() => onNotify?.('No tienes notificaciones pendientes.')}
          className="w-9 h-9 rounded-full bg-[#FFF1E2] text-[#29398E] flex items-center justify-center transition-transform active:scale-95 shadow-sm"
          aria-label="Notificaciones"
          type="button"
        >
          <Bell className="w-5 h-5" />
        </button>
        <button
          onClick={() => onNotify?.('Menú de configuración de BancoEstado.')}
          className="w-9 h-9 rounded-full bg-[#FFF1E2] text-[#29398E] flex items-center justify-center transition-transform active:scale-95 shadow-sm"
          aria-label="Menú principal"
          type="button"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};
