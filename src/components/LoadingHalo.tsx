import React from 'react';

interface LoadingHaloProps {
  isLoading: boolean;
}

export const LoadingHalo: React.FC<LoadingHaloProps> = ({ isLoading }) => {
  if (!isLoading) return null;

  return (
    <div
      className="absolute inset-0 bg-white z-50 flex flex-col items-center justify-center transition-opacity duration-200"
      aria-live="polite"
      aria-label="Cargando"
    >
      <div className="relative w-24 h-24 flex items-center justify-center">
        {/* Aureola naranja oficial girando */}
        <div className="absolute inset-0 rounded-full border-[4px] border-transparent border-t-[#FF6A00] border-r-[#FF6A00] animate-be-spin" />

        {/* Emblema circular oficial (bancoestado.svg) */}
        <div className="w-[74px] h-[74px] rounded-full flex items-center justify-center shadow-sm overflow-hidden bg-white p-[2px]">
          <svg
            className="w-full h-full"
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <defs>
              <clipPath id="be-circle-clip">
                <circle cx="50" cy="50" r="46" />
              </clipPath>
            </defs>
            <circle cx="50" cy="50" r="49" fill="#FFFFFF" />
            <g clipPath="url(#be-circle-clip)">
              {/* Fondo cielo rojo superior */}
              <rect width="100" height="100" fill="#EE2A24" />
              {/* Muro lateral naranja derecho */}
              <polygon points="62,12 100,40 100,82 62,82" fill="#FF7A00" />
              {/* Franjas diagonales izquierdas */}
              <polygon points="0,56 38,40 38,50 0,66" fill="#FFFFFF" />
              <polygon points="0,66 38,50 38,60 0,76" fill="#FF7A00" />
              <polygon points="0,76 38,60 38,70 0,86" fill="#FFFFFF" />
              <polygon points="0,86 38,70 38,82 0,86" fill="#FF7A00" />
              {/* Edificio blanco central con tope curvo hacia la cima */}
              <path d="M38 27 Q51 23 62 12 L62 82 L38 82 Z" fill="#FFFFFF" />
              {/* Bloques naranjas intercalados sobre el pilar blanco */}
              <polygon points="38,40 48,35.8 48,45.8 38,50" fill="#FF7A00" />
              <polygon points="38,60 48,55.8 48,65.8 38,70" fill="#FF7A00" />
              {/* Base azul inferior */}
              <rect y="82" width="100" height="18" fill="#0047BA" />
            </g>
            <circle cx="50" cy="50" r="46.5" stroke="#FFFFFF" strokeWidth="3" />
          </svg>
        </div>
      </div>
    </div>
  );
};
