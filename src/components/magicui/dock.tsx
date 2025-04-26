import * as React from "react"

interface DockProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  className?: string
  iconMagnification?: number
  iconDistance?: number
}

interface DockIconProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  isActive?: boolean
  "data-active"?: boolean
}

export function Dock({ 
  children, 
  className = "", 
  iconMagnification = 10, 
  iconDistance = 85,
  ...props 
}: DockProps) {
  const [mousePosition, setMousePosition] = React.useState<number | null>(null)
  const [isHovering, setIsHovering] = React.useState(false)
  const dockRef = React.useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null)

  const updateMousePosition = React.useCallback((event: React.MouseEvent) => {
    const rect = dockRef.current?.getBoundingClientRect()
    if (rect) {
      const mouseX = event.clientX - rect.left
      setMousePosition(mouseX)
    }
  }, [])

  const resetMousePosition = React.useCallback(() => {
    setMousePosition(null)
    setIsHovering(false)
  }, [])

  const handleMouseEnter = React.useCallback(() => {
    setIsHovering(true)
  }, [])

  return (
    <div className="relative group">
      {/* Background blur effect */}
      <div 
        className={`
          absolute inset-0 -m-1 rounded-2xl opacity-0 group-hover:opacity-100
          transition-opacity duration-500 pointer-events-none
          bg-white/10 backdrop-blur-xl
        `} 
      />
      
      {/* Main dock container */}
      <div
        ref={dockRef}
        className={`
          relative inline-flex p-1.5 rounded-2xl 
          bg-white/90 
          border border-gray-200/50
          items-center gap-1.5
          transition-all duration-500 ease-out
          hover:border-blue-200/50
          ${isHovering ? 'shadow-xl shadow-blue-900/[0.03] scale-[1.02]' : 'shadow-md shadow-black/[0.03] scale-100'}
          ${className}
        `}
        onMouseMove={updateMousePosition}
        onMouseLeave={resetMousePosition}
        onMouseEnter={handleMouseEnter}
        {...props}
      >
        {/* Gradient overlay */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/80 via-white/20 to-transparent" />
        
        {/* Navigation items */}
        {React.Children.map(children, (child, index) => {
          if (!React.isValidElement(child)) return null

          return React.cloneElement(child as React.ReactElement<DockIconProps>, {
            style: {
              transform: mousePosition
                ? `scale(${calculateIconScale(
                    mousePosition,
                    index * iconDistance + iconDistance / 2,
                    iconMagnification
                  )})`
                : "scale(1)",
              transition: "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
            },
            onMouseEnter: () => setActiveIndex(index),
            onMouseLeave: () => setActiveIndex(null),
            "data-active": activeIndex === index,
          })
        })}
      </div>
    </div>
  )
}

export function DockIcon({ 
  children, 
  className = "", 
  style, 
  isActive,
  ...props 
}: DockIconProps) {
  return (
    <div
      className={`
        relative flex items-center justify-center select-none
        px-6 py-2 rounded-xl text-sm font-medium
        transition-all duration-500
        ${isActive 
          ? 'bg-blue-700 text-white pointer-events-none' 
          : `
            hover:bg-gradient-to-br hover:from-gray-50/90 hover:via-white hover:to-gray-50/80 
            text-gray-600 hover:text-gray-800
            before:absolute before:inset-0 before:rounded-xl before:transition-opacity before:duration-300
            before:opacity-0 hover:before:opacity-100
            before:bg-gradient-to-b before:from-white/90 before:to-white/40
            hover:shadow-sm hover:shadow-black/[0.02]
          `}
        ${className}
      `}
      style={{
        ...style,
        transformOrigin: "center center",
      }}
      {...props}
    >
      <span className="relative z-10 transition-transform duration-300 data-[active=true]:scale-105">
        {children}
      </span>
      {(isActive || props["data-active"]) && (
        <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white/90" />
      )}
    </div>
  )
}

function calculateIconScale(
  mousePosition: number,
  iconCenter: number,
  magnification: number
) {
  const distance = Math.abs(mousePosition - iconCenter)
  const maxDistance = 85
  
  if (distance > maxDistance) return 1
  
  // Enhanced spring-like easing function with bounce
  const progress = 1 - (distance / maxDistance)
  const eased = enhancedSpringEasing(progress)
  
  const scale = 1 + (eased * (magnification / 100))
  return Math.min(Math.max(scale, 1), 1 + magnification / 100)
}

function enhancedSpringEasing(x: number): number {
  // Custom spring-like easing curve with subtle bounce
  const bounce = Math.sin(x * Math.PI * 2) * 0.03
  const base = 1 - Math.pow(Math.cos(x * Math.PI) * 0.5 + 0.5, 2)
  return base + (bounce * x)
} 