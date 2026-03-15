import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, UploadCloud } from 'lucide-react';

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
};

const vehicleTypeOptions = ['Car', 'Bike', 'SUV', 'Van', 'EV'];
const fuelTypeOptions = ['Petrol', 'Diesel', 'Electric', 'Hybrid', 'CNG'];

const VehicleListingForm = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const editVehicle = location.state?.vehicle;
  const isEditMode = Boolean(location.state?.mode === 'edit' && editVehicle?._id);

  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [imagePreview, setImagePreview] = useState('');
  const [submitState, setSubmitState] = useState({
    loading: false,
    message: '',
    isError: false,
  });

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
    });
    setImagePreview(editVehicle.image || '');
    setErrors({});
    setSubmitState({ loading: false, message: '', isError: false });
  }, [editVehicle, isEditMode]);

  const inputStyle = {
    marginTop: '0.5rem',
    width: '100%',
    borderRadius: '8px',
    border: '1px solid #333',
    backgroundColor: '#0f0f0f',
    padding: '0.75rem 1rem',
    fontSize: '0.875rem',
    color: '#fff',
    outline: 'none',
    transition: 'border-color 0.3s',
    boxSizing: 'border-box',
  };

  const inputErrorStyle = {
    ...inputStyle,
    border: '1px solid #ef4444',
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

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
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

      setTimeout(() => { navigate('/vendor-dashboard'); }, 1100);
    } catch (error) {
      setSubmitState({
        loading: false,
        message: error.message || (isEditMode ? 'Unable to update vehicle listing.' : 'Unable to submit vehicle listing.'),
        isError: true,
      });
    }
  };

  const labelStyle = { fontSize: '0.875rem', fontWeight: '500', color: '#a0a0a0' };
  const errorTextStyle = { marginTop: '0.25rem', fontSize: '0.75rem', color: '#ef4444' };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f0f0f', color: '#fff' }}>
      {/* Navbar */}
      <nav style={{ backgroundColor: '#000', borderBottom: '1px solid #333', padding: '1rem 1.5rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            type="button"
            onClick={() => navigate('/vendor-dashboard')}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '2.5rem', height: '2.5rem', borderRadius: '8px',
              border: '1px solid #d4af37', backgroundColor: 'transparent',
              color: '#d4af37', cursor: 'pointer', transition: 'all 0.3s',
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#d4af37'; e.currentTarget.style.color = '#000'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#d4af37'; }}
            aria-label="Go back"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#d4af37', margin: 0 }}>NepRide</h1>
          <span style={{ color: '#fff', fontSize: '1rem' }}>{isEditMode ? 'Edit Vehicle' : 'Add Vehicle'}</span>
        </div>
      </nav>

      {/* Main Content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div style={{
          backgroundColor: '#000', border: '1px solid #333',
          borderRadius: '12px', padding: '2rem',
        }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '700', color: '#fff', margin: '0 0 0.5rem' }}>
            {isEditMode ? 'Edit Vehicle Listing' : 'Vehicle Listing Form'}
          </h2>
          <p style={{ color: '#a0a0a0', fontSize: '0.9rem', marginBottom: '2rem' }}>
            {isEditMode
              ? 'Update your vehicle details and save the latest listing information.'
              : 'Add a new vehicle to NepRide with complete listing details.'}
          </p>

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
                    onFocus={e => { e.currentTarget.style.borderColor = '#d4af37'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = errors.title ? '#ef4444' : '#333'; }}
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
                    onFocus={e => { e.currentTarget.style.borderColor = '#d4af37'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = errors.overview ? '#ef4444' : '#333'; }}
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
                    onFocus={e => { e.currentTarget.style.borderColor = '#d4af37'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = errors.model ? '#ef4444' : '#333'; }}
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
                    onFocus={e => { e.currentTarget.style.borderColor = '#d4af37'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = errors.seatCapacity ? '#ef4444' : '#333'; }}
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
                    onFocus={e => { e.currentTarget.style.borderColor = '#d4af37'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = errors.speed ? '#ef4444' : '#333'; }}
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
                      borderRadius: '8px', border: errors.image ? '1px dashed #ef4444' : '1px dashed #d4af3780',
                      backgroundColor: '#0f0f0f', color: '#d4af37',
                      cursor: 'pointer', fontSize: '0.875rem', transition: 'all 0.3s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#d4af3715'; e.currentTarget.style.borderColor = '#d4af37'; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#0f0f0f'; e.currentTarget.style.borderColor = errors.image ? '#ef4444' : '#d4af3780'; }}
                  >
                    <UploadCloud size={18} /> Choose Vehicle Image
                  </label>
                  <input id="vehicleImage" type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
                  {errors.image && <p style={errorTextStyle}>{errors.image}</p>}

                  {imagePreview && (
                    <div style={{ marginTop: '0.75rem', borderRadius: '8px', border: '1px solid #333', overflow: 'hidden' }}>
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
                    onFocus={e => { e.currentTarget.style.borderColor = '#d4af37'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = errors.vehicleType ? '#ef4444' : '#333'; }}
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
                    onFocus={e => { e.currentTarget.style.borderColor = '#d4af37'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = errors.pricePerDay ? '#ef4444' : '#333'; }}
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
                    onFocus={e => { e.currentTarget.style.borderColor = '#d4af37'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = errors.fuelType ? '#ef4444' : '#333'; }}
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
                  borderRadius: '8px', border: '1px solid #d4af3740',
                  backgroundColor: '#d4af3710', padding: '1rem',
                  fontSize: '0.875rem', color: '#a0a0a0',
                }}>
                  <p style={{ fontWeight: '600', color: '#d4af37', marginBottom: '0.5rem' }}>Listing Tips</p>
                  <p style={{ lineHeight: '1.6', margin: 0 }}>
                    Add a clear image and a concise overview for better conversion on your vendor listings.
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'center' }}>
              <button
                type="submit"
                disabled={submitState.loading}
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  gap: '0.5rem', minWidth: '220px', padding: '0.85rem 2.5rem',
                  backgroundColor: submitState.loading ? '#a08830' : '#d4af37',
                  color: '#000', borderRadius: '8px', border: 'none',
                  fontWeight: '700', fontSize: '1rem', cursor: submitState.loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s', opacity: submitState.loading ? 0.7 : 1,
                }}
                onMouseEnter={e => { if (!submitState.loading) e.currentTarget.style.backgroundColor = '#c9a227'; }}
                onMouseLeave={e => { if (!submitState.loading) e.currentTarget.style.backgroundColor = '#d4af37'; }}
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
        select option { background-color: #1a1a1a; color: #fff; }
        input::placeholder, textarea::placeholder { color: #555; }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { opacity: 0.3; }
      `}</style>
    </div>
  );
};

export default VehicleListingForm;
