import React from 'react';
import { Check } from 'lucide-react';

const SteamPress = () => {
  const pricingTiers = [
    {
      name: 'Basic Steam Press',
      price: '₹10',
      unit: 'per piece',
      features: [
        'Standard steam pressing',
        'Basic garment care',
        'Crease setting',
        '24-hour turnaround',
      ],
      popular: false
    },
    {
      name: 'Premium Steam Press',
      price: '₹15',
      unit: 'per piece',
      features: [
        'Professional steam pressing',
        'Fabric conditioning',
        'Perfect creasing',
        'Same-day service',
        'Garment inspection'
      ],
      popular: true
    }
  ];

  const garmentPrices = [
    { item: 'Shirt/T-shirt', price: '₹30' },
    { item: 'Pants/Trousers', price: '₹40' },
    { item: 'Suit (2 piece)', price: '₹120' },
    { item: 'Saree', price: '₹100' },
    { item: 'Kurta', price: '₹50' },
    { item: 'Dress', price: '₹80' },
    { item: 'Blazer', price: '₹70' },
    { item: 'Bedsheet', price: '₹60' },
    { item: 'Curtain (per panel)', price: '₹90' }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-brand-background pt-32 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex-grow">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-brand-headline mb-4">Steam Press Service</h1>
          <p className="text-xl text-brand-subheadline">Professional steam pressing for crisp, wrinkle-free garments. Get your clothes expertly pressed and ready to wear.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {pricingTiers.map((tier) => (
            <div
              key={tier.name}
              className={`bg-brand-card rounded-2xl shadow-lg p-8 border border-brand-stroke flex flex-col items-center h-full ${
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

        {/* Our Process Section */}
        <div className="max-w-4xl mx-auto mt-16 bg-white rounded-xl shadow-lg p-8 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800 mb-8 text-center">Our Process</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 flex items-center justify-center bg-blue-100 text-blue-700 rounded-full text-xl font-bold mb-4">1</div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Collection</h3>
              <p className="text-gray-600 text-sm">Schedule a pickup and we'll collect your garments from your location.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 flex items-center justify-center bg-blue-100 text-blue-700 rounded-full text-xl font-bold mb-4">2</div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Preparation</h3>
              <p className="text-gray-600 text-sm">Garments are prepared for pressing, including light spraying if needed.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 flex items-center justify-center bg-blue-100 text-blue-700 rounded-full text-xl font-bold mb-4">3</div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Steam Press</h3>
              <p className="text-gray-600 text-sm">Professional pressing with industrial steam equipment for a crisp finish.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 flex items-center justify-center bg-blue-100 text-blue-700 rounded-full text-xl font-bold mb-4">4</div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Quality Check & Delivery</h3>
              <p className="text-gray-600 text-sm">Final inspection, careful packaging, and delivery to your doorstep.</p>
            </div>
          </div>
        </div>

        <div className="text-center mt-12 text-brand-subheadline">
          All plans include professional handling of your garments and quality assurance.<br />
          For special requirements or bulk orders, please contact us.
        </div>
      </div>
    </div>
  );
};

export default SteamPress;