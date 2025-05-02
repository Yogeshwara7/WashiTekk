import React, { useState } from "react";
import { motion } from "framer-motion";

type FlipCardProps = {
  front: React.ReactNode;
  back: React.ReactNode;
  className?: string;
  perspective?: number;
  transitionDuration?: number;
};

export default function FlipCard({
  front,
  back,
  className = "",
  perspective = 1200,
  transitionDuration = 0.8,
}: FlipCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className={`relative ${className}`}
      style={{
        perspective,
        width: 240,
        height: 384,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <motion.div
        className="relative w-full h-full transition-transform duration-700 ease-in-out"
        style={{
          transformStyle: "preserve-3d",
          willChange: "transform",
          transformOrigin: "center",
        }}
        animate={{ rotateY: hovered ? 180 : 0 }}
        transition={{
          duration: transitionDuration,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        {/* Front Side */}
        <div
          className="absolute inset-0 w-full h-full rounded-2xl overflow-hidden shadow-xl border"
          style={{ backfaceVisibility: "hidden", zIndex: 2 }}
        >
          {front}
        </div>

        {/* Back Side */}
        <div
          className="absolute inset-0 w-full h-full rounded-2xl overflow-hidden shadow-xl border"
          style={{
            transform: "rotateY(180deg)",
            backfaceVisibility: "hidden",
            zIndex: 1,
          }}
        >
          {back}
        </div>
      </motion.div>
    </div>
  );
} 