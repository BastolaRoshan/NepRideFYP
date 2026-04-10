import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Car, Loader2, LogOut, Plus, UploadCloud, Users } from 'lucide-react';
import { apiFetch } from '../utils/apiFetch';
import { clearSessionAuth, getSessionToken, getStoredServiceAccessAllowed, getStoredVerificationStatus, setSessionAuth } from '../utils/sessionAuth';

const initialFormState = {
  title: '',
  overview: '',
  model: '',
  speed: '',
  seatCapacity: '',
  vehicleType: '',
  pricePerDay: '',
  fuelType: '',
  image: '',
  bluebookUrl: '',
};

const vehicleTypeOptions = ['Car', 'Bike', 'EV'];
const fuelTypeOptions = ['Petrol', 'Diesel', 'Electric'];

const palette = {
  bg: '#F3F4F6',
  card: '#FFFFFF',
  border: '#E5E7EB',
  accent: '#D4AF37',
  text: '#111827',
  textSecondary: '#6B7280',
  muted: '#9CA3AF',
  danger: '#EF4444',
};

const VehicleListingForm = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const editVehicle = location.state?.vehicle;
  const isEditMode = Boolean(location.state?.mode === 'edit' && editVehicle?._id);

  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [imagePreview, setImagePreview] = useState('');
  const [bluebookPreview, setBluebookPreview] = useState('');
  const [submitState, setSubmitState] = useState({
    loading: false,
    message: '',
    isError: false,
  });
  const [verificationStatus, setVerificationStatus] = useState(getStoredVerificationStatus());
  const [serviceAccessAllowed, setServiceAccessAllowed] = useState(getStoredServiceAccessAllowed());

  const serviceLockMessage = 'Services are locked until admin approval.';

  const normalizeVerificationStatus = (status) => {
    if (status === 'UnderReview') return 'Under Review';
    if (status === 'NotSubmitted') return 'Not Submitted';
    return status || 'Not Submitted';
  };

  useEffect(() => {
    if (!isEditMode) {
      return;
    }

    setFormData({
      title: editVehicle.title || editVehicle.name || '',
      overview: editVehicle.overview || '',
      model: editVehicle.model || '',
      speed: editVehicle.speed ?? '',
      seatCapacity: editVehicle.seatCapacity ?? editVehicle.seats ?? '',
      vehicleType: editVehicle.vehicleType || editVehicle.type || '',
      pricePerDay: editVehicle.pricePerDay ?? '',
      fuelType: editVehicle.fuelType || editVehicle.fuel || '',
      image: editVehicle.image || '',
      bluebookUrl: '',
    });
    setImagePreview(editVehicle.image || '');
    setBluebookPreview('');
    setErrors({});
    setSubmitState({ loading: false, message: '', isError: false });
  }, [editVehicle, isEditMode]);

  useEffect(() => {
    const fetchVerificationStatus = async () => {
      try {
        const response = await apiFetch('/api/user/verification-status', {
          method: 'GET',
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
          return;
        }

        const nextStatus = data?.verification?.verificationStatus || 'NotSubmitted';
        const nextAccessAllowed = Boolean(data?.verification?.isServiceAccessAllowed);
        setVerificationStatus(nextStatus);
        setServiceAccessAllowed(nextAccessAllowed);
        setSessionAuth({
          token: getSessionToken(),
          verificationStatus: nextStatus,
          isServiceAccessAllowed: nextAccessAllowed,
        });
      } catch {
        // keep fallback local state if API request fails
      }
    };

    fetchVerificationStatus();
  }, []);

  const inputStyle = {
    marginTop: '0.5rem',
    width: '100%',
    borderRadius: '8px',
    border: `1px solid ${palette.border}`,
    backgroundColor: palette.card,
    padding: '0.75rem 1rem',
    fontSize: '0.875rem',
    color: palette.text,
    outline: 'none',
    transition: 'border-color 0.3s, box-shadow 0.3s',
    boxSizing: 'border-box',
  };

  const inputErrorStyle = {
    ...inputStyle,
    border: `1px solid ${palette.danger}`,
  };

  const getInputStyle = (fieldName) =>
    errors[fieldName] ? inputErrorStyle : inputStyle;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrors((prev) => ({ ...prev, image: 'Please upload an image file.' }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, image: 'Image size should be 5MB or less.' }));
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Image = typeof reader.result === 'string' ? reader.result : '';
      setFormData((prev) => ({ ...prev, image: base64Image }));
      setImagePreview(base64Image);
      setErrors((prev) => ({ ...prev, image: '' }));
    };
    reader.readAsDataURL(file);
  };

  const handleBluebookChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, bluebookUrl: 'File size should be 10MB or less.' }));
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64File = typeof reader.result === 'string' ? reader.result : '';
      setFormData((prev) => ({ ...prev, bluebookUrl: base64File }));
      setBluebookPreview(file.name);
      setErrors((prev) => ({ ...prev, bluebookUrl: '' }));
    };
    reader.readAsDataURL(file);
  };

  const validateForm = () => {
    const nextErrors = {};
    if (!formData.title.trim()) nextErrors.title = 'Vehicle title is required.';
    if (!formData.overview.trim()) nextErrors.overview = 'Vehicle overview is required.';
    if (!formData.model.trim()) nextErrors.model = 'Model is required.';
    if (!formData.vehicleType) nextErrors.vehicleType = 'Please select a vehicle type.';
    if (!formData.fuelType) nextErrors.fuelType = 'Please select fuel type.';
    if (!formData.image) nextErrors.image = 'Please upload a vehicle image.';

    const seatCapacity = Number(formData.seatCapacity);
    if (!Number.isFinite(seatCapacity) || seatCapacity < 1)
      nextErrors.seatCapacity = 'Seat capacity must be at least 1.';

    if (formData.speed !== '') {
      const speed = Number(formData.speed);
      if (!Number.isFinite(speed) || speed < 1) {
        nextErrors.speed = 'Speed must be a positive number.';
      }
    }

    const pricePerDay = Number(formData.pricePerDay);
    if (!Number.isFinite(pricePerDay) || pricePerDay < 1)
      nextErrors.pricePerDay = 'Price per day must be at least 1.';

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitState({ loading: false, message: '', isError: false });

    if (!serviceAccessAllowed) {
      setSubmitState({ loading: false, message: serviceLockMessage, isError: true });
      return;
    }

    if (!validateForm()) {
      setSubmitState({ loading: false, message: 'Please correct the highlighted fields and try again.', isError: true });
      return;
    }

    setSubmitState({ loading: true, message: '', isError: false });

    try {
      const payload = {
        ...formData,
        seatCapacity: Number(formData.seatCapacity),
        pricePerDay: Number(formData.pricePerDay),
        ...(formData.speed !== '' ? { speed: Number(formData.speed) } : {}),
      };

      const endpoint = isEditMode ? `/api/vehicles/${editVehicle._id}` : '/api/vehicles';
      const method = isEditMode ? 'PUT' : 'POST';

      const response = await apiFetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || (isEditMode ? 'Failed to update vehicle.' : 'Failed to add vehicle.'));
      }

      if (!isEditMode) {
        setFormData(initialFormState);
        setImagePreview('');
        setErrors({});
      }
      setSubmitState({
        loading: false,
        message: isEditMode ? 'Vehicle updated successfully.' : 'Vehicle listed successfully.',
        isError: false,
      });

      setTimeout(() => { navigate('/vendor-dashboard', { state: { activeTab: 'vehicles' } }); }, 1100);
    } catch (error) {
      setSubmitState({
        loading: false,
        message: error.message || (isEditMode ? 'Unable to update vehicle listing.' : 'Unable to submit vehicle listing.'),
        isError: true,
      });
    }
  };

  const labelStyle = { fontSize: '0.875rem', fontWeight: '600', color: palette.textSecondary };
  const errorTextStyle = { marginTop: '0.25rem', fontSize: '0.75rem', color: palette.danger };

  const handleLogout = async () => {
    try {
      await globalThis.fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // no-op
    } finally {
      clearSessionAuth();
      navigate('/login', { replace: true });
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: palette.bg, color: palette.text }}>
      {/* Navbar */}
      <nav style={{ backgroundColor: palette.card, borderBottom: `1px solid ${palette.border}`, padding: '0.85rem 1.25rem' }}>
        <div
          style={{
            maxWidth: '1240px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
            <div
              style={{
                width: '2.5rem',
                height: '2.5rem',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #D4AF37 0%, #E9C96A 100%)',
                display: 'grid',
                placeItems: 'center',
                color: '#1A1A1A',
                flexShrink: 0,
              }}
            >
              <Car size={17} />
            </div>
            <h1 style={{ margin: 0, fontSize: '1.2rem', color: '#171717', fontWeight: 700, whiteSpace: 'nowrap' }}>
              NepRide Vendor
            </h1>
          </div>

          <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', flexWrap: 'nowrap', whiteSpace: 'nowrap' }}>
            {[
              { key: 'dashboard', label: 'Dashboard' },
              { key: 'vehicles', label: 'Vehicles' },
              { key: 'bookings', label: 'Bookings' },
              { key: 'add_vehicle', label: isEditMode ? 'Edit Vehicle' : 'Add Vehicle' },
            ].map((tab) => {
              const isActive = tab.key === 'add_vehicle';

              const onClick = () => {
                if (tab.key === 'dashboard') navigate('/vendor-dashboard', { state: { activeTab: 'overview' } });
                if (tab.key === 'vehicles') navigate('/vendor-dashboard', { state: { activeTab: 'vehicles' } });
                if (tab.key === 'bookings') navigate('/vendor-dashboard', { state: { activeTab: 'bookings' } });
              };

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={onClick}
                  style={{
                    border: 'none',
                    borderRadius: '999px',
                    minHeight: '40px',
                    padding: '0.62rem 1rem',
                    backgroundColor: isActive ? palette.accent : 'transparent',
                    color: isActive ? '#111111' : '#6B7280',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    letterSpacing: '0.01em',
                    cursor: isActive ? 'default' : 'pointer',
                    boxShadow: isActive ? 'inset 0 -2px 0 #b38b1d' : 'none',
                    transition: 'background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.38rem',
                  }}
                >
                  {tab.key === 'add_vehicle' ? <Plus size={13} /> : null}
                  {tab.label}
                </button>
              );
            })}
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.65rem', flexWrap: 'nowrap' }}>
            <button
              type="button"
              onClick={() => navigate('/verification')}
              style={{
                border: '1px solid #D8DEE8',
                backgroundColor: '#FFFFFF',
                color: '#2D3748',
                borderRadius: '999px',
                minHeight: '40px',
                padding: '0.45rem 0.75rem',
                fontSize: '0.8rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.38rem',
                cursor: 'pointer',
              }}
            >
              <Users size={13} /> Profile
            </button>
            <button
              type="button"
              onClick={handleLogout}
              style={{
                border: '1px solid #F3B0B0',
                backgroundColor: '#FFF7F7',
                color: '#B91C1C',
                borderRadius: '999px',
                minHeight: '40px',
                padding: '0.45rem 0.75rem',
                fontSize: '0.8rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.38rem',
                cursor: 'pointer',
              }}
            >
              <LogOut size={13} /> Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div style={{
          backgroundColor: palette.card, border: `1px solid ${palette.border}`,
          borderRadius: '14px', padding: '2rem', boxShadow: '0 2px 10px rgba(17, 24, 39, 0.04)',
        }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '700', color: palette.text, margin: '0 0 0.5rem' }}>
            {isEditMode ? 'Edit Vehicle Listing' : 'Vehicle Listing Form'}
          </h2>
          <p style={{ color: palette.textSecondary, fontSize: '0.9rem', marginBottom: '2rem' }}>
            {isEditMode
              ? 'Update your vehicle details and save the latest listing information.'
              : 'Add a new vehicle to NepRide with complete listing details.'}
          </p>

          {!serviceAccessAllowed && (
            <div style={{
              marginBottom: '1.5rem', padding: '0.85rem 1rem',
              borderRadius: '8px', border: '1px solid #F2D48A',
              backgroundColor: '#FFFAEB', color: '#8A6A00',
              fontSize: '0.9rem', fontWeight: '600',
            }}>
              {serviceLockMessage} Current status: {normalizeVerificationStatus(verificationStatus)}.
            </div>
          )}

          {/* Status Message */}
          {submitState.message && (
            <div style={{
              marginBottom: '1.5rem', padding: '0.75rem 1rem',
              borderRadius: '8px', fontSize: '0.875rem',
              border: submitState.isError ? '1px solid #ef444460' : '1px solid #16a34a60',
              backgroundColor: submitState.isError ? '#ef444415' : '#16a34a15',
              color: submitState.isError ? '#f87171' : '#4ade80',
            }}>
              {submitState.message}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
              {/* Left Column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Vehicle Title */}
                <div>
                  <label style={labelStyle} htmlFor="title">Vehicle Title</label>
                  <input
                    id="title" name="title" type="text"
                    value={formData.title} onChange={handleChange}
                    placeholder="Example: Hyundai Creta 2024"
                    style={getInputStyle('title')}
                    onFocus={e => { e.currentTarget.style.borderColor = palette.accent; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(212, 175, 55, 0.2)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = errors.title ? palette.danger : palette.border; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                  {errors.title && <p style={errorTextStyle}>{errors.title}</p>}
                </div>

                {/* Vehicle Overview */}
                <div>
                  <label style={labelStyle} htmlFor="overview">Vehicle Overview</label>
                  <textarea
                    id="overview" name="overview" rows={5}
                    value={formData.overview} onChange={handleChange}
                    placeholder="Briefly describe vehicle features, comfort, and condition."
                    style={{ ...getInputStyle('overview'), resize: 'none' }}
                    onFocus={e => { e.currentTarget.style.borderColor = palette.accent; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(212, 175, 55, 0.2)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = errors.overview ? palette.danger : palette.border; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                  {errors.overview && <p style={errorTextStyle}>{errors.overview}</p>}
                </div>

                {/* Model */}
                <div>
                  <label style={labelStyle} htmlFor="model">Model</label>
                  <input
                    id="model" name="model" type="text"
                    value={formData.model} onChange={handleChange}
                    placeholder="Example: SX (O)"
                    style={getInputStyle('model')}
                    onFocus={e => { e.currentTarget.style.borderColor = palette.accent; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(212, 175, 55, 0.2)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = errors.model ? palette.danger : palette.border; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                  {errors.model && <p style={errorTextStyle}>{errors.model}</p>}
                </div>

                {/* Seat Capacity */}
                <div>
                  <label style={labelStyle} htmlFor="seatCapacity">Seat Capacity</label>
                  <input
                    id="seatCapacity" name="seatCapacity" type="number" min="1"
                    value={formData.seatCapacity} onChange={handleChange}
                    placeholder="Enter seat capacity"
                    style={getInputStyle('seatCapacity')}
                    onFocus={e => { e.currentTarget.style.borderColor = palette.accent; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(212, 175, 55, 0.2)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = errors.seatCapacity ? palette.danger : palette.border; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                  {errors.seatCapacity && <p style={errorTextStyle}>{errors.seatCapacity}</p>}
                </div>

                {/* Top Speed */}
                <div>
                  <label style={labelStyle} htmlFor="speed">Top Speed (optional)</label>
                  <input
                    id="speed" name="speed" type="number" min="1"
                    value={formData.speed} onChange={handleChange}
                    placeholder="Enter top speed in kmph"
                    style={getInputStyle('speed')}
                    onFocus={e => { e.currentTarget.style.borderColor = palette.accent; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(212, 175, 55, 0.2)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = errors.speed ? palette.danger : palette.border; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                  {errors.speed && <p style={errorTextStyle}>{errors.speed}</p>}
                </div>

                {/* Image Upload */}
                <div>
                  <label style={labelStyle} htmlFor="vehicleImage">Upload Image</label>
                  <label
                    htmlFor="vehicleImage"
                    style={{
                      marginTop: '0.5rem', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', gap: '0.5rem', padding: '0.75rem 1rem',
                      borderRadius: '8px', border: errors.image ? `1px dashed ${palette.danger}` : '1px dashed #D8B95A',
                      backgroundColor: '#FFFBEB', color: '#8A6A00',
                      cursor: 'pointer', fontSize: '0.875rem', transition: 'all 0.3s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#FDE68A55'; e.currentTarget.style.borderColor = palette.accent; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#FFFBEB'; e.currentTarget.style.borderColor = errors.image ? palette.danger : '#D8B95A'; }}
                  >
                    <UploadCloud size={18} /> Choose Vehicle Image
                  </label>
                  <input id="vehicleImage" type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
                  {errors.image && <p style={errorTextStyle}>{errors.image}</p>}

                  {imagePreview && (
                    <div style={{ marginTop: '0.75rem', borderRadius: '8px', border: `1px solid ${palette.border}`, overflow: 'hidden' }}>
                      <img src={imagePreview} alt="Vehicle Preview" style={{ width: '100%', height: '11rem', objectFit: 'cover' }} />
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Vehicle Type */}
                <div>
                  <label style={labelStyle} htmlFor="vehicleType">Vehicle Type</label>
                  <select
                    id="vehicleType" name="vehicleType"
                    value={formData.vehicleType} onChange={handleChange}
                    style={{ ...getInputStyle('vehicleType'), cursor: 'pointer' }}
                    onFocus={e => { e.currentTarget.style.borderColor = palette.accent; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(212, 175, 55, 0.2)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = errors.vehicleType ? palette.danger : palette.border; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    <option value="">Select vehicle type</option>
                    {vehicleTypeOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                  {errors.vehicleType && <p style={errorTextStyle}>{errors.vehicleType}</p>}
                </div>

                {/* Price Per Day */}
                <div>
                  <label style={labelStyle} htmlFor="pricePerDay">Price per Day (NPR)</label>
                  <input
                    id="pricePerDay" name="pricePerDay" type="number" min="1"
                    value={formData.pricePerDay} onChange={handleChange}
                    placeholder="Enter daily rental price"
                    style={getInputStyle('pricePerDay')}
                    onFocus={e => { e.currentTarget.style.borderColor = palette.accent; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(212, 175, 55, 0.2)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = errors.pricePerDay ? palette.danger : palette.border; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                  {errors.pricePerDay && <p style={errorTextStyle}>{errors.pricePerDay}</p>}
                </div>

                {/* Fuel Type */}
                <div>
                  <label style={labelStyle} htmlFor="fuelType">Fuel Type</label>
                  <select
                    id="fuelType" name="fuelType"
                    value={formData.fuelType} onChange={handleChange}
                    style={{ ...getInputStyle('fuelType'), cursor: 'pointer' }}
                    onFocus={e => { e.currentTarget.style.borderColor = palette.accent; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(212, 175, 55, 0.2)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = errors.fuelType ? palette.danger : palette.border; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    <option value="">Select fuel type</option>
                    {fuelTypeOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                  {errors.fuelType && <p style={errorTextStyle}>{errors.fuelType}</p>}
                </div>

                {/* Listing Tips */}
                <div style={{
                  borderRadius: '8px', border: '1px solid #F2D48A',
                  backgroundColor: '#FFFAEB', padding: '1rem',
                  fontSize: '0.875rem', color: palette.textSecondary,
                }}>
                  <p style={{ fontWeight: '700', color: '#8A6A00', marginBottom: '0.5rem' }}>Listing Tips</p>
                  <p style={{ lineHeight: '1.6', margin: 0 }}>
                    Add a clear image and a concise overview for better conversion on your vendor listings.
                  </p>
                </div>
              </div>
            </div>

            {/* Bluebook */}
            <div style={{ marginTop: '2rem', padding: '1.5rem', backgroundColor: '#FFFBEB', borderRadius: '8px', border: '1px solid #F2D48A' }}>
              <label style={labelStyle} htmlFor="bluebookUpload">Bluebook</label>
              <label
                htmlFor="bluebookUpload"
                style={{
                  marginTop: '0.5rem', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: '0.5rem', padding: '0.75rem 1rem',
                  borderRadius: '8px', border: errors.bluebookUrl ? `1px dashed ${palette.danger}` : '1px dashed #D8B95A',
                  backgroundColor: '#FFFBEB', color: '#8A6A00',
                  cursor: 'pointer', fontSize: '0.875rem', transition: 'all 0.3s',
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#FDE68A55'; e.currentTarget.style.borderColor = palette.accent; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#FFFBEB'; e.currentTarget.style.borderColor = errors.bluebookUrl ? palette.danger : '#D8B95A'; }}
              >
                <UploadCloud size={18} /> Choose Bluebook Image
              </label>
              <input id="bluebookUpload" type="file" accept="image/*,.pdf" onChange={handleBluebookChange} style={{ display: 'none' }} />
              {errors.bluebookUrl && <p style={errorTextStyle}>{errors.bluebookUrl}</p>}
              <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: palette.textSecondary }}>Upload your vehicle bluebook </p>
              {bluebookPreview && (
                <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: '6px', backgroundColor: '#E7F5E8', color: '#1B4D2B', fontSize: '0.85rem' }}>
                  ✓ {bluebookPreview}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'center' }}>
              <button
                type="submit"
                disabled={submitState.loading || !serviceAccessAllowed}
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  gap: '0.5rem', minWidth: '220px', padding: '0.85rem 2.5rem',
                  backgroundColor: submitState.loading || !serviceAccessAllowed ? '#E5D2A0' : palette.accent,
                  color: palette.text, borderRadius: '8px', border: `1px solid ${palette.accent}`,
                  fontWeight: '700', fontSize: '1rem', cursor: submitState.loading || !serviceAccessAllowed ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s', opacity: submitState.loading || !serviceAccessAllowed ? 0.7 : 1,
                }}
                onMouseEnter={e => { if (!submitState.loading && serviceAccessAllowed) e.currentTarget.style.backgroundColor = '#C9A227'; }}
                onMouseLeave={e => { if (!submitState.loading && serviceAccessAllowed) e.currentTarget.style.backgroundColor = palette.accent; }}
              >
                {submitState.loading ? (
                  <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Submitting...</>
                ) : (
                  isEditMode ? 'Update Vehicle' : 'Submit Vehicle'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        select option { background-color: #ffffff; color: #111827; }
        input::placeholder, textarea::placeholder { color: #9CA3AF; }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { opacity: 0.5; }
      `}</style>
    </div>
  );
};

export default VehicleListingForm;
