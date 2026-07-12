import { useState } from 'react';

interface AvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  size?: number;
  className?: string;
}

export default function Avatar({ src, alt, name, size = 32, className = '' }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const initial = (name || alt || '?')[0]?.toUpperCase() || '?';
  const bgColor = stringToColor(name || alt || '?');

  if (!src || failed) {
    return (
      <div
        className={`rounded-full flex items-center justify-center font-body font-semibold flex-shrink-0 ${className}`}
        style={{ width: size, height: size, backgroundColor: bgColor + '30', color: bgColor, fontSize: Math.max(10, size * 0.4) }}
        title={name || alt}
      >
        {initial}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt || name}
      className={`rounded-full object-cover flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

/* Generate a consistent color from a string */
function stringToColor(str: string): string {
  const colors = ['#d93a3a', '#f5a623', '#4caf50', '#2196f3', '#9c27b0', '#ff5722', '#00bcd4', '#e91e63', '#795548', '#607d8b'];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}
