import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import LoginBg from '../assets/Untitled design.png';

const inputStyle = {
  padding: '14px 14px',
  borderRadius: '24px',
  border: 'none',
  outline: 'none',
  width: '100%',
  background: 'rgba(255,255,255,0.55)',
  color: '#000',
  textTransform: 'none',
  fontSize: '14px',
  letterSpacing: '0.6px',
  fontWeight: 700,
  fontFamily: '"Inter", system-ui, sans-serif',
  boxShadow: '0 0 0 1px rgba(0,0,0,0.1)'
};

const LoginPage = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [mode, setMode] = useState('login'); // login | register
  const [authError, setAuthError] = useState('');
  const navigate = useNavigate();

  const handleInvalid = (event) => {
    event.target.setCustomValidity('Please complete this field.');
  };

  const handleInputClear = (event) => {
    event.target.setCustomValidity('');
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        navigate('/profile', { replace: true });
      }
    });
    return () => unsub();
  }, [navigate]);

  const authErrorMessage = (err) => {
    if (!err?.code) return 'Authentication failed. Check email/password or create a new account.';
    const map = {
      'auth/email-already-in-use': 'There is already an account with this email. Try Login.',
      'auth/invalid-email': 'Invalid email.',
      'auth/invalid-credential': 'Invalid credentials.',
      'auth/too-many-requests': 'Too many attempts. Please wait and try again.',
      'auth/weak-password': 'Password must be at least 6 characters.',
      'auth/missing-password': 'Enter a password.',
      'auth/user-not-found': 'User not found. Create a new account.',
      'auth/wrong-password': 'Wrong password.'
    };
    return map[err.code] || 'Authentication failed. Check email/password or create a new account.';
  };

  const resolveEmailForIdentifier = async (value) => {
    const trimmed = value.trim();
    if (trimmed.includes('@')) return trimmed;
    const res = await getDocs(query(collection(db, 'users'), where('username', '==', trimmed)));
    if (res.empty) {
      throw { code: 'auth/user-not-found' };
    }
    const docData = res.docs[0].data();
    if (!docData.email) {
      throw { code: 'auth/invalid-credential' };
    }
    return docData.email;
  };

  const handleEmailAuth = async (event) => {
    event.preventDefault();
    setAuthError('');
    try {
      if (mode === 'register') {
        if (!regUsername.trim()) {
          setAuthError('Please enter a username.');
          return;
        }
        const username = regUsername.trim();
        const usernameExists = await getDocs(query(collection(db, 'users'), where('username', '==', username)));
        if (!usernameExists.empty) {
          setAuthError('Username is already taken. Choose another.');
          return;
        }
        const userCredential = await createUserWithEmailAndPassword(auth, regEmail, regPassword);
        if (userCredential.user) {
          await setDoc(doc(db, 'users', userCredential.user.uid), {
            username,
            email: regEmail,
            avatarUrl: '',
            createdAt: serverTimestamp(),
            favorites: [],
            postedAttractionsCount: 0
          });
          await updateProfile(userCredential.user, { displayName: username });
        }
      } else {
        const emailForLogin = await resolveEmailForIdentifier(identifier);
        await signInWithEmailAndPassword(auth, emailForLogin, password);
      }
      setIdentifier('');
      setPassword('');
      setRegUsername('');
      setRegEmail('');
      setRegPassword('');
    } catch (err) {
      console.error('Login failed:', err);
      setAuthError(authErrorMessage(err));
    }
  };

  return (
    <div
      style={{
        height: '100%',
        width: '100%',
        minHeight: '100vh',
        background: '#F8F1DC',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        backgroundImage: `url(${LoginBg})`,
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center'
      }}
    >
      <div style={{ position: 'absolute', top: '18px', left: '50%', transform: 'translateX(-50%)', fontFamily: '"Gladolia", "Inter", system-ui, sans-serif', fontSize: '36px', color: '#586c6c' }}>
        StreetArtView
      </div>

      <div
        style={{
          position: 'absolute',
          left: '32vw',
          top: '70vh',
          transform: 'translateY(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: '8px',
          fontFamily: '"BestSwashed", "Inter", system-ui, sans-serif',
          color: '#5f4135',
          fontSize: '34px',
          letterSpacing: '0.6px',
          lineHeight: 1.08,
          pointerEvents: 'none'
        }}
      >
        <span>Find,</span>
        <span>Photograph,</span>
        <span>Share Urban Art.</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 16px', maxWidth: '420px', width: '100%', marginTop: '-200px', marginLeft: '500px' }}>
        <form
          onSubmit={handleEmailAuth}
          style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', width: '360px' }}
        >
          <div style={{ width: '100%', textAlign: 'center', marginBottom: '4px' }}>
            <h2 style={{ margin: 0, fontFamily: '"Gladolia", "Inter", system-ui, sans-serif', color: '#9c3a32', fontSize: '32px', letterSpacing: '0.6px' }}>
              Welcome back!
            </h2>
          </div>
          {mode === 'login' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="USERNAME OR EMAIL"
                onInvalid={handleInvalid}
                onInput={handleInputClear}
                style={inputStyle}
              />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="PASSWORD"
                onInvalid={handleInvalid}
                onInput={handleInputClear}
                style={inputStyle}
              />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
              <input
                type="text"
                required
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                placeholder="USERNAME"
                onInvalid={handleInvalid}
                onInput={handleInputClear}
                style={inputStyle}
              />
              <input
                type="email"
                required
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="EMAIL"
                onInvalid={handleInvalid}
                onInput={handleInputClear}
                style={inputStyle}
              />
              <input
                type="password"
                required
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="PASSWORD"
                onInvalid={handleInvalid}
                onInput={handleInputClear}
                style={inputStyle}
              />
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'row', gap: '12px', width: '100%', justifyContent: 'center', alignItems: 'center', paddingLeft: '22px' }}>
            <button
              type="submit"
              style={{ padding: '10px 14px', borderRadius: '999px', border: 'none', background: '#9C3A32', color: '#fff', cursor: 'pointer', minWidth: '140px' }}
            >
              {mode === 'register' ? 'Create account' : 'Login'}
            </button>
            <button
              type="button"
              onClick={() => setMode(mode === 'register' ? 'login' : 'register')}
              style={{ padding: '10px 12px', borderRadius: '999px', border: '1px solid #ddd', background: '#fff', cursor: 'pointer', minWidth: '180px' }}
            >
              {mode === 'register' ? 'Have an account? Login' : 'No account? Sign up'}
            </button>
          </div>
          {authError && (
            <div style={{ marginTop: '6px', color: '#b00020', fontSize: '13px', textAlign: 'center' }}>
              {authError}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
