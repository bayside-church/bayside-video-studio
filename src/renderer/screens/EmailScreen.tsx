import { useState } from 'react';
import { motion } from 'framer-motion';
import BigButton from '../components/BigButton';
import EmailInput from '../components/EmailInput';
import { useSessionStore } from '../store/useSessionStore';

export default function EmailScreen() {
  const { email, setEmail, setScreen } = useSessionStore();
  const [loading, setLoading] = useState(false);
  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleContinue = async () => {
    if (!isValid || loading) return;
    setLoading(true);

    try {
      const device = await window.baysideAPI.detectDevice();
      if (!device) {
        setScreen('unavailable');
        return;
      }
      await window.baysideAPI.startPreview();
      setScreen('preRecord');
    } catch (err) {
      console.error('Failed to start preview:', err);
      setScreen('unavailable');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full flex flex-col items-center justify-center gap-10 bg-gradient-to-b from-bayside-navy to-bayside-dark px-8"
    >
      <div className="text-center">
        <h2 className="text-5xl font-bold text-white mb-3">Enter Your Email</h2>
        <p className="text-xl text-white/50">We'll send you a link to your recording</p>
      </div>

      <EmailInput value={email} onChange={setEmail} onSubmit={handleContinue} />

      <BigButton onClick={handleContinue} disabled={!isValid || loading}>
        Continue
      </BigButton>
    </motion.div>
  );
}
