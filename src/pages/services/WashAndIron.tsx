import React from 'react';
import { Check } from 'lucide-react';

const WashAndIron = () => {
  const pricingTiers = [
    {
      name: 'Basic Wash & Iron',
      price: '₹100',
      unit: 'per kg',
      features: [
        'Regular clothes washing',
        'Machine drying',
        'Steam ironing',
        '48-hour turnaround',
        'Free pickup & delivery (min 5kg)'
      ],
      popular: false
    },
    {
      name: 'Premium Wash & Iron',
      price: '₹150',
      unit: 'per kg',
      features: [
        'Premium detergent',
        'Fabric softener',
        'Professional ironing',
        '24-hour turnaround',
        'Free pickup & delivery',
        'Stain treatment'
      ],
      popular: true
    },
    {
      name: 'Bulk Wash & Iron',
      price: '₹80',
      unit: 'per kg',
      features: [
        'Minimum 8kg',
        'Regular washing',
        'Standard ironing',
        '72-hour turnaround',
        'Free pickup & delivery',
        'Ideal for hostels & PGs'
      ],
      popular: false
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
              <h3 className="text-lg font-semibold mb-2">Collection</h3>
              <p className="text-gray-600">
                Schedule a pickup and we'll collect your clothes from your location.
              </p>
            </div>
            <div>
              <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <span className="text-blue-600 font-bold text-xl">2</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Washing</h3>
              <p className="text-gray-600">
                Your clothes are carefully sorted and washed using premium detergents.
              </p>
            </div>
            <div>
              <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <span className="text-blue-600 font-bold text-xl">3</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Ironing</h3>
              <p className="text-gray-600">
                Each garment is professionally pressed and ironed to perfection.
              </p>
            </div>
            <div>
              <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <span className="text-blue-600 font-bold text-xl">4</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Delivery</h3>
              <p className="text-gray-600">
                Your fresh, clean, and crisply ironed clothes are delivered to your doorstep.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WashAndIron; 