// Add a type declaration for recaptchaVerifier on the Window interface
declare global {
  interface Window {
    recaptchaVerifier: any;
    confirmationResult: any;
  }
}

import React, { useEffect, useRef, useState } from 'react';
import { RecaptchaVerifier, signInWithPhoneNumber, PhoneAuthProvider, linkWithCredential, Auth } from 'firebase/auth';
import { auth } from '../firebase';
import { User } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface Props {
  user: User;
  onPhoneLinked: (phoneNumber: string) => void;
  initialPhoneNumber?: string;
}

const PhoneOTPComponent: React.FC<Props> = ({ user, onPhoneLinked, initialPhoneNumber = '' }) => {
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber);
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  // Update phone number when initialPhoneNumber changes
  useEffect(() => {
    if (initialPhoneNumber) {
      setPhoneNumber(initialPhoneNumber);
    }
  }, [initialPhoneNumber]);

  useEffect(() => {
    // Initialize reCAPTCHA verifier
    recaptchaVerifierRef.current = new RecaptchaVerifier(
      auth as Auth,
      'recaptcha-container',
      {
        size: 'invisible',
        callback: () => {
          console.log('reCAPTCHA verified');
        },
      }
    );

    // Cleanup on component unmount
    return () => {
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear();
      }
    };
  }, []);

  const handleSendOtp = async () => {
    if (!phoneNumber) {
      alert('Enter valid phone number (+91...)');
      return;
    }

    try {
      if (!recaptchaVerifierRef.current) {
        throw new Error('reCAPTCHA not initialized');
      }

      const confirmation = await signInWithPhoneNumber(
        auth,
        phoneNumber,
        recaptchaVerifierRef.current
      );
      
      setConfirmationResult(confirmation);
      setIsOtpSent(true);
      console.log('OTP sent successfully');
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      alert(error.message || 'Failed to send OTP. Please try again.');
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || !confirmationResult) {
      alert('Please enter the OTP');
      return;
    }

    try {
      const credential = PhoneAuthProvider.credential(
        confirmationResult.verificationId,
        otp
      );
      
      const linkedUser = await linkWithCredential(user, credential);
      console.log('Phone number linked in Firebase Auth.', linkedUser.user.phoneNumber);
      
      // Update Firestore document to mark phone as verified
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        phoneVerified: true,
        phone: linkedUser.user.phoneNumber, // Save the linked phone number in Firestore
        updatedAt: new Date().toISOString() // Optional: update a timestamp
      });
      console.log('Firestore document updated with phoneVerified: true.');
      
      onPhoneLinked(linkedUser.user.phoneNumber!);
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      alert(error.message || 'Failed to verify OTP. Please try again.');
    }
  };

  return (
    <div className="max-w-sm mx-auto p-4 border rounded-md shadow-md">
      <h2 className="text-xl font-bold mb-4">Link Phone Number</h2>
      
      {/* reCAPTCHA container */}
      <div id="recaptcha-container" className="mb-4"></div>

      <input
        type="tel"
        className="border p-2 w-full mb-3 rounded"
        placeholder="+91XXXXXXXXXX"
        value={phoneNumber}
        onChange={(e) => setPhoneNumber(e.target.value)}
        disabled={isOtpSent}
      />

      {!isOtpSent ? (
        <button 
          onClick={handleSendOtp} 
          className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors"
        >
          Send OTP
        </button>
      ) : (
        <>
          <input
            type="text"
            className="border p-2 w-full mt-4 mb-3 rounded"
            placeholder="Enter OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
          />
          <button 
            onClick={handleVerifyOtp} 
            className="bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 transition-colors"
          >
            Verify & Link
          </button>
        </>
      )}
    </div>
  );
};

export default PhoneOTPComponent; 