
"use client";

import { useState } from "react";

interface PackageImageProps {
  src: string;
  alt: string;
  className?: string;
}

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1200&q=80";

export default function PackageImage({
  src,
  alt,
  className,
}: PackageImageProps) {
  const [imageSrc, setImageSrc] = useState(src);

  return (
    <img
      src={imageSrc || FALLBACK_IMAGE}
      alt={alt}
      className={className}
      onError={() => {
        if (imageSrc !== FALLBACK_IMAGE) {
          setImageSrc(FALLBACK_IMAGE);
        }
      }}
    />
  );
}
