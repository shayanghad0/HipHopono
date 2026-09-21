import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../components/ui/toast.tsx';
import ModernSignIn from '../components/ui/modern-sign-in.tsx';
import { BackgroundPaths } from '../components/ui/background-paths.tsx';
import Footer from '../components/Footer.tsx';

export default function Login() {
  const { login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (username: string, password: string) => {
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      addToast('success', 'Login successful! Welcome back.');
      setTimeout(() => navigate('/project'), 500);
    } catch (err) {
      const message = (err as Error).message;
      setError(message);
      addToast('error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="relative flex flex-col min-h-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      <BackgroundPaths />
      <div className="absolute inset-0 flex items-center justify-center flex-1">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
        >
          <ModernSignIn onLogin={handleLogin} error={error} loading={loading} />
        </motion.div>
      </div>
      <Footer />
    </motion.div>
  );
}
