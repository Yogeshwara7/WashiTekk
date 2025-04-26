import React from 'react';
import { Check } from 'lucide-react';

const DryCleaning = () => {
  const pricingTiers = [
    {
      name: 'Basic Dry Cleaning',
      price: '₹200',
      unit: 'per piece',
      features: [
        'Standard dry cleaning',
        'Stain pre-treatment',
        'Steam finishing',
        '72-hour turnaround',
        'Free pickup & delivery (min 3 items)'
      ],
      popular: false
    },
    {
      name: 'Premium Dry Cleaning',
      price: '₹300',
      unit: 'per piece',
      features: [
        'Premium dry cleaning',
        'Advanced stain removal',
        'Hand finishing',
        '48-hour turnaround',
        'Free pickup & delivery',
        'Garment protection'
      ],
      popular: true
    },
    {
      name: 'Bulk Dry Cleaning',
      price: '₹150',
      unit: 'per piece',
      features: [
        'Minimum 5 items',
        'Standard cleaning',
        'Basic finishing',
        '96-hour turnaround',
        'Free pickup & delivery',
        'Ideal for businesses'
      ],
      popular: false
    }
  ];

  const garmentPrices = [
    { item: 'Suit (2 piece)', price: '₹500' },
    { item: 'Suit (3 piece)', price: '₹650' },
    { item: 'Blazer', price: '₹300' },
    { item: 'Evening Gown', price: '₹450' },
    { item: 'Saree', price: '₹400' },
    { item: 'Lehenga', price: '₹800' },
    { item: 'Winter Coat', price: '₹400' },
    { item: 'Formal Dress', price: '₹350' },
    { item: 'Designer Wear', price: '₹600' }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-brand-background pt-32 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex-grow">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-brand-headline mb-4">Dry Cleaning Service</h1>
          <p className="text-xl text-brand-subheadline">Expert care for your delicate and special garments. Get your clothes professionally dry cleaned and handled with care.</p>
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
                Thorough examination of garments and stains.
              </p>
            </div>
            <div>
              <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <span className="text-blue-600 font-bold text-xl">2</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Pre-treatment</h3>
              <p className="text-gray-600">
                Specialized stain removal and fabric preparation.
              </p>
            </div>
            <div>
              <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <span className="text-blue-600 font-bold text-xl">3</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Dry Cleaning</h3>
              <p className="text-gray-600">
                Professional cleaning with premium solvents.
              </p>
            </div>
            <div>
              <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <span className="text-blue-600 font-bold text-xl">4</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Finishing</h3>
              <p className="text-gray-600">
                Expert pressing and packaging for delivery.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DryCleaning; 