import React, { useRef, useEffect, useState } from 'react';
import { Check, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { motion } from "framer-motion";
import QRCode from 'react-qr-code';

const plans = [
  {
    name: "Elite Plus",
    price: 10000,
    duration: "1 Year",
    features: [
      "Choose between: Without Fabric conditioner (180 KG) or With Fabric conditioner (240 KG)",
      "Iron of clothes only 2 pairs at a time",
      "All items calculated in KG only (including Bed Spread, Pillow Covers, Bedsheet)",
      "Track number of KG only",
      "Free Pickup & Delivery",
      "Payment options: Hard cash or Online payment",
      "Note: Plan cannot be changed once selected"
    ]
  },
  {
    name: "Elite",
    price: 1,
    duration: "3 Months",
    features: [
      "Bed Spread, Pillow Covers, Bedsheet charged separately",
      "Track money only, not KG",
      "Payment options: Hard cash or Online payment",
      "Amount reduces with each order placed"
    ]
  }
];

const MembershipPlan = () => {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const [animateKey, setAnimateKey] = useState(0);
  const wasInView = useRef(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedPlanObj, setSelectedPlanObj] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);

  const handlePlanSelection = (plan) => {
    console.log('Plan selected:', plan);
    setSelectedPlan(plan.name);
    setSelectedPlanObj(plan);
    setShowModal(true);
    setVerified(false);
  };

  const handleVerifyPayment = async () => {
    setVerifying(true);
    setVerified(false);
    try {
      const res = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selectedPlanObj?.name })
      });
      const data = await res.json();
      setVerified(data.verified);
    } catch (e) {
      setVerified(false);
    }
    setVerifying(false);
  };

  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current) return;
      const rect = sectionRef.current.getBoundingClientRect();
      const inView = rect.top < window.innerHeight && rect.bottom > 0;
      if (inView && !wasInView.current) {
        setAnimateKey(prev => prev + 1);
      }
      wasInView.current = inView;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section ref={sectionRef} className="py-20 bg-gray-50 h-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Our Membership Plans
          </h2>
          <p className="text-xl text-gray-600 mb-4">
            Choose the plan that best fits your needs
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch h-full">
          {plans.map((plan, index) => (
            <motion.div
              key={animateKey + '-' + index}
              className="group bg-white rounded-xl shadow-lg transition-transform duration-700 ease-out flex flex-col h-full overflow-hidden relative group-hover:animate-rubber"
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: false, amount: 0.8 }}
              transition={{ duration: 0.6, delay: index * 0.15, type: 'spring' }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-washitek-400/10 to-washitek-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
              <div className="relative p-6 bg-blue-600 text-white rounded-t-xl">
                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                <div className="flex items-baseline">
                  <span className="text-3xl font-bold">₹{plan.price}</span>
                  <span className="ml-2 text-blue-200">/ {plan.duration}</span>
                </div>
              </div>
              <div className="flex-1 flex flex-col p-6">
                <div className="space-y-4 flex-1">
                  {plan.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-start space-x-3">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-1" />
                      <span className="text-gray-600 text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
                <Button
                  className="mt-auto bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold"
                  onClick={() => handlePlanSelection(plan)}
                >
                  SELECT PLAN
                </Button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Credit System Information */}
        <div className="mt-12 bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-center mb-6">
            <AlertCircle className="w-6 h-6 text-yellow-500 mr-2" />
            <h3 className="text-xl font-semibold">Credit System</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Credit Features</h4>
                <ul className="list-disc pl-5 space-y-2 text-gray-600">
                  <li>Temporary credit limit up to ₹500</li>
                  <li>Available when payment is pending</li>
                  <li>Same pricing as regular service menu</li>
                  <li>Full balance payment required</li>
                </ul>
              </div>
            </div>
            <div className="space-y-4">
              <div className="bg-red-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Important Notes</h4>
                <ul className="list-disc pl-5 space-y-2 text-gray-600">
                  <li>Auto notifications for inactive accounts</li>
                  <li>1 month grace period for repayment</li>
                  <li>₹10/day late payment charge after grace period</li>
                  <li>Service may be suspended if payment is overdue</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Process Information */}
        <div className="mt-12 bg-white p-8 rounded-lg shadow-lg">
          <h3 className="text-xl font-semibold mb-6">Payment Process</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-semibold">Hard Cash Payment</h4>
              <ul className="list-disc pl-5 space-y-2 text-gray-600">
                <li>Staff receives payment and approves request</li>
                <li>Amount reflects in user login</li>
                <li>Displays plan amount in KG/RS based on selection</li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold">Online Payment</h4>
              <ul className="list-disc pl-5 space-y-2 text-gray-600">
                <li>Update Transition ID and amount in user account</li>
                <li>Staff approves after payment verification</li>
                <li>Amount reflects in user login</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Important Notes */}
        <div className="mt-8 bg-yellow-50 p-6 rounded-lg border border-yellow-200">
          <h4 className="font-semibold text-yellow-800 mb-4">Important Notes:</h4>
          <ul className="list-disc pl-5 space-y-2 text-yellow-700">
            <li>Plan cannot be changed once selected</li>
            <li>For Elite Plus plan, service type must be selected at signup</li>
          </ul>
        </div>

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full relative">
              <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-700" onClick={() => setShowModal(false)}>&times;</button>
              <h2 className="text-xl font-bold mb-4">Scan to Pay for {selectedPlanObj?.name}</h2>
              <div className="flex flex-col items-center">
                <QRCode value={`upi://pay?pa=yogeshwara49@okaxis&pn=Yogeshwara&am=${selectedPlanObj?.price || ''}`} size={200} />
                <p className="mt-4 text-gray-600 text-sm">Scan this QR code with your UPI app to pay ₹{selectedPlanObj?.price}</p>
                <button
                  className="mt-6 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold"
                  onClick={handleVerifyPayment}
                  disabled={verifying}
                >
                  {verifying ? 'Verifying...' : 'Verify Payment'}
                </button>
                {verified && <div className="mt-4 text-green-600 font-bold">Payment Verified!</div>}
                {verified === false && !verifying && <div className="mt-4 text-red-600">Not Verified. Please try again after payment.</div>}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default MembershipPlan; 