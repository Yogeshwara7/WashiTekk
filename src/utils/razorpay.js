// openRazorpay.js - Utility for Razorpay integration

export async function openRazorpay({ amount, description, receipt, onSuccess, onFailure, handler }) {
  try {
    // 1. Create order on backend
    const res = await fetch('/api/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, receipt })
    });
    const order = await res.json();
    if (!order.id) {
      if (onFailure) onFailure('Failed to create order.');
      return;
    }
    // 2. Open Razorpay Checkout
    const options = {
      key: window.RAZORPAY_KEY_ID,
      amount: order.amount,
      currency: order.currency,
      name: 'Washitek',
      description,
      order_id: order.id,
      handler: handler || async function (response) {
        // 3. Verify payment on backend
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
          if (verifyData.verified) {
            if (onSuccess) onSuccess(response);
          } else {
            if (onFailure) onFailure('Payment verification failed.');
          }
        } catch (e) {
          if (onFailure) onFailure('Payment verification error.');
        }
      },
      prefill: { name: '', email: '', contact: '' },
      theme: { color: '#2563eb' }
    };
    const rzp = new window.Razorpay(options);
    rzp.open();
  } catch (err) {
    if (onFailure) onFailure('Payment error.');
  }
} 