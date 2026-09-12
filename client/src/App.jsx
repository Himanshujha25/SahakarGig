import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import RoleRoute from './components/RoleRoute';

import Landing from './pages/Landing';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import CoopSignup from './pages/auth/CoopSignup';
import ForgotPassword from './pages/auth/ForgotPassword';

import HouseholdLayout from './layouts/HouseholdLayout';
import ProviderLayout from './layouts/ProviderLayout';
import AdminLayout from './layouts/AdminLayout';

import Home from './pages/Household/Home';
import Bookings from './pages/Household/Bookings';
import ProviderProfile from './pages/Household/ProviderProfile';
import BookingRequest from './pages/Household/BookingRequest';
import Tracking from './pages/Household/Tracking';
import Payment from './pages/Household/Payment';
import Invoice from './pages/Household/Invoice';
import HouseholdProfile from './pages/Household/Profile';
import FindServices from './pages/Household/FindServices';
import Dispatch from './pages/Household/Dispatch';
import SavedProviders from './pages/Household/SavedProviders';
import WalletPage from './pages/Household/Wallet';
import BulkOrder from './pages/Household/BulkOrder';

import JobQueue from './pages/Provider/JobQueue';
import JobDetail from './pages/Provider/JobDetail';
import DispatchFeed from './pages/Provider/DispatchFeed';
import ProviderEarnings from './pages/Provider/Earnings';
import ProviderWelfare from './pages/Provider/Welfare';
import ProviderOwnProfile from './pages/Provider/Profile';
import ProviderAnnouncements from './pages/Provider/Announcements';
import ProviderTraining from './pages/Provider/Training';

import Dashboard from './pages/Admin/Dashboard';
import Verifications from './pages/Admin/Verifications';
import Disputes from './pages/Admin/Disputes';
import Commission from './pages/Admin/Commission';
import Providers from './pages/Admin/Providers';
import WorkerDetail from './pages/Admin/WorkerDetail';
import AdminSettings from './pages/Admin/Settings';
import CooperativeFinancials from './pages/Admin/Financials';
import CooperativeNotices from './pages/Admin/Notices';
import CooperativeCompliance from './pages/Admin/Compliance';
import WelfareManagement from './pages/Admin/WelfareManagement';
import BulkRFPRequests from './pages/Admin/BulkRFPRequests';
import AdminCertifications from './pages/Admin/AdminCertifications';

import FederationLayout from './layouts/FederationLayout';
import FederationDashboard from './pages/Federation/Dashboard';
import FederationCooperatives from './pages/Federation/Cooperatives';
import FederationCooperativeDetail from './pages/Federation/CooperativeDetail';
import FederationEarnings from './pages/Federation/Earnings';
import FederationVerifications from './pages/Federation/Verifications';
import FederationDisputes from './pages/Federation/Disputes';
import FederationAnnouncements from './pages/Federation/Announcements';
import FederationAnalytics from './pages/Federation/Analytics';
import FederationSignup from './pages/auth/FederationSignup';
import FederationSettings from './pages/Federation/Settings';
import Architecture from './pages/Architecture';

import React, { useState, useEffect } from 'react';
import PwaInstallBanner from './components/PwaInstallBanner';
import AIChatbot from './components/AIChatbot';
import NotificationToasts from './components/NotificationToasts';
import LegalTrustModal from './components/LegalTrustModal';

function Redirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/landing" replace />;
  if (user.role === 'Household') return <Navigate to="/household" replace />;
  if (user.role === 'Provider') return <Navigate to="/provider" replace />;
  if (user.role === 'Cooperative Admin') return <Navigate to="/admin" replace />;
  if (user.role === 'Federation Admin') return <Navigate to="/federation" replace />;
  return <Navigate to="/landing" replace />;
}

