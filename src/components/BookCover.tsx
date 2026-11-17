import { useState } from 'react';
import { getBookAccentTone } from '../services/libraryDomainService';

interface BookCoverProps {
  title: string;
  author: string;
  publisher?: string;
  coverUrl?: string | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function BookCover({
  title,
  author,
  publisher,
  coverUrl,
  className = '',
  size = 'md',
}: BookCoverProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const tone = getBookAccentTone(title);
  const showImage = Boolean(coverUrl) && !imgFailed;

  const titleClasses =
    size === 'sm'
      ? 'text-xs leading-tight'
      : size === 'lg'
        ? 'text-xl leading-snug'
        : 'text-sm leading-snug';

  const authorClasses =
    size === 'sm'
      ? 'text-[10px]'
      : size === 'lg'
        ? 'text-xs'
        : 'text-[11px]';

  return (
    <div
      className={`relative aspect-[2/3] w-full overflow-hidden bg-[#131318] select-none ${className}`}
    >
      {showImage ? (
        <img
          src={coverUrl!}
          alt={`Cover of ${title}`}
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <div
          className="w-full h-full flex flex-col justify-between p-4 relative"
          style={{
            background: `linear-gradient(160deg, ${tone.bg} 0%, #0B0B0E 100%)`,
          }}
        >
          {/* Subtle spine groove */}
          <div
            aria-hidden="true"
            className="absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/45 via-white/[0.04] to-transparent pointer-events-none"
          />
          {/* Inner hairline archival rule */}
          <div
            aria-hidden="true"
            className="absolute inset-2.5 border border-white/[0.08] pointer-events-none"
          />

          <div className="relative z-10 pl-1.5 pt-1">
            <div
              className="w-6 h-[1.5px] mb-2.5"
              style={{ backgroundColor: tone.accent }}
            />
            <p
              className={`font-serif font-medium text-[#F2EDE4] line-clamp-4 ${titleClasses}`}
            >
              {title}
            </p>
          </div>

          <div className="relative z-10 pl-1.5 pb-1 space-y-1">
            <p className={`text-[#A69F93] line-clamp-2 ${authorClasses}`}>
              {author}
            </p>
            {publisher && size !== 'sm' && (
              <p className="text-[10px] tracking-wide text-[#6E685F] truncate">
                {publisher}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Subtle book-edge specular highlight */}
      <div
        aria-hidden="true"
        className="absolute inset-0 ring-1 ring-inset ring-white/[0.07] pointer-events-none"
      />
    </div>
  );
}
