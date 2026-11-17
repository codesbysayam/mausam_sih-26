import React from 'react';

interface BrandLogoProps {
  onClick?: () => void;
  showSubtitle?: boolean;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  onClick,
  showSubtitle = true,
  className = '',
}) => {
  return (
    <button
      type="button"
      id="mausam-brand-logo"
      onClick={onClick}
      className={`flex items-center gap-2.5 text-left group cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8] rounded-lg pr-1 ${className}`}
    >
      <div className="flex items-center justify-center shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#162331] border border-white/10 p-1">
        <picture>
          <source type="image/svg+xml" srcSet="/assets/imd-logo.svg" />
          <source type="image/webp" srcSet="/assets/imd-logo.webp" />
          <img
            src="/assets/imd-logo.svg"
            alt="India Meteorological Department"
            className="w-full h-full object-contain"
            loading="eager"
            width={40}
            height={40}
          />
        </picture>
      </div>

      <div className="flex flex-col justify-center min-w-0">
        <div className="flex items-center gap-1.5 text-[#F4F7FA] font-bold text-base sm:text-lg leading-none tracking-tight">
          <span>MAUSAM</span>
          <span className="text-[10px] font-mono font-semibold text-[#38BDF8] tracking-widest uppercase">
            IN
          </span>
        </div>

        {showSubtitle && (
          <div className="hidden sm:block text-[11px] text-[#8EA3B8] leading-tight mt-0.5 truncate">
            Atmospheric Intelligence
          </div>
        )}
      </div>
    </button>
  );
};
