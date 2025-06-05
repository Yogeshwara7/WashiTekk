import React from 'react';
import { Check } from 'lucide-react';

const WashAndIron = () => {
  const pricingTiers = [
    {
      name: 'Basic Wash & Iron',
      price: '₹50',
      unit: 'per kg',
      features: [
        'Regular clothes washing',
        'Machine drying',
        'Steam ironing',
        '48-hour turnaround',
      ],
      popular: false
    },
    {
      name: 'Premium Wash & Iron',
      price: '₹60',
      unit: 'per kg',
      features: [
        'Fabric softener(optional add-on, selectable during booking)',
        'Professional ironing',
        '24-hour turnaround',
        'Stain treatment'
      ],
      popular: true
    }
  ];

  const garmentPrices = [
    { item: 'Shirts', price: '₹60' },
    { item: 'Pants', price: '₹70' },
    { item: 'Suits (2 piece)', price: '₹300' },
    { item: 'Saree', price: '₹180' },
    { item: 'Kurta', price: '₹80' },
    { item: 'Bedsheets', price: '₹100' }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-brand-background pt-32 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex-grow">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-brand-headline mb-4">Wash & Iron Service</h1>
          <p className="text-xl text-brand-subheadline">Professional washing and ironing service for your clothes. Get crisp, clean, and perfectly ironed garments every time.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {pricingTiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative bg-brand-card rounded-2xl shadow-lg p-8 border border-brand-stroke flex flex-col items-center h-full ${
                tier.popular ? 'md:scale-105' : ''
              }`}
            >
              {tier.popular && (
                <div className="absolute top-0 right-0 bg-brand-highlight text-brand-background px-4 py-1 rounded-bl-lg text-sm font-medium">
                  Popular
                </div>
              )}
              <h2 className="text-xl font-bold text-brand-cardheading mb-2">
                {tier.name}
              </h2>
              <div className="text-3xl font-bold text-brand-cardheading mb-1">
                {tier.price} <span className="text-base font-normal text-brand-cardparagraph">{tier.unit}</span>
              </div>
              <ul className="text-brand-cardparagraph mb-6 space-y-2 text-left">
                {tier.features.map((feature) => (
                  <li key={feature}>✔ {feature}</li>
                ))}
              </ul>
              <button className="w-full bg-brand-highlight text-brand-background font-semibold py-2 px-4 rounded-lg hover:bg-brand-highlight/90 transition mt-auto">
                Choose Plan
              </button>
            </div>
          ))}
        </div>
        <div className="text-center mt-12 text-brand-subheadline">
          All plans include professional handling of your garments and quality assurance.<br />
          For special requirements or bulk orders, please contact us.
        </div>
      </div>

      {/* Our Process Section */}
      <div className="max-w-4xl mx-auto mt-16 bg-white rounded-xl shadow-lg p-8 border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-800 mb-8 text-center">Our Process</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 flex items-center justify-center bg-blue-100 text-blue-700 rounded-full text-xl font-bold mb-4">1</div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Collection</h3>
            <p className="text-gray-600 text-sm">Schedule a pickup and we'll collect your clothes from your location.</p>
              </div>
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 flex items-center justify-center bg-blue-100 text-blue-700 rounded-full text-xl font-bold mb-4">2</div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Washing</h3>
            <p className="text-gray-600 text-sm">Your clothes are carefully sorted and washed using premium detergents.</p>
            </div>
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 flex items-center justify-center bg-blue-100 text-blue-700 rounded-full text-xl font-bold mb-4">3</div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Ironing</h3>
            <p className="text-gray-600 text-sm">Each garment is professionally pressed and ironed to perfection.</p>
              </div>
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 flex items-center justify-center bg-blue-100 text-blue-700 rounded-full text-xl font-bold mb-4">4</div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Delivery</h3>
            <p className="text-gray-600 text-sm">Your fresh, clean, and crisply ironed clothes are delivered to your doorstep.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WashAndIron; 