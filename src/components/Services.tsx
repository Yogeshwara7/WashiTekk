import React, { useEffect, useRef, useState } from 'react';
import { Shirt, CircleDot, Sparkles, Waves } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { motion } from "framer-motion";
import { useNavigate } from 'react-router-dom';

const services = [
  {
    title: "Wash & Fold",
    description: "Professional washing and folding service for your everyday clothes",
    icon: Shirt,
    price: "Starting at ₹50/kg",
    link: "/services/wash-and-fold"
  },
  {
    title: "Wash & Iron",
    description: "Get your clothes perfectly washed and professionally ironed",
    icon: CircleDot,
    price: "Starting at ₹70/kg",
    link: "/services/wash-and-iron"
  },
  {
    title: "Dry Cleaning",
    description: "Expert care for your delicate and special garments",
    icon: Sparkles,
    price: "Starting at ₹100/item",
    link: "/services/dry-cleaning"
  },
  {
    title: "Steam Press",
    description: "Professional steam pressing for crisp, wrinkle-free garments",
    icon: Waves,
    price: "Starting at ₹30/item",
    link: "/services/steam-press"
  }
];

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      delay: i * 0.15,
      duration: 0.5,
      type: "spring",
      stiffness: 80
    }
  })
};

const cardColors = [
  'bg-brand-highlight',   // Wash & Fold (yellow)
  'bg-brand-secondary',  // Wash & Iron (pink)
  'bg-brand-tertiary',   // Dry Cleaning (red)
  'bg-brand-card',       // Steam Press (light)
];

const cardTextColors = [
  'text-brand-background',   // highlight card: dark text
  'text-brand-background',   // secondary card: dark text
  'text-brand-background',   // tertiary card: dark text
  'text-brand-cardheading',  // card card: green text
];

const Services = () => {
  const [animateKey, setAnimateKey] = useState(0);
  const sectionRef = useRef<HTMLDivElement>(null);
  const wasInView = useRef(false);
  const [flipped, setFlipped] = useState(Array(services.length).fill(false));
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current) return;
      const rect = sectionRef.current.getBoundingClientRect();
      const inView = rect.top < window.innerHeight && rect.bottom > 0;
      if (inView && !wasInView.current) {
        setAnimateKey(prev => prev + 1);
      }
      wasInView.current = inView;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    // Also trigger on mount in case user lands directly on section
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleFlip = (idx: number) => {
    setFlipped(f => f.map((val, i) => (i === idx ? !val : val)));
  };

  const handleNavigate = (link: string) => {
    navigate(link);
  };

  return (
    <section id="services" className="py-20 bg-brand-background" ref={sectionRef}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-brand-headline mb-4">
            Our Services
          </h2>
          <p className="text-xl text-brand-cardparagraph">
            Choose from our range of professional laundry services
          </p>
        </div>
        
        <div className="flex flex-wrap justify-center gap-12">
          {services.map((service, index) => (
            <motion.div
              key={animateKey + '-' + index}
              custom={index}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              variants={cardVariants}
            >
              <div
                className="perspective"
                style={{ perspective: 1200 }}
              >
                <motion.div
                  className={`relative w-60 h-96 flex flex-col justify-between cursor-pointer ${cardColors[index]} rounded-2xl shadow-xl border border-brand-stroke`}
                  style={{ transformStyle: 'preserve-3d' }}
                  animate={{ rotateY: flipped[index] ? 180 : 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  onClick={() => {
                    if (window.innerWidth <= 768) handleFlip(index);
                  }}
                  onMouseEnter={() => {
                    if (window.innerWidth > 768 && !flipped[index]) handleFlip(index);
                  }}
                  onMouseLeave={() => {
                    if (window.innerWidth > 768 && flipped[index]) handleFlip(index);
                  }}
                >
                  {/* Front Side */}
                  <div
                    className={`absolute inset-0 w-full h-full flex flex-col items-center justify-between py-8 px-6 ${cardTextColors[index]}`}
                    style={{ backfaceVisibility: 'hidden', zIndex: 2 }}
                  >
                    <div className="flex items-center justify-between w-full mb-6">
                      <span className="font-extrabold text-xl tracking-wide drop-shadow">{service.title.toUpperCase()}</span>
                      <span className="ml-2 bg-brand-card/20 rounded-full p-1 flex items-center justify-center">
                        <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-brand-headline"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                      </span>
                    </div>
                    <div className="flex-1 flex items-center justify-center mb-6">
                      <service.icon className="w-24 h-24 opacity-90" />
                    </div>
                    <div className="font-semibold text-lg text-center tracking-wide mt-auto mb-2">
                      {service.price}
                    </div>
                  </div>
                  {/* Back Side */}
                  <div
                    className="absolute inset-0 w-full h-full bg-brand-card rounded-2xl shadow-xl flex flex-col justify-center items-center p-8 border border-brand-stroke"
                    style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', zIndex: 3 }}
                  >
                    <div className="mb-6 text-brand-cardparagraph text-center text-base font-medium leading-relaxed">
                      {service.description}
                    </div>
                    <button
                      className="mt-4 px-6 py-2 bg-brand-highlight text-brand-background rounded-lg hover:bg-brand-tertiary transition font-semibold shadow"
                      onClick={e => { e.stopPropagation(); handleNavigate(service.link); }}
                    >
                      Go to Service
                    </button>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services; 