import React, { useRef, useEffect, useState } from 'react';
import { Check, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { motion } from "framer-motion";
import QRCode from 'react-qr-code';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import ModernAuthForm from './ModernAuthForm';

// @ts-ignore
declare global {
  interface Window {
    Razorpay: any;
    RAZORPAY_KEY_ID?: string;
  }
}

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
    price: 3000,
    duration: "3 Months",
    features: [
      "Bed Spread, Pillow Covers, Bedsheet charged separately",
      "Track money only, not KG",
      "Payment options: Hard cash or Online payment",
      "Amount reduces with each order placed"
    ]
  }
];

interface MembershipPlanProps {
  preselectedPlan?: { name: string; price: number; duration: string } | null;
  onClose?: () => void;
}

const MembershipPlan: React.FC<MembershipPlanProps> = ({ preselectedPlan = null, onClose }) => {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(preselectedPlan?.name || null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const [animateKey, setAnimateKey] = useState(0);
  const wasInView = useRef(false);
  const [showModal, setShowModal] = useState(!!preselectedPlan);
  const [selectedPlanObj, setSelectedPlanObj] = useState(preselectedPlan);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [eliteStep, setEliteStep] = useState(1);
  const [eliteType, setEliteType] = useState('');
  const [eliteConditioner, setEliteConditioner] = useState('Comfort');
  const [eliteKg, setEliteKg] = useState(0);
  const [elitePaymentMethod, setElitePaymentMethod] = useState('');
  const [eliteTxnId, setEliteTxnId] = useState('');
  const [eliteSummary, setEliteSummary] = useState('');
  const [elitePending, setElitePending] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [userPlan, setUserPlan] = useState<{ planStatus?: string, planActivatedAt?: string, planDuration?: string } | null>(null);
  const [loadingUserPlan, setLoadingUserPlan] = useState(true);
  const [planExpired, setPlanExpired] = useState(false);
  const [elite3kStep, setElite3kStep] = useState(1);
  const [elite3kPaymentMethod, setElite3kPaymentMethod] = useState('');
  const [elite3kTxnId, setElite3kTxnId] = useState('');
  const [elite3kPending, setElite3kPending] = useState(false);
  const [elite3kVerifying, setElite3kVerifying] = useState(false);
  const [elite3kVerified, setElite3kVerified] = useState(false);

  useEffect(() => {
    if (preselectedPlan) {
      setSelectedPlan(preselectedPlan.name);
      setSelectedPlanObj(preselectedPlan);
      setShowModal(true);
    }
  }, [preselectedPlan]);

  // Always scroll to top when this component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Helper to calculate expiry date
  function getExpiryDate(activatedAt: string, duration: string): Date | null {
    if (!activatedAt || !duration) return null;
    const start = new Date(activatedAt);
    if (duration.toLowerCase().includes('year')) {
      start.setFullYear(start.getFullYear() + 1);
      return start;
    }
    if (duration.toLowerCase().includes('month')) {
      const months = parseInt(duration);
      start.setMonth(start.getMonth() + (isNaN(months) ? 3 : months));
      return start;
    }
    return null;
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        setUserPlan(null);
        setLoadingUserPlan(false);
        setPlanExpired(false);
        return;
      }
      const userRef = doc(db, 'users', firebaseUser.uid);
      getDoc(userRef).then(userSnap => {
        if (userSnap.exists()) {
          const data = userSnap.data();
          setUserPlan(data);
          if (data.planStatus === 'Active' && data.planActivatedAt && data.planDuration) {
            const expiry = getExpiryDate(data.planActivatedAt, data.planDuration);
            if (expiry && expiry < new Date()) {
              setPlanExpired(true);
            } else {
              setPlanExpired(false);
            }
          } else {
            setPlanExpired(false);
          }
        }
        setLoadingUserPlan(false);
      });
    });
    return () => unsubscribe();
  }, []);

  const handlePlanSelection = (plan) => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      setShowAuthModal(true);
      return;
    }
    if (plan.name === 'Elite Plus') {
      setEliteStep(1);
      setEliteType('');
      setEliteConditioner('Comfort');
      setEliteKg(0);
      setElitePaymentMethod('');
      setEliteTxnId('');
      setEliteSummary('');
      setElitePending(false);
      setShowModal(true);
      setSelectedPlan(plan.name);
      setSelectedPlanObj(plan);
      setVerified(false);
      return;
    }
    if (plan.name === 'Elite') {
      setElite3kStep(1);
      setElite3kPaymentMethod('');
      setElite3kTxnId('');
      setElite3kPending(false);
      setShowModal(true);
      setSelectedPlan(plan.name);
      setSelectedPlanObj(plan);
      setVerified(false);
      return;
    }
    setSelectedPlan(plan.name);
    setSelectedPlanObj(plan);
    setShowModal(true);
    setVerified(false);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    if (onClose) onClose();
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
      if (data.verified) {
        // Update Firestore with plan/payment info
        const firebaseUser = auth.currentUser;
        if (!firebaseUser) return;
        const userRef = doc(db, 'users', firebaseUser.uid);
        const paymentRecord = {
          date: new Date().toLocaleString(),
          amount: selectedPlanObj.price,
          status: 'Success',
          plan: selectedPlanObj.name
        };
        try {
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            await updateDoc(userRef, {
              planName: selectedPlanObj.name,
              planPrice: selectedPlanObj.price,
              planDuration: selectedPlanObj.duration,
              planStatus: 'Active',
              payments: arrayUnion(paymentRecord)
            });
          } else {
            await setDoc(userRef, {
              planName: selectedPlanObj.name,
              planPrice: selectedPlanObj.price,
              planDuration: selectedPlanObj.duration,
              planStatus: 'Active',
              payments: [paymentRecord]
            });
          }
        } catch (err) {
          console.error('Failed to update user dashboard:', err);
        }
      }
    } catch (e) {
      setVerified(false);
    }
    setVerifying(false);
  };

  // Razorpay payment handler
  const handleOnlinePayment = async () => {
    if (!selectedPlanObj) return;
    // 1. Create order on backend
    const res = await fetch('/api/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: selectedPlanObj.price, receipt: selectedPlanObj.name })
    });
    const order = await res.json();
    if (!order.id) {
      alert('Failed to create order.');
      return;
    }
    // 2. Open Razorpay Checkout
    const options = {
      key: window.RAZORPAY_KEY_ID,
      amount: order.amount,
      currency: order.currency,
      name: 'Washitek',
      description: `Payment for ${selectedPlanObj.name}`,
      order_id: order.id,
      handler: async function (response) {
        // 3. Verify payment on backend
        setVerifying(true);
        setVerified(false);
        try {
          const verifyRes = await fetch('/api/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            })
          });
          const verifyData = await verifyRes.json();
          setVerified(verifyData.verified);
          if (verifyData.verified) {
            // Update Firestore with plan/payment info
            const firebaseUser = auth.currentUser;
            if (!firebaseUser) return;
            const userRef = doc(db, 'users', firebaseUser.uid);
            const paymentRecord = {
              date: new Date().toLocaleString(),
              amount: selectedPlanObj.price,
              status: 'Success',
              plan: selectedPlanObj.name
            };
            try {
              const userSnap = await getDoc(userRef);
              if (userSnap.exists()) {
                await updateDoc(userRef, {
                  planName: selectedPlanObj.name,
                  planPrice: selectedPlanObj.price,
                  planDuration: selectedPlanObj.duration,
                  planStatus: 'Active',
                  payments: arrayUnion(paymentRecord)
                });
              } else {
                await setDoc(userRef, {
                  planName: selectedPlanObj.name,
                  planPrice: selectedPlanObj.price,
                  planDuration: selectedPlanObj.duration,
                  planStatus: 'Active',
                  payments: [paymentRecord]
                });
              }
            } catch (err) {
              console.error('Failed to update user dashboard:', err);
            }
          }
        } catch (e) {
          setVerified(false);
        }
        setVerifying(false);
      },
      prefill: {
        name: '',
        email: '',
        contact: ''
      },
      theme: { color: '#2563eb' }
    };
    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  // Razorpay payment handler for Elite 3k
  const handleElite3kOnlinePayment = async () => {
    if (!selectedPlanObj) return;
    const res = await fetch('/api/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 3000, receipt: 'Elite' })
    });
    const order = await res.json();
    if (!order.id) {
      alert('Failed to create order.');
      return;
    }
    const options = {
      key: window.RAZORPAY_KEY_ID,
      amount: order.amount,
      currency: order.currency,
      name: 'Washitek',
      description: 'Payment for Elite',
      order_id: order.id,
      handler: async function (response) {
        setElite3kVerifying(true);
        setElite3kVerified(false);
        try {
          const verifyRes = await fetch('/api/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            })
          });
          const verifyData = await verifyRes.json();
          setElite3kVerified(verifyData.verified);
          if (verifyData.verified) {
            setElite3kTxnId(response.razorpay_payment_id);
          }
        } catch (e) {
          setElite3kVerified(false);
        }
        setElite3kVerifying(false);
      },
      prefill: { name: '', email: '', contact: '' },
      theme: { color: '#2563eb' }
    };
    const rzp = new window.Razorpay(options);
    rzp.open();
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

  if (loadingUserPlan) {
    return <div>Loading...</div>;
  }

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
          {userPlan?.planStatus === 'Active' && !planExpired && (
            <div className="mb-8 bg-white/90 border border-green-200 rounded-lg p-4 shadow text-center">
              <div className="text-green-700 font-bold text-lg">You already have an active plan.</div>
              <div className="text-gray-700">Please wait until your current plan expires before purchasing or upgrading.</div>
              {userPlan.planActivatedAt && userPlan.planDuration && (
                <div className="text-gray-800 font-semibold">
                  Plan expires on: {getExpiryDate(userPlan.planActivatedAt, userPlan.planDuration)?.toLocaleDateString()}
                </div>
              )}
            </div>
          )}
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
                {userPlan?.planStatus === 'Active' && !planExpired ? (
                  <Button className="mt-auto bg-gray-200 text-gray-500 font-semibold cursor-not-allowed" disabled>You have an active plan</Button>
                ) : (
                <Button 
                    className="mt-auto bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold"
                    onClick={() => handlePlanSelection(plan)}
                    disabled={loadingUserPlan}
                >
                  SELECT PLAN
                </Button>
                )}
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

        {selectedPlan === 'Elite Plus' && showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full relative">
              <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl" onClick={handleCloseModal} aria-label="Close">×</button>
              <h2 className="text-2xl font-bold mb-4 text-blue-700">Elite Plus Plan Selection</h2>
              {eliteStep === 1 && (
                <div>
                  <div className="mb-4 font-semibold">Choose your service type:</div>
                  <div className="flex flex-col gap-3 mb-4">
                    <label className="flex items-center gap-2">
                      <input type="radio" name="eliteType" value="without" checked={eliteType === 'without'} onChange={() => { setEliteType('without'); setEliteKg(240); }} />
                      Without Fabric Conditioner (240 KG/year)
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="radio" name="eliteType" value="with" checked={eliteType === 'with'} onChange={() => { setEliteType('with'); setEliteKg(180); }} />
                      With Fabric Conditioner (180 KG/year)
                    </label>
                  </div>
                  {eliteType === 'with' && (
                    <div className="mb-4">
                      <div className="font-semibold mb-2">Choose Conditioner:</div>
                      <select className="w-full border rounded px-3 py-2" value={eliteConditioner} onChange={e => setEliteConditioner(e.target.value)}>
                        <option value="Comfort">Comfort</option>
                        <option value="Dettol">Dettol</option>
                      </select>
                    </div>
                  )}
                  <Button className="w-full" disabled={!eliteType} onClick={() => setEliteStep(2)}>Next</Button>
                </div>
              )}
              {eliteStep === 2 && (
                <div>
                  <div className="mb-4 font-semibold">Choose payment method:</div>
                  <div className="flex flex-col gap-3 mb-4">
                    <label className="flex items-center gap-2">
                      <input type="radio" name="elitePayment" value="cash" checked={elitePaymentMethod === 'cash'} onChange={() => setElitePaymentMethod('cash')} />
                      Hard Cash (Pay to staff)
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="radio" name="elitePayment" value="online" checked={elitePaymentMethod === 'online'} onChange={() => setElitePaymentMethod('online')} />
                      Online Payment
                    </label>
                  </div>
                  {elitePaymentMethod === 'online' && (
                    <div className="flex flex-col items-center mb-4">
                      <button
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 font-semibold transition"
                        onClick={handleOnlinePayment}
                      >
                        <img src="https://cdn.razorpay.com/static/assets/razorpay-glyph.svg" alt="Razorpay" className="w-6 h-6" />
                        Pay with Razorpay
                      </button>
                      <div className="text-xs text-gray-500 mt-2">Secure online payment</div>
                    </div>
                  )}
                  <Button className="w-full mb-2" disabled={!elitePaymentMethod || (elitePaymentMethod === 'online' && verifying)} onClick={() => setEliteStep(3)}>Next</Button>
                  <Button className="w-full" variant="outline" onClick={() => setEliteStep(1)}>Back</Button>
                </div>
              )}
              {eliteStep === 3 && (
                <div>
                  <div className="mb-4 font-semibold">Summary</div>
                  <ul className="mb-4 text-sm list-disc pl-5">
                    <li>Plan: Elite Plus (₹10,000, 1 Year)</li>
                    <li>Service: {eliteType === 'with' ? `With Fabric Conditioner (${eliteConditioner}, 180 KG)` : 'Without Fabric Conditioner (240 KG)'}</li>
                    <li>Payment: {elitePaymentMethod === 'cash' ? 'Hard Cash' : 'Online'}</li>
                    <li>Note: Once you select a plan, it cannot be changed.</li>
                    <li>All items (including bedsheets, pillow covers) are calculated in KG only.</li>
                    <li>Ironing: Only 2 pairs at a time, extra charged separately.</li>
                  </ul>
                  <Button className="w-full mb-2" disabled={elitePending} onClick={async () => {
                    setElitePending(true);
                    // Store request as pending for admin approval
                    const firebaseUser = auth.currentUser;
                    if (!firebaseUser) return;
                    const userRef = doc(db, 'users', firebaseUser.uid);
                    await setDoc(userRef, {
                      planRequest: {
                        plan: 'Elite Plus',
                        price: 10000,
                        duration: '1 Year',
                        type: eliteType,
                        conditioner: eliteType === 'with' ? eliteConditioner : '',
                        kgLimit: eliteKg,
                        paymentMethod: elitePaymentMethod,
                        txnId: elitePaymentMethod === 'online' ? eliteTxnId : '',
                        status: 'pending',
                        requestedAt: new Date().toISOString(),
                      }
                    }, { merge: true });
                    setElitePending(false);
                    setEliteStep(4);
                  }}>Submit for Approval</Button>
                  <Button className="w-full" variant="outline" onClick={() => setEliteStep(2)}>Back</Button>
                </div>
              )}
              {eliteStep === 4 && (
                <div className="text-center py-8">
                  <div className="text-green-600 text-lg font-semibold mb-2">Request Submitted!</div>
                  <div className="text-gray-600">Your plan request is pending admin approval. You will be notified once approved.</div>
                  <Button className="mt-6 w-full" onClick={handleCloseModal}>Close</Button>
                </div>
              )}
            </div>
          </div>
        )}

        {selectedPlan === 'Elite' && showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full relative">
              <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl" onClick={handleCloseModal} aria-label="Close">×</button>
              <h2 className="text-2xl font-bold mb-4 text-blue-700">Elite Plan Selection</h2>
              {elite3kStep === 1 && (
                <div>
                  <div className="mb-4 font-semibold">Choose payment method:</div>
                  <div className="flex flex-col gap-3 mb-4">
                    <label className="flex items-center gap-2">
                      <input type="radio" name="elite3kPayment" value="cash" checked={elite3kPaymentMethod === 'cash'} onChange={() => setElite3kPaymentMethod('cash')} />
                      Hard Cash (Pay to staff)
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="radio" name="elite3kPayment" value="online" checked={elite3kPaymentMethod === 'online'} onChange={() => setElite3kPaymentMethod('online')} />
                      Online Payment
                    </label>
                  </div>
                  {elite3kPaymentMethod === 'online' && (
                    <div className="flex flex-col items-center mb-4">
                      <button
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 font-semibold transition"
                        onClick={handleElite3kOnlinePayment}
                        disabled={elite3kVerifying}
                      >
                        <img src="https://cdn.razorpay.com/static/assets/razorpay-glyph.svg" alt="Razorpay" className="w-6 h-6" />
                        Pay with Razorpay
                      </button>
                      {elite3kTxnId && <div className="text-xs text-green-600 mt-2">Payment successful! Txn ID: {elite3kTxnId}</div>}
                      <div className="text-xs text-gray-500 mt-2">Secure online payment</div>
                    </div>
                  )}
                  <Button className="w-full mb-2" disabled={elite3kPending || (elite3kPaymentMethod === 'online' && !elite3kTxnId)} onClick={async () => {
                    setElite3kPending(true);
                    const firebaseUser = auth.currentUser;
                    if (!firebaseUser) return;
                    const userRef = doc(db, 'users', firebaseUser.uid);
                    await setDoc(userRef, {
                      planRequest: {
                        plan: 'Elite',
                        price: 3000,
                        duration: '3 Months',
                        paymentMethod: elite3kPaymentMethod,
                        txnId: elite3kPaymentMethod === 'online' ? elite3kTxnId : '',
                        status: 'pending',
                        requestedAt: new Date().toISOString(),
                      }
                    }, { merge: true });
                    setElite3kPending(false);
                    setElite3kStep(3);
                  }}>Submit for Approval</Button>
                  <Button className="w-full" variant="outline" onClick={() => setElite3kStep(1)}>Back</Button>
                </div>
              )}
              {elite3kStep === 3 && (
                <div className="text-center py-8">
                  <div className="text-green-600 text-lg font-semibold mb-2">Request Submitted!</div>
                  <div className="text-gray-600">Your plan request is pending admin approval. You will be notified once approved.</div>
                  <Button className="mt-6 w-full" onClick={handleCloseModal}>Close</Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Auth Modal for plan selection */}
        {showAuthModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full relative">
              <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl" onClick={() => setShowAuthModal(false)} aria-label="Close">×</button>
              <div className="flex flex-col items-center mb-4">
                <span className="text-3xl font-bold text-blue-700 mb-2">Washitek</span>
                <span className="text-lg font-semibold text-gray-700 mb-2">Login or Sign Up to select a plan</span>
              </div>
              <ModernAuthForm onSuccess={() => { setShowAuthModal(false); }} />
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default MembershipPlan; 