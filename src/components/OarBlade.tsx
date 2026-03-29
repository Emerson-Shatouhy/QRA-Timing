'use client';

const OARSPOTTER_BASE = 'https://www.oarspotter.com/blades/USA/';

interface OarBladeProps {
  /** The OarSpotter image key (filename without .png) */
  oarspotterKey: string | null;
  /** Height in pixels (width scales proportionally). Default 24. */
  size?: number;
  /** Optional extra CSS classes */
  className?: string;
}

export default function OarBlade({
  oarspotterKey,
  size = 24,
  className = '',
}: OarBladeProps) {
  if (!oarspotterKey) return null;

  // Keys can include a directory prefix (e.g. "HS/BelmontHillSchool" or "Uni/Harvard").
  // Legacy keys without a prefix default to the Uni directory.
  const path = oarspotterKey.includes('/') ? oarspotterKey : `Uni/${oarspotterKey}`;
  const src = `${OARSPOTTER_BASE}${path}.png`;

  // Crop to the right half of the image (the blade).
  // object-fit: cover keeps the natural aspect ratio,
  // object-position: right anchors the visible area to the blade end.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={oarspotterKey}
      style={{
        height: size,
        width: size * 1.8,
        objectFit: 'cover',
        objectPosition: 'right',
        flexShrink: 0,
      }}
      className={className}
      loading="lazy"
      draggable={false}
    />
  );
}
