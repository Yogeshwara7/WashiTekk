import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signInWithPhoneNumber, RecaptchaVerifier, updateProfile } from 'firebase/auth';
import { collection, query, where, getDocs, setDoc, doc } from 'firebase/firestore';

interface ModernAuthFormProps {
  mode?: 'signup' | 'login';
  onSuccess?: () => void;
}

type Tab = 'email' | 'google' | 'phone';

interface ValidationErrors {
  username?: string;
  name?: string;
  phone?: string;
  email?: string;
  password?: string;
}

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
  const [username, setUsername] = useState('');
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [passwordStrength, setPasswordStrength] = useState(0);

  // Validation functions
  const validateUsername = (value: string) => {
    if (!value) return 'Username is required';
    if (value.length < 3) return 'Username must be at least 3 characters';
    if (!/^[a-zA-Z0-9_]+$/.test(value)) return 'Username can only contain letters, numbers, and underscores';
    return '';
  };

  const validateName = (value: string) => {
    if (!value) return 'Name is required';
    if (value.length < 2) return 'Name must be at least 2 characters';
    if (!/^[a-zA-Z\s]+$/.test(value)) return 'Name can only contain letters and spaces';
    return '';
  };

  const validatePhone = (value: string) => {
    if (!value) return 'Phone number is required';
    if (!/^\+?[1-9]\d{9,14}$/.test(value)) return 'Please enter a valid phone number';
    return '';
  };

  const validateEmail = (value: string) => {
    if (!value) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Please enter a valid email address';
    return '';
  };

  const validatePassword = (value: string) => {
    if (!value) return 'Password is required';
    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumbers = /\d/.test(value);
    const hasSpecialChar = /[!@#$%^&*]/.test(value);
    const isLongEnough = value.length >= 8;

    let strength = 0;
    if (hasUpperCase) strength++;
    if (hasLowerCase) strength++;
    if (hasNumbers) strength++;
    if (hasSpecialChar) strength++;
    if (isLongEnough) strength++;

    setPasswordStrength(strength);

    if (!isLongEnough) return 'Password must be at least 8 characters';
    if (!hasUpperCase) return 'Password must contain at least one uppercase letter';
    if (!hasLowerCase) return 'Password must contain at least one lowercase letter';
    if (!hasNumbers) return 'Password must contain at least one number';
    if (!hasSpecialChar) return 'Password must contain at least one special character (!@#$%^&*)';
    return '';
  };

  // Username uniqueness check
  const checkUsernameUnique = async (uname: string) => {
    if (!uname) return;
    const q = query(collection(db, 'users'), where('username', '==', uname));
    const snap = await getDocs(q);
    if (!snap.empty) {
      setValidationErrors(prev => ({ ...prev, username: 'Username already exists' }));
      return false;
    } else {
      setValidationErrors(prev => ({ ...prev, username: '' }));
      return true;
    }
  };

  // Email/Password Auth
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

      if (mode === 'signup') {
      // Validate all fields
      const errors: ValidationErrors = {
        username: validateUsername(username),
        name: validateName(name),
        phone: validatePhone(phone),
        email: validateEmail(email),
        password: validatePassword(password)
      };

      setValidationErrors(errors);

      // Check if there are any validation errors
      if (Object.values(errors).some(error => error)) {
        setLoading(false);
        return;
      }

      // Check username uniqueness
        const unique = await checkUsernameUnique(username);
        if (!unique) {
          setLoading(false);
          return;
        }
    }

    try {
      if (mode === 'signup') {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        if (name) {
          await updateProfile(userCred.user, { displayName: name });
        }
        // Save user data in Firestore
        await setDoc(doc(db, 'users', userCred.user.uid), { 
          username,
          name,
          phone,
          email,
          createdAt: new Date().toISOString()
        }, { merge: true });
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
            <>
              <div>
              <input
                type="text"
                placeholder="Username"
                value={username}
                  onChange={e => {
                    setUsername(e.target.value);
                    setValidationErrors(prev => ({ ...prev, username: validateUsername(e.target.value) }));
                  }}
                onBlur={e => checkUsernameUnique(e.target.value)}
                  className={`w-full border rounded px-3 py-2 ${validationErrors.username ? 'border-red-500' : ''}`}
                required
              />
                {validationErrors.username && <div className="text-red-600 text-sm mt-1">{validationErrors.username}</div>}
              </div>
              <div>
              <input
                type="text"
                placeholder="Name"
                value={name}
                  onChange={e => {
                    setName(e.target.value);
                    setValidationErrors(prev => ({ ...prev, name: validateName(e.target.value) }));
                  }}
                  className={`w-full border rounded px-3 py-2 ${validationErrors.name ? 'border-red-500' : ''}`}
                required
              />
                {validationErrors.name && <div className="text-red-600 text-sm mt-1">{validationErrors.name}</div>}
              </div>
              <div>
              <input
                type="tel"
                  placeholder="Phone Number (+91...)"
                value={phone}
                  onChange={e => {
                    setPhone(e.target.value);
                    setValidationErrors(prev => ({ ...prev, phone: validatePhone(e.target.value) }));
                  }}
                  className={`w-full border rounded px-3 py-2 ${validationErrors.phone ? 'border-red-500' : ''}`}
                required
              />
                {validationErrors.phone && <div className="text-red-600 text-sm mt-1">{validationErrors.phone}</div>}
              </div>
            </>
          )}
          <div>
          <input
            type="email"
            placeholder="Email"
            value={email}
              onChange={e => {
                setEmail(e.target.value);
                setValidationErrors(prev => ({ ...prev, email: validateEmail(e.target.value) }));
              }}
              className={`w-full border rounded px-3 py-2 ${validationErrors.email ? 'border-red-500' : ''}`}
            required
          />
            {validationErrors.email && <div className="text-red-600 text-sm mt-1">{validationErrors.email}</div>}
          </div>
          <div>
          <input
            type="password"
            placeholder="Password"
            value={password}
              onChange={e => {
                setPassword(e.target.value);
                setValidationErrors(prev => ({ ...prev, password: validatePassword(e.target.value) }));
              }}
              className={`w-full border rounded px-3 py-2 ${validationErrors.password ? 'border-red-500' : ''}`}
            required
          />
            {validationErrors.password && <div className="text-red-600 text-sm mt-1">{validationErrors.password}</div>}
            {mode === 'signup' && password && (
              <div className="mt-2">
                <div className="flex gap-1 h-1">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className={`flex-1 rounded-full ${
                        i < passwordStrength ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Password strength: {passwordStrength}/5
                </div>
              </div>
            )}
          </div>
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