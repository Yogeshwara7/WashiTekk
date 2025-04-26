import React from "react";
import { transitions } from "@/styles/transitions";
import { colors } from "@/styles/colors";

export function WashitekCard({ children, style, className = "", ...props }) {
  return (
    <div
      className={`rounded-xl shadow-lg p-8 ${transitions.smoothScale} ${className}`}
      style={{ background: colors.cardBackground, ...style }}
      {...props}
    >
      {children}
    </div>
  );
} 