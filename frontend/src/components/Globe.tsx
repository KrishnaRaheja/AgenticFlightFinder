import createGlobe, { COBEOptions } from "cobe"
import { useCallback, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

const GLOBE_CONFIG: COBEOptions = {
  width: 800,
  height: 800,
  onRender: () => {},
  devicePixelRatio: 2,
  phi: 0,
  theta: 0.3,
  dark: 1,
  diffuse: 0.3,           // low diffuse = no atmospheric bleed/glow
  mapSamples: 16000,      // sweet spot for crisp, distinct land dots
  mapBrightness: 5,       // visible but not blooming
  baseColor: [0.05, 0.08, 0.14],   // dark navy base
  markerColor: [1, 1, 1],          // pure white markers — crisp, no color bleed
  glowColor: [0.02, 0.02, 0.04],   // effectively off — matches background
  markers: [
    { location: [40.7128, -74.006],   size: 0.04 },  // New York
    { location: [51.5074, -0.1278],   size: 0.04 },  // London
    { location: [35.6762, 139.6503],  size: 0.03 },  // Tokyo
    { location: [48.8566, 2.3522],    size: 0.03 },  // Paris
    { location: [1.3521, 103.8198],   size: 0.03 },  // Singapore
    { location: [25.2048, 55.2708],   size: 0.03 },  // Dubai
    { location: [-33.8688, 151.2093], size: 0.03 },  // Sydney
    { location: [19.4326, -99.1332],  size: 0.03 },  // Mexico City
    { location: [-23.5505, -46.6333], size: 0.03 },  // São Paulo
    { location: [28.6139, 77.2090],   size: 0.03 },  // New Delhi
    { location: [34.0522, -118.2437], size: 0.04 },  // Los Angeles
    { location: [55.7558, 37.6173],   size: 0.03 },  // Moscow
  ],
}

export function Globe({
  className,
  config = GLOBE_CONFIG,
}: {
  className?: string
  config?: COBEOptions
}) {
  let phi = 0
  let width = 0
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const onRender = useCallback((state: Record<string, unknown>) => {
    phi += 0.0004       // very slow, meditative rotation
    state.phi = phi
    state.width = width * 2
    state.height = width * 2
  }, [])

  const onResize = () => {
    if (canvasRef.current) width = canvasRef.current.offsetWidth
  }

  useEffect(() => {
    window.addEventListener("resize", onResize)
    onResize()

    const globe = createGlobe(canvasRef.current!, {
      ...config,
      width: width * 2,
      height: width * 2,
      onRender,
    })

    setTimeout(() => {
      if (canvasRef.current) canvasRef.current.style.opacity = "1"
    })
    return () => globe.destroy()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={cn("absolute inset-0 mx-auto aspect-square w-full max-w-[900px]", className)}>
      <canvas
        className="size-full opacity-0 transition-opacity duration-1000 [contain:layout_paint_size] cursor-default pointer-events-none select-none"
        ref={canvasRef}
      />
    </div>
  )
}
