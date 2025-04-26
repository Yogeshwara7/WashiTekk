import React from 'react';
import { Check } from 'lucide-react';

const WashAndFold = () => {
  const pricingTiers = [
    {
      name: 'Basic Wash & Fold',
      price: '₹80',
      unit: 'per kg',
      features: [
        'Regular clothes washing',
        'Machine drying',
        'Basic folding',
        '48-hour turnaround',
        'Free pickup & delivery (min 5kg)'
      ],
      popular: false
    },
    {
      name: 'Premium Wash & Fold',
      price: '₹120',
      unit: 'per kg',
      features: [
        'Premium detergent',
        'Fabric softener',
        'Precise folding',
        '24-hour turnaround',
        'Free pickup & delivery',
        'Stain treatment'
      ],
      popular: true
    },
    {
      name: 'Bulk Wash & Fold',
      price: '₹60',
      unit: 'per kg',
      features: [
        'Minimum 10kg',
        'Regular washing',
        'Basic folding',
        '72-hour turnaround',
        'Free pickup & delivery',
        'Ideal for hostels & PGs'
      ],
      popular: false
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-brand-background pt-32 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex-grow">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-brand-headline mb-4">Wash & Fold Service</h1>
          <p className="text-xl text-brand-subheadline">Professional washing and folding service for all your daily wear. Get your clothes back clean, fresh, and perfectly folded.</p>
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
                {tier.price}
                <span className="text-base font-normal text-brand-cardparagraph">
                  {tier.unit}
                </span>
              </div>
              <ul className="text-brand-cardparagraph mb-6 space-y-2 text-left">
                {tier.features.map((feature) => (
                  <li key={feature}>✔ {feature}</li>
                ))}
              </ul>
              <button className={`w-full bg-brand-highlight text-brand-background font-semibold py-2 px-4 rounded-lg hover:bg-brand-highlight/90 transition mt-auto ${
                tier.popular ? 'md:scale-105' : ''
              }`}>
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
    </div>
  );
};

export default WashAndFold; 