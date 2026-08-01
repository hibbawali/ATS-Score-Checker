import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const { user, isAuthenticated, logout, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push('/auth/login');
      } else {
        setLoading(false);
      }
    }
  }, [isAuthenticated, authLoading, router]);

  const handleLogout = async () => {
    await logout();
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-[#f7f9fb] flex items-center justify-center">
        <div className="flex items-center gap-3">
          <svg className="w-6 h-6 animate-spin text-[#004ac6]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
          </svg>
          <span className="text-[#434655] font-medium">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f9fb]" style={{ fontFamily: 'Inter, sans-serif' }}>
      <Head>
        <title>Dashboard — ResumeScore</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>

      {/* Header */}
      <header className="bg-white border-b border-[#c3c6d7] px-4 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#004ac6] rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-[#191c1e] text-xl font-bold tracking-tight">ResumeScore</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-sm">
              <span className="text-[#737686]">Welcome, </span>
              <span className="text-[#191c1e] font-semibold">{user?.full_name}</span>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-[#004ac6] hover:text-[#0053db] transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#191c1e] mb-2">Dashboard</h1>
          <p className="text-[#434655]">Welcome back! Ready to optimize your resume?</p>
        </div>

        {/* User Info Card */}
        <div className="bg-white rounded-2xl border border-[#c3c6d7] shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold text-[#191c1e] mb-4">Your Account</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-[#737686] mb-1">Full Name</p>
              <p className="text-[#191c1e] font-medium">{user?.full_name}</p>
            </div>
            <div>
              <p className="text-sm text-[#737686] mb-1">Email</p>
              <p className="text-[#191c1e] font-medium">{user?.email}</p>
            </div>
            <div>
              <p className="text-sm text-[#737686] mb-1">Member Since</p>
              <p className="text-[#191c1e] font-medium">
                {user?.date_joined ? new Date(user.date_joined).toLocaleDateString() : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-[#737686] mb-1">Verification Status</p>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                user?.is_verified 
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {user?.is_verified ? 'Verified' : 'Pending Verification'}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link 
            href="/upload"
            className="bg-white rounded-2xl border border-[#c3c6d7] shadow-sm p-6 hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#004ac6]/10 rounded-lg flex items-center justify-center group-hover:bg-[#004ac6]/20 transition-colors">
                <svg className="w-6 h-6 text-[#004ac6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#191c1e] mb-1">Upload Resume</h3>
                <p className="text-sm text-[#737686]">Get your ATS score instantly</p>
              </div>
            </div>
          </Link>

          <div className="bg-white rounded-2xl border border-[#c3c6d7] shadow-sm p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#191c1e] mb-1">Resume History</h3>
                <p className="text-sm text-[#737686]">Coming soon</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#c3c6d7] shadow-sm p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#191c1e] mb-1">Settings</h3>
                <p className="text-sm text-[#737686]">Manage your account</p>
              </div>
            </div>
          </div>
        </div>

        {/* Phase 1 Complete Notice */}
        <div className="mt-8 bg-green-50 border border-green-200 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-green-800">Phase 1 Complete!</h3>
          </div>
          <p className="text-green-700 text-sm leading-relaxed">
            JWT Authentication, user registration, and protected routes are now working. 
            The existing ATS functionality has been preserved and can be accessed through the Upload Resume page.
          </p>
        </div>
      </div>
    </div>
  );
}