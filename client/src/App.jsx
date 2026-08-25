import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import RoleRoute from './components/RoleRoute';

import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import CoopSignup from './pages/auth/CoopSignup';

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

import JobQueue from './pages/Provider/JobQueue';
import JobDetail from './pages/Provider/JobDetail';
import ProviderEarnings from './pages/Provider/Earnings';
import ProviderWelfare from './pages/Provider/Welfare';
import ProviderOwnProfile from './pages/Provider/Profile';

import Dashboard from './pages/Admin/Dashboard';
import Verifications from './pages/Admin/Verifications';
import Disputes from './pages/Admin/Disputes';
import Commission from './pages/Admin/Commission';
import Providers from './pages/Admin/Providers';

function Redirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'Household') return <Navigate to="/household" replace />;
  if (user.role === 'Provider') return <Navigate to="/provider" replace />;
  if (user.role === 'Cooperative Admin') return <Navigate to="/admin" replace />;
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/coop-signup" element={<CoopSignup />} />
      <Route path="/" element={<Redirect />} />

      <Route element={<RoleRoute role="Household" />}>
        <Route path="/household" element={<HouseholdLayout />}>
          <Route index element={<Home />} />
          <Route path="bookings" element={<Bookings />} />
          <Route path="provider/:id" element={<ProviderProfile />} />
          <Route path="book/:providerId" element={<BookingRequest />} />
          <Route path="booking/:id" element={<Tracking />} />
          <Route path="pay/:bookingId" element={<Payment />} />
          <Route path="invoice/:bookingId" element={<Invoice />} />
          <Route path="profile" element={<HouseholdProfile />} />
        </Route>
      </Route>

      <Route element={<RoleRoute role="Provider" />}>
        <Route path="/provider" element={<ProviderLayout />}>
          <Route index element={<JobQueue />} />
          <Route path="job/:id" element={<JobDetail />} />
          <Route path="earnings" element={<ProviderEarnings />} />
          <Route path="welfare" element={<ProviderWelfare />} />
          <Route path="profile" element={<ProviderOwnProfile />} />
        </Route>
      </Route>

      <Route element={<RoleRoute role="Cooperative Admin" />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="verifications" element={<Verifications />} />
          <Route path="disputes" element={<Disputes />} />
          <Route path="commission" element={<Commission />} />
          <Route path="providers" element={<Providers />} />
        </Route>
      </Route>

      <Route path="*" element={<Redirect />} />
    </Routes>
  );
}
