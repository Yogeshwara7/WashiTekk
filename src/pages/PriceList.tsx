import React, { useState } from 'react';
import { Shirt, User, UserRound, Baby, Home } from 'lucide-react';
import { animate } from "motion";
import { Dock, DockIcon } from "@/components/magicui/dock";
import { colors } from "@/styles/colors";
import { Button } from "@/components/ui/button";

const categories = {
  MEN: [
    {
      name: "Shirt Half Standard Pack",
      price: 25,
      icon: Shirt
    },
    {
      name: "T-Shirt Half Standard Pack",
      price: 25,
      icon: Shirt
    },
    {
      name: "Trousers Standard Pack",
      price: 40,
      icon: Shirt
    },
    {
      name: "Jeans Standard Pack",
      price: 50,
      icon: Shirt
    },
    {
      name: "Shorts Standard Pack",
      price: 30,
      icon: Shirt
    },
    {
      name: "Jacket Hanger Pack",
      price: 150,
      icon: Shirt
    },
    {
      name: "Sweater Premium Pack",
      price: 75,
      icon: Shirt
    },
    {
      name: "Sweatshirt Standard Pack",
      price: 75,
      icon: Shirt
    }
  ],
  WOMEN: [
    {
      name: "Kurti Standard Pack",
      price: 40,
      icon: Shirt
    },
    {
      name: "Saree Standard Pack",
      price: 180,
      icon: Shirt
    },
    {
      name: "Blouse Standard Pack",
      price: 30,
      icon: Shirt
    },
    {
      name: "Lehenga Premium Pack",
      price: 400,
      icon: Shirt
    }
  ],
  KIDS: [
    {
      name: "T-Shirt Standard Pack",
      price: 20,
      icon: Shirt
    },
    {
      name: "Shorts Standard Pack",
      price: 25,
      icon: Shirt
    },
    {
      name: "School Uniform Set",
      price: 60,
      icon: Shirt
    }
  ],
  HOUSEHOLD: [
    {
      name: "Bedsheet Single",
      price: 60,
      icon: Shirt
    },
    {
      name: "Bedsheet Double",
      price: 90,
      icon: Shirt
    },
    {
      name: "Curtain (Per Piece)",
      price: 150,
      icon: Shirt
    },
    {
      name: "Blanket Single",
      price: 200,
      icon: Shirt
    }
  ]
};

const PriceList = () => {
  const [activeTab, setActiveTab] = useState<'MEN' | 'WOMEN' | 'KIDS' | 'HOUSEHOLD'>('MEN');
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);

  const springConfig = { stiffness: 400, damping: 28 };

  const handleHover = (index: number, isHovering: boolean) => {
    setHoveredIndex(isHovering ? index : null);
    const element = document.getElementById(`category-tab-${index}`);
    if (element) {
      animate(element, { 
        scale: isHovering ? 1.1 : 1 
      }, springConfig);
    }
  };

  return (
    <div className="min-h-screen flex flex-col pt-24 md:pt-32 pb-12" style={{ background: colors.background }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 flex-grow w-full">
        <div className="text-center mb-6 md:mb-8">
          <h1 className="text-3xl md:text-5xl font-bold text-brand-headline mb-2 md:mb-4">
            Pricelist
          </h1>
          <p className="text-sm md:text-base text-white">Select a category to view our pricing</p>
        </div>

        {/* Mobile Category Navigation */}
        <div className="md:hidden mb-6">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={activeTab === 'MEN' ? 'default' : 'outline'}
              className="w-full h-12 text-sm"
              onClick={() => setActiveTab('MEN')}
            >
              MEN
            </Button>
            <Button
              variant={activeTab === 'WOMEN' ? 'default' : 'outline'}
              className="w-full h-12 text-sm"
              onClick={() => setActiveTab('WOMEN')}
            >
              WOMEN
            </Button>
            <Button
              variant={activeTab === 'KIDS' ? 'default' : 'outline'}
              className="w-full h-12 text-sm"
              onClick={() => setActiveTab('KIDS')}
            >
              KIDS
            </Button>
            <Button
              variant={activeTab === 'HOUSEHOLD' ? 'default' : 'outline'}
              className="w-full h-12 text-sm"
              onClick={() => setActiveTab('HOUSEHOLD')}
            >
              HOUSEHOLD
            </Button>
          </div>
        </div>

        {/* Desktop Category Navigation */}
        <div className="hidden md:flex justify-center mb-8 md:mb-12">
          <div className="bg-brand-card rounded-2xl shadow-lg p-4 border border-brand-stroke">
            <Dock>
              <DockIcon isActive={activeTab === 'MEN'} onClick={() => setActiveTab('MEN')}>MEN</DockIcon>
              <DockIcon isActive={activeTab === 'WOMEN'} onClick={() => setActiveTab('WOMEN')}>WOMEN</DockIcon>
              <DockIcon isActive={activeTab === 'KIDS'} onClick={() => setActiveTab('KIDS')}>KIDS</DockIcon>
              <DockIcon isActive={activeTab === 'HOUSEHOLD'} onClick={() => setActiveTab('HOUSEHOLD')}>HOUSEHOLD</DockIcon>
            </Dock>
          </div>
        </div>

        {/* Items Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-8">
          {categories[activeTab].map((item, idx) => (
            <div 
              key={idx} 
              style={{ 
                background: colors.cardBackground, 
                borderRadius: '1rem', 
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', 
                border: `1px solid ${colors.stroke}` 
              }} 
              className="flex items-center gap-4 p-4 md:p-6 transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="flex-shrink-0">
                <item.icon className="w-8 h-8 md:w-10 md:h-10" style={{ color: colors.highlight }} />
              </div>
              <div className="flex-grow">
                <div style={{ color: colors.cardHeading }} className="text-base md:text-lg font-semibold line-clamp-2">{item.name}</div>
                <div style={{ color: colors.highlight }} className="font-bold text-lg md:text-xl mt-1">₹{item.price}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PriceList; 