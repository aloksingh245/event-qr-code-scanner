import { useState } from 'react';
import api from '../services/api';
import { Ticket, CheckCircle2, ShieldAlert, KeyRound, ArrowLeft, RefreshCw } from 'lucide-react';

const RegisterPage = () => {
  const [step, setStep] = useState('register'); // 'register' | 'verify' | 'completed'
  const [formData, setFormData] = useState({
    name: '',
    email: ''
  });
  
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [ticketQR, setTicketQR] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/registrations', formData);
      setSuccessMessage(response.data.message || 'Verification code sent to your email.');
      setStep('verify');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong during registration');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    if (otp.length !== 6 || isNaN(otp)) {
      setError('Please enter a valid 6-digit verification code.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/registrations/verify-otp', {
        email: formData.email,
        otp
      });

      setTicketQR(response.data.qrCode);
      setStep('completed');
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed. Please check the code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setResending(true);
    setError(null);
    try {
      const response = await api.post('/registrations', formData);
      setSuccessMessage(response.data.message || 'New verification code sent to your email.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend verification code');
    } finally {
      setResending(false);
    }
  };

  const handleGoBack = () => {
    setStep('register');
    setError(null);
    setOtp('');
  };

  const handleResetForm = () => {
    setFormData({
      name: '',
      email: ''
    });
    setOtp('');
    setTicketQR('');
    setStep('register');
    setError(null);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gray-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="mx-auto flex justify-center w-14 h-14 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-full items-center shadow-md">
          {step === 'verify' ? (
            <KeyRound className="w-7 h-7 text-white" />
          ) : step === 'completed' ? (
            <CheckCircle2 className="w-7 h-7 text-white" />
          ) : (
            <Ticket className="w-7 h-7 text-white" />
          )}
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 tracking-tight">
          {step === 'verify' ? 'Confirm Your Email' : step === 'completed' ? 'Registration Confirmed!' : 'Attendee Login'}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {step === 'verify' 
            ? 'We sent a verification code to check email ownership' 
            : step === 'completed'
            ? 'Your entry ticket is active and ready'
            : 'Register for the event and claim your digital ticket'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-gray-100 sm:px-10">
          
          {error && (
            <div className="mb-6 rounded-xl bg-red-50 p-4 border border-red-200 shadow-sm">
              <div className="flex">
                <div className="flex-shrink-0">
                  <ShieldAlert className="h-5 w-5 text-red-500" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-semibold text-red-800">Error Occurred</h3>
                  <p className="mt-1 text-xs text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 1: Registration Form */}
          {step === 'register' && (
            <div className="space-y-5">
              <div className="text-center pb-2 border-b border-gray-100">
                <p className="text-sm text-gray-600 font-medium">
                  Register for the event to claim your pass
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  No permanent website account is created. Your email will be used solely for ticket generation and login verification.
                </p>
              </div>
              <form className="space-y-5" onSubmit={handleRegisterSubmit}>
                <div>
                  <label htmlFor="name" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Full Name</label>
                  <div className="mt-1">
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      placeholder="Alok Singh"
                      value={formData.name}
                      onChange={handleChange}
                      className="appearance-none block w-full px-3 py-2.5 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Email Address</label>
                  <div className="mt-1">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      placeholder="alok@example.com"
                      value={formData.email}
                      onChange={handleChange}
                      className="appearance-none block w-full px-3 py-2.5 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all font-medium"
                    />
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                  >
                    {loading ? 'Processing...' : 'Register for Event'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* STEP 2: OTP Verification */}
          {step === 'verify' && (
            <div className="space-y-6">
              <div className="rounded-xl bg-blue-50 p-4 border border-blue-200">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <CheckCircle2 className="h-5 w-5 text-blue-500" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-semibold text-blue-800">Verification Code Sent</h3>
                    <p className="mt-1 text-xs text-blue-700">{successMessage}</p>
                    <p className="mt-1 text-xs font-semibold text-blue-900">Email: {formData.email}</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleVerifySubmit} className="space-y-5">
                <div>
                  <label htmlFor="otp" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">
                    Enter 6-Digit Code
                  </label>
                  <div className="mt-2 flex justify-center">
                    <input
                      id="otp"
                      name="otp"
                      type="text"
                      maxLength="6"
                      required
                      placeholder="000000"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      className="block w-40 text-center tracking-[0.5em] text-2xl font-bold px-3 py-2.5 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-semibold text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 transition-all transform hover:-translate-y-0.5"
                  >
                    {loading ? 'Verifying...' : 'Verify & Claim Ticket'}
                  </button>

                  <div className="flex items-center justify-between mt-2">
                    <button
                      type="button"
                      onClick={handleGoBack}
                      className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1.5 font-medium transition-colors"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Back to edit info
                    </button>

                    <button
                      type="button"
                      disabled={resending}
                      onClick={handleResendOTP}
                      className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1.5 font-semibold disabled:opacity-50 transition-colors"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
                      Resend Code
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* STEP 3: Completed Ticket Presentation */}
          {step === 'completed' && (
            <div className="space-y-6 text-center">
              <div className="rounded-xl bg-green-50 p-4 border border-green-200 shadow-sm text-left">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-semibold text-green-800">Email Verified Successfully</h3>
                    <p className="mt-1 text-xs text-green-700">
                      Your entry ticket has been activated and sent to: <strong>{formData.email}</strong>.
                    </p>
                  </div>
                </div>
              </div>

              {ticketQR && (
                <div className="flex flex-col items-center bg-gray-50 p-5 rounded-2xl border border-gray-100 shadow-inner">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Your Digital Ticket</span>
                  <img 
                    src={ticketQR} 
                    alt="Ticket QR Code" 
                    className="w-48 h-48 bg-white p-3 border border-gray-200 rounded-xl shadow-md transition-all hover:scale-105"
                  />
                  <div className="mt-4 text-sm font-semibold text-gray-800">{formData.name}</div>
                </div>
              )}

              <button
                type="button"
                onClick={handleResetForm}
                className="w-full flex justify-center py-2.5 px-4 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all shadow-sm"
              >
                Register Another Attendee
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
