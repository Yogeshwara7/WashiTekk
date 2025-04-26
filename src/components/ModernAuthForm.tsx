import React, { useState } from 'react';
import { auth } from '../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signInWithPhoneNumber, RecaptchaVerifier, updateProfile } from 'firebase/auth';

interface ModernAuthFormProps {
  mode?: 'signup' | 'login';
  onSuccess?: () => void;
}

type Tab = 'email' | 'google' | 'phone';

const ModernAuthForm: React.FC<ModernAuthFormProps> = ({ mode = 'login', onSuccess }) => {
  const [tab, setTab] = useState<Tab>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Email/Password Auth
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'signup') {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        if (name) {
          await updateProfile(userCred.user, { displayName: name });
        }
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      setLoading(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  // Google Auth
  const handleGoogleAuth = async () => {
    setError('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setLoading(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  // Phone Auth
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' });
      const appVerifier = (window as any).recaptchaVerifier;
      await signInWithPhoneNumber(auth, phone, appVerifier)
        .then((confirmationResult: any) => {
          (window as any).confirmationResult = confirmationResult;
          setOtpSent(true);
          setLoading(false);
        });
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await (window as any).confirmationResult.confirm(otp);
      setLoading(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-xs mx-auto">
      <div className="flex justify-center mb-4 gap-2">
        <button className={`px-3 py-1 rounded ${tab === 'email' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`} onClick={() => setTab('email')}>Email</button>
        <button className={`px-3 py-1 rounded ${tab === 'google' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`} onClick={handleGoogleAuth}>Google</button>
        <button className={`px-3 py-1 rounded ${tab === 'phone' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`} onClick={() => setTab('phone')}>Phone</button>
      </div>
      {tab === 'email' && (
        <form onSubmit={handleEmailAuth} className="space-y-4">
          {mode === 'signup' && (
            <input
              type="text"
              placeholder="Name"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border rounded px-3 py-2"
              required
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full border rounded px-3 py-2"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full border rounded px-3 py-2"
            required
          />
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <button
            type="submit"
            className="w-full bg-blue-700 text-white py-2 rounded hover:bg-blue-800 transition"
            disabled={loading}
          >
            {loading ? 'Please wait...' : mode === 'signup' ? 'Sign Up' : 'Login'}
          </button>
        </form>
      )}
      {tab === 'phone' && (
        <form onSubmit={otpSent ? handleVerifyOtp : handleSendOtp} className="space-y-4">
          {!otpSent && (
            <input
              type="tel"
              placeholder="Phone Number (+91...)"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full border rounded px-3 py-2"
              required
            />
          )}
          {otpSent && (
            <input
              type="text"
              placeholder="Enter OTP"
              value={otp}
              onChange={e => setOtp(e.target.value)}
              className="w-full border rounded px-3 py-2"
              required
            />
          )}
          <div id="recaptcha-container"></div>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <button
            type="submit"
            className="w-full bg-blue-700 text-white py-2 rounded hover:bg-blue-800 transition"
            disabled={loading}
          >
            {loading ? 'Please wait...' : !otpSent ? 'Send OTP' : 'Verify OTP'}
          </button>
        </form>
      )}
    </div>
  );
};

export default ModernAuthForm; 