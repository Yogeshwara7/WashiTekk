import React, { useEffect, useRef, useState } from 'react';
import { Shirt, CircleDot, Sparkles, Waves } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { useNavigate } from 'react-router-dom';
import FlipCard from './FlipCard';

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
            <FlipCard
              key={index}
              className={`w-60 h-96 rounded-2xl border border-brand-stroke`}
              transitionDuration={0.35}
              front={
                <div className={`flex flex-col items-center justify-between h-full py-8 px-6 ${cardColors[index]} ${cardTextColors[index]}`}>
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
              }
              back={
                <div className={`flex flex-col justify-center items-center h-full p-8 ${cardColors[index]} ${cardTextColors[index]}`}>
                  <div className="mb-6 text-brand-cardparagraph text-center text-base font-medium leading-relaxed">
                    {service.description}
                  </div>
                  <button
                    className="mt-4 px-6 py-2 bg-white text-brand-cardheading border border-brand-cardheading rounded-lg hover:bg-brand-highlight hover:text-brand-background transition font-semibold shadow"
                    onClick={e => { e.stopPropagation(); handleNavigate(service.link); }}
                  >
                    Go to Service
                  </button>
                </div>
              }
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services; 