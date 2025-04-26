import React from 'react';
import { Package2, Shirt, Truck } from 'lucide-react';
import { colors } from "@/styles/colors";

const HowItWorks = () => {
  const steps = [
    {
      title: "Book it & bag it",
      description: "Pack your laundry and schedule a pick-up when it suits you.",
      icon: Package2
    },
    {
      title: "Cleaned with care, locally",
      description: "We collect your laundry & carefully clean it at our local facilities.",
      icon: Shirt
    },
    {
      title: "Free delivery, fresh results",
      description: "Relax while we clean and deliver your items fresh to your doorstep.",
      icon: Truck
    }
  ];

  const features = [
    {
      text: "Free collection and delivery",
      icon: "🚚"
    },
    {
      text: "24/7 customer support",
      icon: "💬"
    },
    {
      text: "Live order updates",
      icon: "🔔"
    }
  ];

  return (
    <div className="py-16 md:py-24" style={{ background: colors.subHeadline }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <h2 className="text-4xl md:text-5xl font-bold text-blue-900">
              Take back your time.
              <br />
              Leave the laundry to us.
            </h2>
            <a href="/how-it-works" className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium">
              How it works
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </a>

            <div className="grid grid-cols-1 gap-6">
              {steps.map((step, index) => (
                <div key={index} className="bg-white rounded-xl p-6 shadow-sm">
                  <div className="flex items-start space-x-4">
                    <div className="bg-blue-100 rounded-lg p-3">
                      <step.icon className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900">{step.title}</h3>
                      <p className="mt-1" style={{ color: colors.subHeadline }}>{step.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-6">
              {features.map((feature, index) => (
                <div key={index} className="flex items-center space-x-2 text-blue-900">
                  <span className="text-xl">{feature.icon}</span>
                  <span className="font-medium">{feature.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative hidden lg:block">
            <img
              src="/laundry-happy.jpg"
              alt="Happy customer with clean laundry"
              className="rounded-2xl shadow-xl"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default HowItWorks; 