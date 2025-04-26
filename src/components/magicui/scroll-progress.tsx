'use client';

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

function ScrollProgressBar() {
  const [scrollPercentage, setScrollPercentage] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const winScroll = window.scrollY;
      const height = document.documentElement.scrollHeight - window.innerHeight;
      const scrolled = (winScroll / height) * 100;
      setScrollPercentage(scrolled);
      setIsVisible(window.scrollY > 50);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 h-1 bg-gray-200 z-50">
      <motion.div
        className={`h-full bg-blue-700 transition-opacity duration-300 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
        initial={{ scaleX: 0 }}
        style={{ 
          transformOrigin: "0%",
          transform: `scaleX(${scrollPercentage / 100})`
        }}
      />
    </div>
  );
}

export function ScrollProgress() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (typeof window === 'undefined' || !mounted) return null;

  return <ScrollProgressBar />;
} 