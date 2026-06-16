"use client"

import Image from "next/image"

type Props = {
  src: string
  alt?: string
  className?: string
  fill?: boolean
  width?: number
  height?: number
  sizes?: string
}

export default function ResponsiveImage({
  src,
  alt = "",
  className = "",
  fill = false,
  width,
  height,
  sizes
}: Props) {
  if (fill) {
    return (
      <div className={`relative w-full h-full overflow-hidden ${className}`}>
        <Image src={src} alt={alt} fill className="object-cover" sizes={sizes} />
      </div>
    )
  }

  return (
    <div className={`overflow-hidden ${className}`} style={{ width: width || 'auto', height: height || 'auto' }}>
      <Image src={src} alt={alt} width={width || 800} height={height || 600} className="object-cover w-full h-full" />
    </div>
  )
}
