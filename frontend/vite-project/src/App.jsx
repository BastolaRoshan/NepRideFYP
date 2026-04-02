
import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './components/Home';
import Login from './components/Login';
import SignUp from './components/SignUp';
import ProtectedRoute from './components/ProtectedRoute';
import VendorDashboard from './pages/VendorDashboard';
import CustomerDashboard from './pages/CustomerDashboard';
import VehicleListingForm from './pages/VehicleListingForm';
import AdminDashboard from './pages/AdminDashboard';
import PaymentPage from './pages/PaymentPage';
import BookingConfirmed from './pages/BookingConfirmed';
import VerificationPage from './pages/VerificationPage';
import './App.css';

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route
          path="/verification"
          element={
            <ProtectedRoute allowedRoles={['Customer', 'Vendor', 'Admin']} requireServiceAccess={false}>
              <VerificationPage />
            </ProtectedRoute>
          }
        />

        {/* Vendor Protected Routes */}
        <Route
          path="/vendor-dashboard"
          element={
            <ProtectedRoute allowedRoles={['Vendor', 'Admin']} requireServiceAccess={false}>
              <VendorDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin-dashboard"
          element={
            <ProtectedRoute allowedRoles={['Admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/vendor-dashboard/add-vehicle"
          element={
            <ProtectedRoute allowedRoles={['Vendor', 'Admin']} requireServiceAccess={false}>
              <VehicleListingForm />
            </ProtectedRoute>
          }
        />

        {/* Customer Protected Routes */}
        <Route
          path="/customer-dashboard"
          element={
            <ProtectedRoute allowedRoles={['Customer', 'Admin']} requireServiceAccess={false}>
              <CustomerDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/payment/:bookingId"
          element={
            <ProtectedRoute allowedRoles={['Customer', 'Admin']} requireServiceAccess={false}>
              <PaymentPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/booking-confirmed/:bookingId"
          element={
            <ProtectedRoute allowedRoles={['Customer', 'Admin']} requireServiceAccess={false}>
              <BookingConfirmed />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;
