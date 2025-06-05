import React, { useEffect, useState } from 'react';
import { auth } from '../firebase';
import { applyActionCode } from 'firebase/auth';
import { useLocation, useNavigate } from 'react-router-dom';

const VerifyEmail = () => {
  const [message, setMessage] = useState('Verifying your email...');
  const [error, setError] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const verifyEmail = async () => {
      const params = new URLSearchParams(location.search);
      const oobCode = params.get('oobCode');

      if (!oobCode) {
        setError('Verification code not found.');
        setMessage('');
        return;
      }

      try {
        await applyActionCode(auth, oobCode);
        setMessage('Email verified successfully! You can now log in.');
        // Optionally redirect after a delay
        setTimeout(() => {
          navigate('/login'); // Redirect to your login page
        }, 3000);
      } catch (err: any) {
        setError(`Error verifying email: ${err.message}`);
        setMessage('');
      }
    };

    verifyEmail();
  }, [location.search, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="p-6 bg-white rounded-md shadow-md">
        {message && <p className="text-green-600">{message}</p>}
        {error && <p className="text-red-600">{error}</p>}
      </div>
    </div>
  );
};

export default VerifyEmail; 