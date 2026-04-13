import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { toast } from 'react-hot-toast';
import { Mail, Lock, Loader2, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import './Auth.css';

const Login = () => {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const { login } = useAuthStore();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      await login(data.email, data.password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card auth-card"
      >
        <div className="auth-header">
          <h2 className="auth-title">Welcome Back</h2>
          <p className="auth-subtitle">Enter your credentials to access your forge.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div className="input-wrapper">
              <Mail className="input-icon" size={18} />
              <input
                {...register('email', { 
                  required: 'Email is required',
                  pattern: { value: /^\S+@\S+$/i, message: 'Invalid email address' }
                })}
                className={`input-field icon-padding ${errors.email ? 'error' : ''}`}
                placeholder="name@example.com"
              />
            </div>
            {errors.email && <p className="error-message">{errors.email.message}</p>}
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={18} />
              <input
                type="password"
                {...register('password', { required: 'Password is required' })}
                className={`input-field icon-padding ${errors.password ? 'error' : ''}`}
                placeholder="••••••••"
              />
            </div>
            {errors.password && <p className="error-message">{errors.password.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary auth-submit"
          >
            {isLoading ? <Loader2 className="animate-spin" /> : (
              <>
                Sign In <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Don't have an account? {' '}
            <Link to="/register" className="auth-link">
              Create an account
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
