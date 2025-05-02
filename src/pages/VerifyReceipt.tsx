import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';

const VerifyReceipt = () => {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState('');
  const [receiptNo, setReceiptNo] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const receiptParam = params.get('receipt');
    setReceiptNo(receiptParam || '');
    if (!receiptParam) {
      setError('No receipt number provided.');
      setLoading(false);
      return;
    }
    // Search all users for a payment with this receipt number
    (async () => {
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        let found = null;
        usersSnap.forEach(docSnap => {
          const data = docSnap.data();
          if (Array.isArray(data.payments)) {
            const match = data.payments.find(p => {
              const pNo = p.referenceId || p.transactionId || (p.date && p.date.replace(/\W+/g, '').slice(-8));
              return pNo === receiptParam;
            });
            if (match) {
              found = { user: data, payment: match };
            }
          }
        });
        if (found) {
          setReceipt(found);
        } else {
          setError('Receipt not found.');
        }
      } catch (e) {
        setError('Error fetching receipt.');
      }
      setLoading(false);
    })();
  }, [location.search]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 py-12 px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-lg w-full border border-gray-200">
        <h1 className="text-2xl font-bold mb-4 text-center text-blue-700">Receipt Verification</h1>
        {loading ? (
          <div className="text-center text-gray-500">Loading...</div>
        ) : error ? (
          <div className="text-center text-red-600 font-semibold">{error}</div>
        ) : (
          <div>
            <div className="mb-4 text-center text-green-700 font-semibold">Receipt Found!</div>
            <div className="mb-2"><span className="font-semibold">Receipt #:</span> {receiptNo}</div>
            <div className="mb-2"><span className="font-semibold">Name:</span> {receipt.user.name || receipt.user.email}</div>
            <div className="mb-2"><span className="font-semibold">Email:</span> {receipt.user.email}</div>
            <div className="mb-2"><span className="font-semibold">Plan:</span> {receipt.payment.plan}</div>
            <div className="mb-2"><span className="font-semibold">Amount:</span> Rs. {receipt.payment.amount}</div>
            <div className="mb-2"><span className="font-semibold">Status:</span> {receipt.payment.status}</div>
            <div className="mb-2"><span className="font-semibold">Date:</span> {receipt.payment.date}</div>
            {receipt.payment.method && (
              <div className="mb-2"><span className="font-semibold">Payment Method:</span> {receipt.payment.method}</div>
            )}
            {(receipt.payment.referenceId || receipt.payment.transactionId) && (
              <div className="mb-2"><span className="font-semibold">Transaction ID:</span> {receipt.payment.referenceId || receipt.payment.transactionId}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyReceipt; 