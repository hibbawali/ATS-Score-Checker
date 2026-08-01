import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);

  const router = useRouter();

  const handleChange = (e) => {
    setEmail(e.target.value);
    // Clear error when user types
    if (errors.email) {
      setErrors({});
    }
  };

  const validateEmail = () => {
    if (!email) {
      return 'Email is required';
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      return 'Please enter a valid email address';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const emailError = validateEmail();
    if (emailError) {
      setErrors({ email: emailError });
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      // TODO: Implement forgot password functionality in future phases
      // For now, just simulate sending email
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
      setIsEmailSent(true);
    } catch (error) {
      setErrors({ submit: 'An unexpected error occurred. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isEmailSent) {
    return (
      <div className="relative flex min-h-screen w-full flex-col bg-[#f7f9fb] overflow-x-hidden"
        style={{ fontFamily: 'Inter, sans-serif' }}>
        <Head>
          <title>Check Your Email — ResumeScore</title>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        </Head>

        <div className="layout-container flex h-full grow flex-col">
          <div className="px-4 md:px-10 lg:px-20 flex flex-1 justify-center py-5">
            <div className="flex flex-col w-full max-w-[400px]">

              {/* Header */}
              <header className="flex items-center justify-center mb-8 pt-8">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#004ac6] rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="text-[#191c1e] text-xl font-bold tracking-tight">ResumeScore</span>
                </div>
              </header>

              {/* Success Card */}
              <div className="bg-white rounded-2xl border border-[#c3c6d7] shadow-sm p-8 text-center">
                <div className="w-16 h-16 bg-[#e8f5e8] rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-[#2e7d32]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>

                <h1 className="text-2xl font-bold text-[#191c1e] mb-4">Check your email</h1>
                <p className="text-[#434655] text-sm mb-6 leading-relaxed">
                  We've sent password reset instructions to <br />
                  <span className="font-semibold text-[#191c1e]">{email}</span>
                </p>

                <div className="space-y-4">
                  <button
                    onClick={() => setIsEmailSent(false)}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#004ac6] text-white font-bold rounded-xl 
                      hover:bg-[#0053db] transition-all shadow-lg"
                  >
                    Try Different Email
                  </button>

                  <Link 
                    href="/auth/login"
                    className="w-full flex items-center justify-center px-6 py-3 border border-[#c3c6d7] text-[#191c1e] font-semibold rounded-xl 
                      hover:bg-gray-50 transition-all"
                  >
                    Back to Login
                  </Link>
                </div>

                <div className="mt-6 p-4 bg-[#f5f7fa] rounded-xl">
                  <p className="text-xs text-[#737686] leading-relaxed">
                    <span className="font-semibold text-[#434655]">Note:</span> Password reset functionality will be available in a future update. 
                    For now, please contact support if you need help accessing your account.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-[#f7f9fb] overflow-x-hidden"
      style={{ fontFamily: 'Inter, sans-serif' }}>
      <Head>
        <title>Reset Password — ResumeScore</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>

      <div className="layout-container flex h-full grow flex-col">
        <div className="px-4 md:px-10 lg:px-20 flex flex-1 justify-center py-5">
          <div className="flex flex-col w-full max-w-[400px]">

            {/* Header */}
            <header className="flex items-center justify-center mb-8 pt-8">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#004ac6] rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-[#191c1e] text-xl font-bold tracking-tight">ResumeScore</span>
              </div>
            </header>

            {/* Forgot Password Card */}
            <div className="bg-white rounded-2xl border border-[#c3c6d7] shadow-sm p-8">
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-[#191c1e] mb-2">Reset your password</h1>
                <p className="text-[#434655] text-sm">Enter your email address and we'll send you a link to reset your password</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-[#191c1e] mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={email}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 rounded-xl border ${
                      errors.email ? 'border-[#ba1a1a] bg-[#ffdad6]/20' : 'border-[#c3c6d7]'
                    } bg-white text-sm text-[#191c1e] placeholder-[#737686]
                      focus:outline-none focus:ring-2 focus:ring-[#004ac6] focus:border-transparent transition-all`}
                    placeholder="Enter your email address"
                    disabled={isSubmitting}
                  />
                  {errors.email && (
                    <p className="mt-2 text-xs text-[#ba1a1a] font-medium">{errors.email}</p>
                  )}
                </div>

                {/* Submit Error */}
                {errors.submit && (
                  <div className="rounded-xl bg-[#ffdad6] border border-[#ba1a1a]/20 px-4 py-3">
                    <p className="text-sm text-[#93000a] font-medium">{errors.submit}</p>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#004ac6] text-white font-bold rounded-xl 
                    hover:bg-[#0053db] transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                      </svg>
                      Sending reset link...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>
              </form>

              {/* Note about future implementation */}
              <div className="mt-6 p-4 bg-[#f5f7fa] rounded-xl">
                <p className="text-xs text-[#737686] leading-relaxed">
                  <span className="font-semibold text-[#434655]">Note:</span> Password reset functionality will be fully implemented in a future update. 
                  This is currently a UI preview.
                </p>
              </div>
            </div>

            {/* Back to Login Link */}
            <div className="text-center mt-6">
              <Link 
                href="/auth/login" 
                className="text-sm text-[#004ac6] hover:text-[#0053db] font-semibold transition-colors"
              >
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}