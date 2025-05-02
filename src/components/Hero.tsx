import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from './ui/button';
import { ChevronDown } from 'lucide-react';
import BookingModal from './BookingModal';

const Hero = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const scrollToServices = () => {
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => {
        const servicesSection = document.getElementById('services');
        if (servicesSection) {
          servicesSection.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } else {
      const servicesSection = document.getElementById('services');
      if (servicesSection) {
        servicesSection.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: 'url(/assets/images/laundry-hero.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70 z-10" />

      {/* Content */}
      <div className="relative z-20 text-center px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto pt-20">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6 animate-fade-in">
          Professional Laundry & Dry Cleaning Services
        </h1>
        <p className="text-lg sm:text-xl text-gray-200 mb-8 max-w-3xl mx-auto animate-fade-in-delay">
          Experience premium laundry services with free pickup & delivery. 
          Your clothes deserve the best care!
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in-delay-2">
          <BookingModal />
          <Button
            onClick={scrollToServices}
            variant="outline"
            size="lg"
            className="bg-white/10 hover:bg-white/20 text-white border-white/20 px-8"
          >
            View Services
          </Button>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20 animate-bounce cursor-pointer"
           onClick={scrollToServices}>
        <ChevronDown className="h-8 w-8 text-white" />
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-1/4 left-10 w-20 h-20 bg-primary/20 rounded-full blur-xl animate-pulse" />
      <div className="absolute bottom-1/4 right-10 w-32 h-32 bg-secondary/20 rounded-full blur-xl animate-pulse" />
    </div>
  );
};

export default Hero; 