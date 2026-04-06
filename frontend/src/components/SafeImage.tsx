'use client';

import React, { useState } from 'react';
import Image, { ImageProps } from 'next/image';

interface SafeImageProps extends Omit<ImageProps, 'onError'> {
  fallbackIcon?: React.ReactNode;
}

export default function SafeImage({ src, alt, fallbackIcon, ...props }: SafeImageProps) {
  const [error, setError] = useState(false);

  if (error || !src) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-white/5 backdrop-blur-sm rounded-lg overflow-hidden border border-white/10">
        {fallbackIcon || (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 text-white/10">
            <path d="M11.644 1.59a.75.75 0 0 1 .712 0l9.75 5.63a.75.75 0 0 1 0 1.298l-9.75 5.63a.75.75 0 0 1-.712 0L1.894 8.518a.75.75 0 0 1 0-1.298l9.75-5.63ZM22.5 10.332v6.596a1.5 1.5 0 0 1-.75 1.299L12 23.902l-9.75-5.675A1.5 1.5 0 0 1 1.5 16.928v-6.596l8.894 5.135a2.25 2.25 0 0 0 2.212 0L22.5 10.332Z" />
          </svg>
        )}
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      onError={() => setError(true)}
      {...props}
    />
  );
}
