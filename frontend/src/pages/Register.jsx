import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { toast } from 'react-hot-toast';
import { Mail, Lock, User, Loader2, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import './Auth.css';

const Register = () => {
  const { register: registerField, handleSubmit, formState: { errors } } = useForm();
  const { register: registerUser } = useAuthStore();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      await registerUser(data.name, data.email, data.password);
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (error) {
      console.log("error", error)
      toast.error(error.response?.data?.message || 'Registration failed');
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
          <h2 className="auth-title">Join the Forge</h2>
          <p className="auth-subtitle">Start your journey with professional media tools.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <div className="input-wrapper">
              <User className="input-icon" size={18} />
              <input
                {...registerField('name', { required: 'Name is required' })}
                className={`input-field icon-padding ${errors.name ? 'error' : ''}`}
                placeholder="John Doe"
              />
            </div>
            {errors.name && <p className="error-message">{errors.name.message}</p>}
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div className="input-wrapper">
              <Mail className="input-icon" size={18} />
              <input
                {...registerField('email', { 
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
                {...registerField('password', { 
                  required: 'Password is required',
                  minLength: { value: 6, message: 'Minimum 6 characters' }
                })}
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
                Create Account <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account? {' '}
            <Link to="/login" className="auth-link">
              Sign In
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;
