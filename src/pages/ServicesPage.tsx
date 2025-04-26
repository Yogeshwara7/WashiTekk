import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ShoppingBasket, Shirt, Sparkles, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import React, { useState } from "react";
import { colors } from "@/styles/colors";
import { transitions } from "@/styles/transitions";

const ServicesPage = () => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isCenter, setIsCenter] = useState<{ [key: number]: boolean }>({});
  const [flippedIndex, setFlippedIndex] = useState<number | null>(null);
  const services = [
    {
      title: "Free pick up",
      description: "Schedule a pickup and we'll collect your laundry from your doorstep at no extra cost.",
      icon: ShoppingBasket
    },
    {
      title: "Wash and dry",
      description: "Professional washing and drying services using premium detergents and modern equipment.",
      icon: Shirt
    },
    {
      title: "Fold and Iron",
      description: "Expert ironing and folding service to give your clothes that crisp, fresh look.",
      icon: Sparkles
    },
    {
      title: "Free Delivery",
      description: "We'll deliver your clean, fresh laundry back to your doorstep at no additional charge.",
      icon: Truck
    }
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: colors.background }}>
      <Navbar />
      
      <main className="flex-grow py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Our Services</h1>
            <div className="w-24 h-1 bg-washitek-400 mx-auto rounded-full"></div>
          </div>
        
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16">
  {services.map((service, index) => (
    <div key={index} className="relative w-full h-80 perspective-[1000px]">
      <div
        className={`relative w-full h-full ${transitions.flip} ${
          flippedIndex === index ? "rotate-y-180" : ""
        }`}
        onMouseEnter={() => setFlippedIndex(index)}
        onMouseLeave={() => {
          setFlippedIndex(null);
          setIsCenter(prev => ({ ...prev, [index]: false }));
        }}
        onMouseMove={e => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const centerBoxSize = Math.min(rect.width, rect.height) * 0.5;
          const centerLeft = (rect.width - centerBoxSize) / 2;
          const centerTop = (rect.height - centerBoxSize) / 2;
          const inCenter = x >= centerLeft && x <= centerLeft + centerBoxSize && y >= centerTop && y <= centerTop + centerBoxSize;
          setIsCenter(prev => ({ ...prev, [index]: inCenter }));
        }}
      >
        {/* Front Side */}
        <div className="absolute w-full h-full backface-hidden" style={{ background: colors.cardBackground, borderRadius: '0.75rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
          <div className="mb-6 flex justify-center">
            <service.icon className="w-16 h-16 text-washitek-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-4">{service.title}</h3>
          <p className="text-gray-600 mb-6" style={{ color: colors.subHeadline }}>
            {service.description}
          </p>
          <Button 
            variant="default"
            className="w-full bg-washitek-400 hover:bg-washitek-500 text-white"
          >
            Read More
          </Button>
        </div>

        {/* Back Side */}
        <div className="absolute w-full h-full backface-hidden rotate-y-180" style={{ background: colors.highlight, borderRadius: '0.75rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', color: colors.headline }}>
          <h3 className="text-xl font-semibold mb-4">{service.title} Details</h3>
          <p className="mb-6">More information about {service.title}. We offer top-notch care for your clothing.</p>
          <Button 
            variant="outline"
            className="w-full border-white text-white hover:bg-white hover:text-washitek-400"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  ))}
</div>

        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default ServicesPage;
