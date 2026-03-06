// app/components/OptimizedImage.js
'use client';
import Image from 'next/image';
import { useState } from 'react';

export default function OptimizedImage({ 
  src, 
  alt, 
  width, 
  height, 
  className = '', 
  priority = false,
  fallback = '/placeholder-product.jpg' 
}) {
  const [imgSrc, setImgSrc] = useState(src);
  const [imgError, setImgError] = useState(false);

  const handleError = () => {
    if (!imgError && fallback) {
      setImgSrc(fallback);
      setImgError(true);
    }
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <Image
        src={imgSrc}
        alt={alt}
        width={width}
        height={height}
        className={`transition-opacity duration-300 ${imgError ? 'opacity-75' : ''}`}
        priority={priority}
        onError={handleError}
        placeholder="blur"
        blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFBABABAQEB/8QAFBABABAQEB/8QAFBABABAQEB/8QAFBABABAQEB/xAAcEAHwAAQADAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEB"
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      />
    </div>
  );
}
