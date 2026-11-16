import React, { useState } from 'react';

interface BancoEstadoLogoProps {
  variant?: 'official-asset' | 'vector';
  className?: string;
}

export const BancoEstadoLogo: React.FC<BancoEstadoLogoProps> = ({
  variant = 'official-asset',
  className = 'w-[155px] h-auto drop-shadow-sm select-none',
}) => {
  const [assetError, setAssetError] = useState(false);

  if (variant === 'official-asset' && !assetError) {
    return (
      <svg
        className={`aspect-[1411/248] ${className}`}
        viewBox="409 185 1411 248"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="BancoEstado"
      >
        <image
          href="/assets/aistudio/bnaco_estado_interior-4_40cddd13.webp"
          x="0"
          y="0"
          width="2160"
          height="648"
          preserveAspectRatio="none"
          onError={() => setAssetError(true)}
        />
      </svg>
    );
  }

  return (
    <svg
      className={className}
      viewBox="0 0 248 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="BancoEstado"
    >
      {/* Cuadro isotipo oficial BancoEstado con borde blanco */}
      <g>
        <rect width="48" height="48" fill="#FFFFFF" />
        <rect x="2" y="2" width="44" height="44" fill="#C8082B" />
        <polygon points="29,6 46,19 46,38 29,38" fill="#F26822" />
        <polygon points="2,24 17,18 17,22.5 2,28.5" fill="#FFFFFF" />
        <polygon points="2,28.5 17,22.5 17,27 2,33" fill="#F26822" />
        <polygon points="2,33 17,27 17,31.5 2,37.5" fill="#FFFFFF" />
        <polygon points="2,37.5 17,31.5 17,38 2,38" fill="#F26822" />
        <path d="M17 14 Q23.5 11.5 29 6 L29 38 L17 38 Z" fill="#FFFFFF" />
        <polygon points="17,18 22.5,15.8 22.5,20.3 17,22.5" fill="#F26822" />
        <polygon points="17,27 22.5,24.8 22.5,29.3 17,31.5" fill="#F26822" />
        <rect x="2" y="38" width="44" height="8" fill="#004B93" />
      </g>

      {/* Tipografía de respaldo BancoEstado */}
      <text
        x="56"
        y="35"
        fill="#FFFFFF"
        fontFamily="'Open Sans', 'Nunito Sans', system-ui, -apple-system, sans-serif"
        fontWeight="800"
        fontStyle="italic"
        fontSize="30"
        letterSpacing="-0.6"
      >
        BancoEstado
      </text>
    </svg>
  );
};
