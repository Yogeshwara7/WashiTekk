import React from 'react';
import { Check } from 'lucide-react';

const SteamPress = () => {
  const pricingTiers = [
    {
      name: 'Basic Steam Press',
      price: '₹50',
      unit: 'per piece',
      features: [
        'Standard steam pressing',
        'Basic garment care',
        'Crease setting',
        '24-hour turnaround',
        'Free pickup & delivery (min 5 items)'
      ],
      popular: false
    },
    {
      name: 'Premium Steam Press',
      price: '₹80',
      unit: 'per piece',
      features: [
        'Professional steam pressing',
        'Fabric conditioning',
        'Perfect creasing',
        'Same-day service',
        'Free pickup & delivery',
        'Garment inspection'
      ],
      popular: true
    },
    {
      name: 'Bulk Steam Press',
      price: '₹40',
      unit: 'per piece',
      features: [
        'Minimum 10 items',
        'Standard pressing',
        'Basic finishing',
        '48-hour turnaround',
        'Free pickup & delivery',
        'Ideal for businesses'
      ],
      popular: false
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
        <div className="text-center mt-12 text-brand-subheadline">
          All plans include professional handling of your garments and quality assurance.<br />
          For special requirements or bulk orders, please contact us.
        </div>
      </div>

      {/* Individual Garment Prices */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Individual Garment Prices
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {garmentPrices.map((item) => (
              <div key={item.item} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <span className="text-gray-900 font-medium">{item.item}</span>
                <span className="text-blue-600 font-bold">{item.price}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Process Steps */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Our Process
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <span className="text-blue-600 font-bold text-xl">1</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Inspection</h3>
              <p className="text-gray-600">
                Careful examination of garments and fabric type.
              </p>
            </div>
            <div>
              <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <span className="text-blue-600 font-bold text-xl">2</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Preparation</h3>
              <p className="text-gray-600">
                Light spraying and fabric conditioning if needed.
              </p>
            </div>
            <div>
              <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <span className="text-blue-600 font-bold text-xl">3</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Steam Press</h3>
              <p className="text-gray-600">
                Professional pressing with industrial steam equipment.
              </p>
            </div>
            <div>
              <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <span className="text-blue-600 font-bold text-xl">4</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Quality Check</h3>
              <p className="text-gray-600">
                Final inspection and careful packaging for delivery.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SteamPress; 