export default function App() {
  const [legalModal, setLegalModal] = useState({ isOpen: false, tab: 'privacy' });

  useEffect(() => {
    const handleOpenLegal = (e) => {
      const tab = e.detail?.tab || 'privacy';
      setLegalModal({ isOpen: true, tab });
    };
    window.addEventListener('open-legal-modal', handleOpenLegal);
    return () => window.removeEventListener('open-legal-modal', handleOpenLegal);
  }, []);

  return (
    <>
      <PwaInstallBanner />
      <NotificationToasts />
      <AIChatbot />
      <LegalTrustModal 
        isOpen={legalModal.isOpen} 
        defaultTab={legalModal.tab} 
        onClose={() => setLegalModal((prev) => ({ ...prev, isOpen: false }))} 
      />
      <Routes>
        <Route path="/landing" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/coop-signup" element={<CoopSignup />} />
        <Route path="/federation-signup" element={<FederationSignup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/architecture" element={<Architecture />} />
        <Route path="/" element={<Landing />} />

        <Route element={<RoleRoute role="Household" />}>
          <Route path="/household" element={<HouseholdLayout />}>
            <Route index element={<Home />} />
            <Route path="find" element={<FindServices />} />
            <Route path="saved" element={<SavedProviders />} />
            <Route path="dispatch" element={<Dispatch />} />
            <Route path="dispatch/:id" element={<Dispatch />} />
            <Route path="bookings" element={<Bookings />} />
            <Route path="bulk" element={<BulkOrder />} />
            <Route path="rfp" element={<BulkOrder />} />
            <Route path="provider/:id" element={<ProviderProfile />} />
            <Route path="book/:providerId" element={<BookingRequest />} />
            <Route path="booking/:id" element={<Tracking />} />
            <Route path="pay/:bookingId" element={<Payment />} />
            <Route path="invoice/:bookingId" element={<Invoice />} />
            <Route path="wallet" element={<WalletPage />} />
            <Route path="profile" element={<HouseholdProfile />} />
          </Route>
        </Route>

        <Route element={<RoleRoute role="Provider" />}>
          <Route path="/provider" element={<ProviderLayout />}>
            <Route index element={<JobQueue />} />
            <Route path="dispatch" element={<DispatchFeed />} />
            <Route path="job/:id" element={<JobDetail />} />
            <Route path="jobs/:id" element={<JobDetail />} />
            <Route path="earnings" element={<ProviderEarnings />} />
            <Route path="payouts" element={<ProviderEarnings />} />
            <Route path="welfare" element={<ProviderWelfare />} />
            <Route path="training" element={<ProviderTraining />} />
            <Route path="academy" element={<ProviderTraining />} />
            <Route path="announcements" element={<ProviderAnnouncements />} />
            <Route path="profile" element={<ProviderOwnProfile />} />
            <Route path="settings" element={<ProviderOwnProfile />} />
          </Route>
        </Route>

        <Route element={<RoleRoute role="Cooperative Admin" />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="providers" element={<Providers />} />
            <Route path="providers/detail" element={<WorkerDetail />} />
            <Route path="verifications" element={<Verifications />} />
            <Route path="financials" element={<CooperativeFinancials />} />
            <Route path="notices" element={<CooperativeNotices />} />
            <Route path="welfare" element={<WelfareManagement />} />
            <Route path="compliance" element={<WelfareManagement />} />
            <Route path="disputes" element={<Disputes />} />
            <Route path="earnings" element={<CooperativeFinancials />} />
            <Route path="payouts" element={<CooperativeFinancials />} />
            <Route path="commission" element={<Commission />} />
            <Route path="rfp" element={<BulkRFPRequests />} />
            <Route path="certifications" element={<AdminCertifications />} />
            <Route path="training" element={<AdminCertifications />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
        </Route>

        <Route element={<RoleRoute role="Federation Admin" />}>
          <Route path="/federation" element={<FederationLayout />}>
            <Route index element={<FederationDashboard />} />
            <Route path="cooperatives" element={<FederationCooperatives />} />
            <Route path="cooperatives/:id" element={<FederationCooperativeDetail />} />
            <Route path="verifications" element={<FederationVerifications />} />
            <Route path="disputes" element={<FederationDisputes />} />
            <Route path="announcements" element={<FederationAnnouncements />} />
            <Route path="earnings" element={<FederationEarnings />} />
            <Route path="payouts" element={<FederationEarnings />} />
            <Route path="analytics" element={<FederationAnalytics />} />
            <Route path="settings" element={<FederationSettings />} />
          </Route>
        </Route>

        <Route path="*" element={<Redirect />} />
      </Routes>
    </>
  );
}
