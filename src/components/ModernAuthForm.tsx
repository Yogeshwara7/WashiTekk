import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signInWithPhoneNumber, RecaptchaVerifier, updateProfile, sendEmailVerification } from 'firebase/auth';
import { collection, query, where, getDocs, setDoc, doc, getDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';

interface ModernAuthFormProps {
  mode?: 'signup' | 'login';
  onSuccess?: () => void;
  hideTabs?: boolean;
  isPhoneVerificationOnly?: boolean;
  initialPhoneNumber?: string;
}

type Tab = 'manual' | 'google' | 'phone';

interface ValidationErrors {
  username?: string;
  name?: string;
  phone?: string;
  email?: string;
  password?: string;
}

const ModernAuthForm: React.FC<ModernAuthFormProps> = ({ mode = 'login', onSuccess, hideTabs, isPhoneVerificationOnly, initialPhoneNumber }) => {
  const [tab, setTab] = useState<Tab>(hideTabs ? 'manual' : (mode === 'signup' ? 'manual' : 'google'));
  const [name, setName] = useState('');
  const [phone, setPhone] = useState(isPhoneVerificationOnly && initialPhoneNumber ? initialPhoneNumber : '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [phoneNumberForLogin, setPhoneNumberForLogin] = useState('');
  const [otpForLogin, setOtpForLogin] = useState('');
  const [otpSentForLogin, setOtpSentForLogin] = useState(false);
  const [confirmationResultForLogin, setConfirmationResultForLogin] = useState<any>(null);
  const [showPasswordSignup, setShowPasswordSignup] = useState(false);
  const [showPasswordLogin, setShowPasswordLogin] = useState(false);

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
    // Updated regex for international phone number format (basic validation)
    if (!/^\+91\d{10}$/.test(value.replace(/[\s-()]/g, ''))) return 'Please enter a valid Indian phone number (e.g., +919876543210)';
    return '';
  };

  const validateEmail = (value: string) => {
    if (!value) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Please enter a valid email address';
    return '';
  };

  const validatePassword = (value: string) => {
    if (!value) return 'Password is required';
    const isLongEnough = value.length >= 8;

    if (!isLongEnough) return 'Password must be at least 8 characters';
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

  // Google Auth
  const handleGoogleAuth = async () => {
    setError('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const userCred = await signInWithPopup(auth, provider);
      console.log('Google Sign-in successful:', userCred.user.uid);

      // Check if user exists in Firestore, if not, create one (for new Google signups)
      const userRef = doc(db, 'users', userCred.user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        console.log('New Google user, creating Firestore document.');
        await setDoc(userRef, {
          name: userCred.user.displayName || '',
          email: userCred.user.email || '', // Save email from Google Auth
          phoneVerified: false,
          createdAt: new Date().toISOString()
        }, { merge: true });
        console.log('Firestore document created for new Google user.');
        // Prompt user to verify phone after successful signup
        toast.success('Google signup successful! Please verify your phone number to book services.');
      } else {
        console.log('Existing Google user, logged in.');
        toast.success('Google login successful!');
      }

      setLoading(false);
      if (onSuccess) onSuccess(); // Call onSuccess after successful process

    } catch (err: any) {
      console.error('Google Auth failed:', err);
      setError(err.message);
      toast.error(`Google sign-in failed: ${err.message}`); // Show toast for error
      setLoading(false);
    }
  };

  // Phone Auth
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    console.log('Attempting to send OTP.');

    // Re-validate phone before sending OTP (other fields were validated on initial signup attempt)
    const phoneError = validatePhone(phone);
    if (phoneError) {
      setValidationErrors(prev => ({ ...prev, phone: phoneError }));
      setLoading(false);
      console.log('Phone validation failed for sending OTP.');
      return;
    }

    try {
      console.log('Entering try block to send OTP.');
      (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' });
      const appVerifier = (window as any).recaptchaVerifier;

      // Check if a confirmationResult already exists (e.g., resending OTP)
      if (!(window as any).confirmationResult) {
        await signInWithPhoneNumber(auth, phone, appVerifier)
          .then((confirmationResult: any) => {
            (window as any).confirmationResult = confirmationResult;
            setOtpSent(true);
            setLoading(false);
            toast.success('OTP sent successfully!');
            console.log('OTP sent.');
          });
      } else {
        // If confirmationResult already exists, assume we are resending
        // Firebase does not have a direct resend function, re-calling signInWithPhoneNumber handles resending
        await signInWithPhoneNumber(auth, phone, appVerifier) // This will resend the OTP
          .then((confirmationResult: any) => {
            (window as any).confirmationResult = confirmationResult;
            setOtpSent(true);
            setLoading(false);
            toast.success('OTP resent successfully!');
            console.log('OTP resent.');
          });
      }

    } catch (err: any) {
      console.error('Firebase error sending OTP:', err);
      setError(err.message);
      toast.error(`Failed to send OTP: ${err.message}`);
      setLoading(false);
      setOtpSent(false); // Reset otpSent on error
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    console.log('Attempting to verify OTP.');

    if (!otp) {
      setError('Please enter the OTP.');
      setLoading(false);
      return;
    }

    try {
      console.log('Entering try block to verify OTP.');
      const confirmationResult = await (window as any).confirmationResult;
      if (!confirmationResult) {
        setError('OTP confirmation object not found. Please try sending OTP again.');
        setLoading(false);
        return;
      }

      await confirmationResult.confirm(otp);
      console.log('OTP verified successfully.', auth.currentUser?.uid);

      // Save user data to Firestore after successful phone verification
      const user = auth.currentUser; // Get current user after verification
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        const userDataToUpdate: any = {
          phone: phone, // Save the phone number used for verification
          phoneVerified: true,
          updatedAt: new Date().toISOString()
        };

        // For manual signup, add other details if not already in Firestore (handleManualSignup creates the doc)
        if (mode === 'signup') {
          // These fields should already be in the doc from handleManualSignup, but ensure consistency
          if (username) userDataToUpdate.username = username;
          if (name) userDataToUpdate.name = name;
          if (email) userDataToUpdate.email = email;
        } else if (mode === 'login' && !user.phoneNumber) {
          // If user logged in via email/password and is verifying phone for first time
          userDataToUpdate.phone = phone; // Explicitly save phone if not present
        }
        // No need to add createdAt here, as it's set during initial signup (email/pass or google)

        await setDoc(userRef, userDataToUpdate, { merge: true });
        console.log('User data updated in Firestore after phone verification.');

        // Update displayName in Auth if name was provided in signup and not set
        if (name && !user.displayName) {
          await updateProfile(user, { displayName: name });
          console.log('Firebase Auth displayName updated.');
        }

      } else {
        console.error('No user found after OTP verification.');
        setError('User not found after verification. Please try logging in again.');
        toast.error('User not found after verification.');
        setLoading(false);
        return;
      }

      setLoading(false);
      console.log('Verification completed, setting loading to false.');

      toast.success('Phone number verified successfully!'); // Final success toast
      if (onSuccess) onSuccess();

    } catch (err: any) {
      console.error('Firebase error verifying OTP:', err);
      setError(err.message);
      toast.error(`OTP verification failed: ${err.message}`);
      setLoading(false);
    }
  };

  // Function to handle manual login (email/username and password)
  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    console.log('Attempting manual login.');

    const inputIdentifier = email; // This will be email or username
    const passwordError = validatePassword(password);
    // Only set password validation error initially, email/username error handled below
    const errors: ValidationErrors = { password: passwordError };

    if (passwordError) {
      setValidationErrors(errors);
      setLoading(false);
      return;
    }

    try {
      let userEmailToLogin = '';

      // Simple check to see if the input looks like an email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Correct regex for email format
      const isEmail = emailRegex.test(inputIdentifier);

      if (isEmail) {
        userEmailToLogin = inputIdentifier; // Use the input directly if it looks like an email
        console.log(`Input looks like an email, attempting login with ${userEmailToLogin}.`);
      } else {
        // If not an email, try to find user by username in Firestore
        let userDoc;

        const usernameQuery = query(collection(db, 'users'), where('username', '==', inputIdentifier));
        const usernameSnap = await getDocs(usernameQuery);
        if (!usernameSnap.empty) {
          userDoc = usernameSnap.docs[0];
          console.log(`Input matched username '${inputIdentifier}'.`);
        }

        if (userDoc) {
          const userData = userDoc.data();
          if (userData.email) {
            userEmailToLogin = userData.email; // Use email found via username
            console.log(`Found associated email '${userEmailToLogin}' in Firestore.`);
          } else {
            // Found user by username but no associated email in Firestore
            setError(`No email associated with username '${inputIdentifier}'. Please add an email to your profile.`);
            setLoading(false);
            return;
          }
        } else {
          // Input didn't match an email or username in Firestore
          setError('Invalid email/username or password.');
          setLoading(false);
          return;
        }
      }

      // Attempt to sign in with the determined email and password
      if (userEmailToLogin) {
        await signInWithEmailAndPassword(auth, userEmailToLogin, password);
        console.log('User logged in successfully.');
        toast.success('Login successful!');
        if (onSuccess) onSuccess();
      } else {
         // Should not be reached if logic is correct, but as a fallback
         setError('Unable to determine login email.');
         setLoading(false);
      }

    } catch (err: any) {
      console.error('Login failed:', err);
      setLoading(false); // Set loading to false immediately on error

      // Provide a more generic error for invalid credentials
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {

        // Try to find the user in Firestore to see if they exist and are phone verified
        let userDoc;
        const inputIdentifier = email; // Reuse the input identifier

        // First try finding by email in Firestore
        const emailQuery = query(collection(db, 'users'), where('email', '==', inputIdentifier));
        const emailSnap = await getDocs(emailQuery);
        if (!emailSnap.empty) {
           userDoc = emailSnap.docs[0];
        } else {
           // If not found by email, try finding by username in Firestore
           const usernameQuery = query(collection(db, 'users'), where('username', '==', inputIdentifier));
           const usernameSnap = await getDocs(usernameQuery);
           if (!usernameSnap.empty) {
              userDoc = usernameSnap.docs[0];
           }
        }

        if (userDoc) {
          const userData = userDoc.data();
          // If user exists in Firestore and is phone verified, suggest phone login
          if (userData.phoneVerified && userData.phone) {
            setError('Please log in using your phone number and OTP.');
            toast.error('Please log in using your phone number.');
            setTab('phone'); // Switch to phone login tab
            setPhoneNumberForLogin(userData.phone); // Pre-fill phone number if available
          } else {
            // User found in Firestore but not phone verified or no phone number
            setError('Invalid email/username or password.');
            toast.error('Invalid email/username or password.');
          }
        } else {
           // User not found in Firestore by email or username
           setError('Invalid email/username or password.');
           toast.error('Invalid email/username or password.');
        }

      } else if (err.code === 'auth/too-many-requests') {
         setError('Too many failed login attempts. Please try again later.');
         toast.error('Too many failed login attempts.');
      } else {
        setError(err.message);
        toast.error(`Login failed: ${err.message}`);
      }
    }
  };

  // Function to handle sending OTP for phone login
  const handleSendOtpLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    console.log('Attempting to send OTP for login.');

    const phoneError = validatePhone(phoneNumberForLogin);
    if (phoneError) {
      setValidationErrors(prev => ({ ...prev, phone: phoneError }));
      setLoading(false);
      console.log('Phone validation failed for login OTP.');
      return;
    }

    try {
      console.log('Entering try block to send OTP for login.');
      // Use a different recaptcha container for login if needed, or reuse if the form structure allows
      // For simplicity, reusing the 'recaptcha-container'. Ensure this div exists in your HTML.
      if (!(window as any).recaptchaVerifierLogin) {
         (window as any).recaptchaVerifierLogin = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' });
      }
      const appVerifier = (window as any).recaptchaVerifierLogin;

      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumberForLogin, appVerifier);
      setConfirmationResultForLogin(confirmationResult);
      setOtpSentForLogin(true);
      setLoading(false);
      toast.success('OTP sent successfully for login!');
      console.log('OTP sent for login.');

    } catch (err: any) {
      console.error('Firebase error sending OTP for login:', err);
      setError(err.message);
      toast.error(`Failed to send OTP for login: ${err.message}`);
      setLoading(false);
      setOtpSentForLogin(false); // Reset otpSent on error
    }
  };

  // Function to handle verifying OTP for phone login
  const handleVerifyOtpLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    console.log('Attempting to verify OTP for login.');

    if (!otpForLogin) {
      setError('Please enter the OTP.');
      setLoading(false);
      return;
    }

    if (!confirmationResultForLogin) {
      setError('OTP confirmation object not found. Please try sending OTP again.');
      setLoading(false);
      return;
    }

    try {
      console.log('Entering try block to verify OTP for login.');
      await confirmationResultForLogin.confirm(otpForLogin);
      console.log('OTP verified successfully for login.', auth.currentUser?.uid);

      // Save user data to Firestore after successful phone verification during login
      const user = auth.currentUser; // Get current user after verification
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        const userDataToUpdate: any = {
          phone: phoneNumberForLogin, // Save the phone number used for verification
          phoneVerified: true,
          updatedAt: new Date().toISOString()
        };
        console.log('Attempting to update Firestore with phoneVerified: true for user:', user.uid);
        try {
          await setDoc(userRef, userDataToUpdate, { merge: true });
          console.log('User data updated in Firestore after phone verification during login.');
        } catch (firestoreError) {
          console.error('Firestore update failed after phone verification:', firestoreError);
          toast.error('Failed to update profile data after verification.');
        }
      } else {
        console.error('No user found after OTP verification during login.');
        setError('User not found after verification. Please try logging in again.');
        toast.error('User not found after verification.');
        setLoading(false);
        return;
      }

      setLoading(false);
      toast.success('Login successful!');
      if (onSuccess) onSuccess();

    } catch (err: any) {
      console.error('Error during phone verification or Firestore update:', err);
      setError(err.message);
      // Provide a more specific error for invalid OTP or already-linked provider
      if (err.code === 'auth/invalid-verification-code') {
        setError('Invalid OTP. Please try again.');
        toast.error('Invalid OTP.');
      } else if (err.code === 'auth/provider-already-linked') {
        setError('This phone number is already linked to an account.');
        toast.error('This phone number is already linked.');
      } else {
        toast.error(`Verification failed: ${err.message}`);
      }
      setLoading(false); // Ensure loading is false in case of error
    }
  };

  // Function to handle manual signup (username, name, email, password, phone, OTP)
  const handleManualSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Manual Sign Up button clicked');
    setError('');
    setLoading(true);
    console.log('Loading state set to true');

    // Validate all fields
    const errors: ValidationErrors = {
      username: validateUsername(username),
      name: validateName(name),
      email: validateEmail(email),
      password: validatePassword(password),
      phone: validatePhone(phone)
    };

    setValidationErrors(errors);
    console.log('Validation errors:', errors);

    if (Object.values(errors).some(error => error !== '')) {
      setLoading(false);
      console.log('Validation errors found, setting loading to false and returning.');
      return;
    }

    // Check username uniqueness
    const unique = await checkUsernameUnique(username);
    if (!unique) {
      setLoading(false);
      console.log('Username not unique, setting loading to false and returning.');
      return;
    }

    // Check if email already exists
    const emailExists = await getDocs(query(collection(db, 'users'), where('email', '==', email)));
    if (!emailExists.empty) {
      setError('This email is already registered. Please log in instead.');
      toast.error('This email is already registered.'); // Toast for existing email
      setLoading(false);
      console.log('Email already exists, setting loading to false and returning.');
      return;
    }

    // Check if phone number already exists (Optional based on whether phone must be unique across all users)
    // If phone numbers don't need to be unique at signup but only for verification, you can remove this check
    const phoneExists = await getDocs(query(collection(db, 'users'), where('phone', '==', phone)));
    if (!phoneExists.empty) {
      setError('This phone number is already registered. Please log in instead.');
      toast.error('This phone number is already registered.'); // Toast for existing phone
      setLoading(false);
      console.log('Phone number already exists, setting loading to false and returning.');
      return;
    }

    // Create user with email and password
    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      console.log('User created with email/password:', userCred.user.uid);

      // Update Firebase Auth displayName
      if (name) {
        await updateProfile(userCred.user, { displayName: name });
        console.log('Firebase Auth displayName updated.');
      }

      // Save all user data to Firestore immediately after creating Firebase Auth user
      const userRef = doc(db, 'users', userCred.user.uid);
      await setDoc(userRef, {
        username: username,
        name: name,
        email: email,
        phone: phone, // Save phone number
        phoneVerified: false, // Mark as not verified initially
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }, { merge: true }); // Use merge: true in case a document was created earlier (less likely with this flow)
      console.log('User data saved to Firestore.');

      // Signup successful - do NOT automatically send OTP
      toast.success('Account created successfully! Please verify your phone number on the profile page.'); // Success toast
      setLoading(false);
      console.log('Signup complete, setting loading to false.');

      if (onSuccess) onSuccess(); // Call onSuccess to proceed (e.g., navigate)

    } catch (err: any) {
      console.error('Error during signup:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please log in instead.');
        toast.error('This email is already registered.');
      } else {
        setError(err.message);
        toast.error(`Signup failed: ${err.message}`);
      }
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-xs mx-auto">
      <div className="flex justify-center mb-4 gap-2">
        {!hideTabs && <button className={`px-3 py-1 rounded ${tab === 'google' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`} onClick={handleGoogleAuth}>Google</button>}
        {!hideTabs && (
          <button
            className={`px-3 py-1 rounded ${tab === 'manual' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
            onClick={() => {
              setTab('manual');
              setError(''); // Clear errors when switching tabs
              setValidationErrors({}); // Explicitly clear validation errors
              setOtpSent(false);
              setOtpSentForLogin(false); // Also clear phone login state
            }}
          >
            {mode === 'signup' ? 'Sign Up' : 'Login'}
          </button>
        )}
        {/* New Phone Login Tab */}
        {!hideTabs && mode === 'login' && (
          <button
            className={`px-3 py-1 rounded ${tab === 'phone' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
            onClick={() => {
              setTab('phone');
              setError('');
              setValidationErrors({});
              setOtpSent(false); // Clear signup phone state
              setOtpSentForLogin(false); // Clear manual phone login state
            }}
          >
            Phone
          </button>
        )}
      </div>

      {error && <div className="mb-4 text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2 text-sm">{error}</div>}

      {/* Manual Auth Form */}
      {(tab === 'manual' || hideTabs) && !isPhoneVerificationOnly && (
        <form onSubmit={mode === 'signup' ? handleManualSignup : handleManualLogin} className="space-y-6">

          {/* Signup form fields (excluding phone/OTP) */}
          {mode === 'signup' && !otpSent && (
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
                  className={`w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${validationErrors.username ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
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
                  className={`w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${validationErrors.name ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                  required
                />
                {validationErrors.name && <div className="text-red-600 text-sm mt-1">{validationErrors.name}</div>}
              </div>
              <div>
                <input
                  type="email"
                  placeholder="Email Address"
                  value={email}
                  onChange={e => {
                    setEmail(e.target.value);
                    setValidationErrors(prev => ({ ...prev, email: validateEmail(e.target.value) }));
                  }}
                  className={`w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${validationErrors.email ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                  required
                />
                {validationErrors.email && <div className="text-red-600 text-sm mt-1">{validationErrors.email}</div>}
              </div>
              <div>
                <input
                  type="tel"
                  placeholder="Phone Number (e.g., +12125551212)"
                  value={phone}
                  onChange={e => {
                    // No automatic formatting
                    setPhone(e.target.value);
                    setValidationErrors(prev => ({ ...prev, phone: validatePhone(e.target.value) }));
                  }}
                  className={`w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${validationErrors.phone ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                  required
                />
                {validationErrors.phone && <div className="text-red-600 text-sm mt-1">{validationErrors.phone}</div>}
              </div>
              <div className="relative">
                <input
                  type={showPasswordSignup ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value);
                    setValidationErrors(prev => ({ ...prev, password: validatePassword(e.target.value) }));
                  }}
                  className={`w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${validationErrors.password ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                  required
                />
                {/* Show password icon */}
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <button
                    type="button"
                    onClick={() => setShowPasswordSignup(!showPasswordSignup)}
                    className="focus:outline-none text-gray-500 hover:text-gray-600"
                    aria-label={showPasswordSignup ? 'Hide password' : 'Show password'}
                  >
                    {showPasswordSignup ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
              {validationErrors.password && <div className="text-red-600 text-sm mt-1">{validationErrors.password}</div>}
            </>
          )}

          {/* Submit button for manual signup */}
          {mode === 'signup' && !otpSent && (
            <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed" disabled={loading}>
              {loading ? 'Signing Up...' : 'Sign Up'}
            </button>
          )}

          {/* OTP input and Verify button (for signup after sending OTP OR phone verification only) */}
          {((mode === 'signup' && otpSent) || isPhoneVerificationOnly) && (
            <>
              {/* Conditionally render phone input for phone verification only before OTP is sent */}
              {isPhoneVerificationOnly && !otpSent && (
                <>
                  <div>
                    <input
                      type="tel"
                      placeholder="Phone Number (e.g., +12125551212)"
                      value={phone}
                      onChange={e => {
                        // No automatic formatting
                        setPhone(e.target.value);
                        setValidationErrors(prev => ({ ...prev, phone: validatePhone(e.target.value) }));
                      }}
                      className={`w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${validationErrors.phone ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                      required
                    />
                    {validationErrors.phone && <div className="text-red-600 text-sm mt-1">{validationErrors.phone}</div>}
                  </div>
                   <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed" disabled={loading || !phone}>
                    {loading ? 'Sending OTP...' : 'Send OTP'}
                  </button>
                </>
              )}

              {/* OTP input and Verify button when OTP is sent */}
              {otpSent && (
                 <>
                  <div>
                    <input
                      type="text"
                      placeholder="Enter OTP"
                      value={otp}
                      onChange={e => setOtp(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                   <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed" disabled={loading || !otp}>
                    {loading ? 'Verifying...' : 'Verify OTP'}
                  </button>
                 </>
              )}
            </>
          )}

          {/* Login form fields */}
          {mode === 'login' && tab === 'manual' && (
            <>
              <div>
                <input
                  type="text"
                  placeholder="Email or Username"
                  value={email}
                  onChange={e => {
                    setEmail(e.target.value);
                    // Remove real-time email validation for username/email input
                    setValidationErrors(prev => ({ ...prev, email: '', phone: '' })); // Clear previous validation errors
                  }}
                  className={`w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${validationErrors.email ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                  required
                />
                {validationErrors.email && <div className="text-red-600 text-sm mt-1">{validationErrors.email}</div>}
              </div>
              <div className="relative">
                <input
                  type={showPasswordLogin ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className={`w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${validationErrors.password ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                  required
                />
                {/* Show password icon */}
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <button
                    type="button"
                    onClick={() => setShowPasswordLogin(!showPasswordLogin)}
                    className="focus:outline-none text-gray-500 hover:text-gray-600"
                    aria-label={showPasswordLogin ? 'Hide password' : 'Show password'}
                  >
                    {showPasswordLogin ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
              {validationErrors.password && <div className="text-red-600 text-sm mt-1">{validationErrors.password}</div>}
              <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed" disabled={loading || (!email && !password)}>
                {loading ? 'Loading...' : 'Login'}
              </button>
            </>
          )}
        </form>
      )}

      {/* Phone Verification Only Form (for profile page) */}
      {isPhoneVerificationOnly && (
        <form onSubmit={otpSent ? handleVerifyOtp : handleSendOtp} className="space-y-6">
          {!otpSent ? (
            <>
              <div>
                <input
                  type="tel"
                  placeholder="Phone Number (e.g., +12125551212)"
                  value={phone}
                  onChange={e => {
                    // No automatic formatting
                    setPhone(e.target.value);
                    setValidationErrors(prev => ({ ...prev, phone: validatePhone(e.target.value) }));
                  }}
                  className={`w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${validationErrors.phone ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                  required
                />
                {validationErrors.phone && <div className="text-red-600 text-sm mt-1">{validationErrors.phone}</div>}
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 text-white rounded-md py-2 hover:bg-blue-700 transition duration-200"
                disabled={loading || !phone}
              >
                {loading ? 'Sending OTP...' : 'Send OTP'}
              </button>
            </>
          ) : (
            <>
              <div>
                <input
                  type="text"
                  placeholder="Enter OTP"
                  value={otp}
                  onChange={e => setOtp(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 text-white rounded-md py-2 hover:bg-blue-700 transition duration-200"
                disabled={loading || !otp}
              >
                {loading ? 'Verifying OTP...' : 'Verify OTP'}
              </button>
              {/* Optional: Resend OTP button - needs handleSendOtp logic */}
              {/* <button type="button" onClick={handleSendOtp} disabled={loading}>Resend OTP</button> */}
            </>
          )}
        </form>
      )}

      {/* Phone Auth Form (for login) */}
      {mode === 'login' && tab === 'phone' && (
        <form onSubmit={otpSentForLogin ? handleVerifyOtpLogin : handleSendOtpLogin} className="space-y-6">
          {!otpSentForLogin ? (
            <>
              <div>
                <input
                  type="tel"
                  placeholder="Phone Number (e.g., +12125551212)"
                  value={phoneNumberForLogin}
                  onChange={e => {
                    // No automatic formatting
                    setPhoneNumberForLogin(e.target.value);
                    setValidationErrors(prev => ({ ...prev, phone: validatePhone(e.target.value) }));
                  }}
                  className={`w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${validationErrors.phone ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                  required
                />
                {validationErrors.phone && <div className="text-red-600 text-sm mt-1">{validationErrors.phone}</div>}
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 text-white rounded-md py-2 hover:bg-blue-700 transition duration-200"
                disabled={loading}
              >
                {loading ? 'Sending OTP...' : 'Send OTP'}
              </button>
            </>
          ) : (
            <>
              <div>
                <input
                  type="text"
                  placeholder="Enter OTP"
                  value={otpForLogin}
                  onChange={e => setOtpForLogin(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 text-white rounded-md py-2 hover:bg-blue-700 transition duration-200"
                disabled={loading}
              >
                {loading ? 'Verifying OTP...' : 'Verify OTP'}
              </button>
              {/* Optional: Resend OTP button */}
              {/* <button type="button" onClick={handleSendOtpLogin} disabled={loading}>Resend OTP</button> */}
            </>
          )}
        </form>
      )}

      {/* Recaptcha container */}
      <div id="recaptcha-container"></div>
    </div>
  );
};

export default ModernAuthForm; 