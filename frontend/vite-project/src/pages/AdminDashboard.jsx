import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Users, Car, CreditCard, FileText, RefreshCcw, Trash2, Save } from 'lucide-react';

const tabs = [
  { key: 'users', label: 'Users', icon: Users },
  { key: 'vehicles', label: 'Vehicle Listings', icon: Car },
  { key: 'payments', label: 'Payments', icon: CreditCard },
  { key: 'documents', label: 'User Documents', icon: FileText },
];

const userRoleOptions = ['Customer', 'Vendor', 'Admin'];
const paymentStatusOptions = ['Unpaid', 'Paid', 'Refunded'];
const documentStatusOptions = ['Pending', 'Approved', 'Rejected'];

const AdminDashboard = () => {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('users');
  const [summary, setSummary] = useState({
    usersCount: 0,
    vehiclesCount: 0,
    bookingsCount: 0,
    totalRevenue: 0,
    totalDocuments: 0,
  });

  const [users, setUsers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [payments, setPayments] = useState([]);
  const [documents, setDocuments] = useState([]);

  const [userDrafts, setUserDrafts] = useState({});
  const [paymentDrafts, setPaymentDrafts] = useState({});
  const [documentDrafts, setDocumentDrafts] = useState({});

  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState({ message: '', isError: false });
  const [refreshSeed, setRefreshSeed] = useState(0);

  const [newDocumentForm, setNewDocumentForm] = useState({
    userId: '',
    title: '',
    url: '',
    status: 'Pending',
    note: '',
  });

  const userSelectOptions = useMemo(() => {
    return users.map((user) => ({
      value: user._id,
      label: `${user.name} (${user.email})`,
    }));
  }, [users]);

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await response.json();

      if (data.success) {
        localStorage.removeItem('userRole');
        localStorage.removeItem('isAuthenticated');
        navigate('/login');
      }
    } catch {
      setActionMessage({ message: 'Logout failed. Please try again.', isError: true });
    }
  };

  const fetchSummary = useCallback(async () => {
    const response = await fetch('/api/admin/summary', {
      method: 'GET',
      credentials: 'include',
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to load admin summary');
    }

    setSummary(data.summary || {});
  }, []);

  const fetchUsers = useCallback(async () => {
    const response = await fetch('/api/admin/users', {
      method: 'GET',
      credentials: 'include',
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to load users');
    }

    const fetchedUsers = Array.isArray(data.users) ? data.users : [];
    setUsers(fetchedUsers);

    const draftMap = fetchedUsers.reduce((acc, user) => {
      acc[user._id] = {
        role: user.role || 'Customer',
        isVerified: Boolean(user.isVerified),
      };
      return acc;
    }, {});

    setUserDrafts(draftMap);

    setNewDocumentForm((prev) => {
      if (prev.userId || fetchedUsers.length === 0) {
        return prev;
      }

      return { ...prev, userId: fetchedUsers[0]._id };
    });
  }, []);

  const fetchVehicles = useCallback(async () => {
    const response = await fetch('/api/admin/vehicles', {
      method: 'GET',
      credentials: 'include',
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to load vehicles');
    }

    setVehicles(Array.isArray(data.vehicles) ? data.vehicles : []);
  }, []);

  const fetchPayments = useCallback(async () => {
    const response = await fetch('/api/admin/payments', {
      method: 'GET',
      credentials: 'include',
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to load payments');
    }

    const fetchedPayments = Array.isArray(data.payments) ? data.payments : [];
    setPayments(fetchedPayments);

    const draftMap = fetchedPayments.reduce((acc, payment) => {
      acc[payment._id] = {
        paymentStatus: payment.paymentStatus || 'Unpaid',
        paymentMethod: payment.paymentMethod || '',
      };
      return acc;
    }, {});

    setPaymentDrafts(draftMap);
  }, []);

  const fetchDocuments = useCallback(async () => {
    const response = await fetch('/api/admin/documents', {
      method: 'GET',
      credentials: 'include',
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to load documents');
    }

    const fetchedDocuments = Array.isArray(data.documents) ? data.documents : [];
    setDocuments(fetchedDocuments);

    const draftMap = fetchedDocuments.reduce((acc, document) => {
      acc[document._id] = {
        status: document.status || 'Pending',
        note: document.note || '',
      };
      return acc;
    }, {});

    setDocumentDrafts(draftMap);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setActionMessage({ message: '', isError: false });

        await fetchSummary();

        if (activeTab === 'users') {
          await fetchUsers();
        } else if (activeTab === 'vehicles') {
          await fetchVehicles();
        } else if (activeTab === 'payments') {
          await fetchPayments();
        } else if (activeTab === 'documents') {
          await fetchUsers();
          await fetchDocuments();
        }
      } catch (error) {
        setActionMessage({ message: error.message || 'Failed to load admin data', isError: true });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [activeTab, fetchDocuments, fetchPayments, fetchSummary, fetchUsers, fetchVehicles, refreshSeed]);

  const handleRefresh = () => {
    setRefreshSeed((prev) => prev + 1);
  };

  const updateUserDraft = (userId, field, value) => {
    setUserDrafts((prev) => ({
      ...prev,
      [userId]: {
        ...(prev[userId] || {}),
        [field]: value,
      },
    }));
  };

  const saveUser = async (userId) => {
    const draft = userDrafts[userId];
    if (!draft) return;

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          role: draft.role,
          isVerified: draft.isVerified,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to update user');
      }

      setUsers((prev) => prev.map((user) => (user._id === userId ? data.user : user)));
      setActionMessage({ message: 'User updated successfully.', isError: false });
      handleRefresh();
    } catch (error) {
      setActionMessage({ message: error.message || 'Failed to update user', isError: true });
    }
  };

  const deleteUser = async (userId) => {
    const shouldDelete = window.confirm('Delete this user and related records?');
    if (!shouldDelete) return;

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to delete user');
      }

      setUsers((prev) => prev.filter((user) => user._id !== userId));
      setActionMessage({ message: 'User deleted.', isError: false });
      handleRefresh();
    } catch (error) {
      setActionMessage({ message: error.message || 'Failed to delete user', isError: true });
    }
  };

  const deleteVehicle = async (vehicleId) => {
    const shouldDelete = window.confirm('Delete this vehicle listing and related bookings?');
    if (!shouldDelete) return;

    try {
      const response = await fetch(`/api/admin/vehicles/${vehicleId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to delete vehicle');
      }

      setVehicles((prev) => prev.filter((vehicle) => vehicle._id !== vehicleId));
      setActionMessage({ message: 'Vehicle listing deleted.', isError: false });
      handleRefresh();
    } catch (error) {
      setActionMessage({ message: error.message || 'Failed to delete vehicle', isError: true });
    }
  };

  const updatePaymentDraft = (paymentId, field, value) => {
    setPaymentDrafts((prev) => ({
      ...prev,
      [paymentId]: {
        ...(prev[paymentId] || {}),
        [field]: value,
      },
    }));
  };

  const savePayment = async (paymentId) => {
    const draft = paymentDrafts[paymentId];
    if (!draft) return;

    try {
      const response = await fetch(`/api/admin/payments/${paymentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          paymentStatus: draft.paymentStatus,
          paymentMethod: draft.paymentMethod,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to update payment');
      }

      setPayments((prev) =>
        prev.map((payment) =>
          payment._id === paymentId
            ? {
              ...payment,
              paymentStatus: draft.paymentStatus,
              paymentMethod: draft.paymentMethod,
            }
            : payment
        )
      );

      setActionMessage({ message: 'Payment updated.', isError: false });
      handleRefresh();
    } catch (error) {
      setActionMessage({ message: error.message || 'Failed to update payment', isError: true });
    }
  };

  const updateDocumentDraft = (documentId, field, value) => {
    setDocumentDrafts((prev) => ({
      ...prev,
      [documentId]: {
        ...(prev[documentId] || {}),
        [field]: value,
      },
    }));
  };

  const saveDocument = async (document) => {
    const draft = documentDrafts[document._id];
    if (!draft) return;

    try {
      const response = await fetch(`/api/admin/users/${document.user._id}/documents/${document._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          status: draft.status,
          note: draft.note,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to update document');
      }

      setDocuments((prev) =>
        prev.map((item) =>
          item._id === document._id
            ? {
              ...item,
              status: draft.status,
              note: draft.note,
            }
            : item
        )
      );

      setActionMessage({ message: 'Document updated.', isError: false });
      handleRefresh();
    } catch (error) {
      setActionMessage({ message: error.message || 'Failed to update document', isError: true });
    }
  };

  const addDocument = async (event) => {
    event.preventDefault();

    const normalizedTitle = newDocumentForm.title.trim();
    const normalizedUrl = newDocumentForm.url.trim();

    if (!newDocumentForm.userId || !normalizedTitle || !normalizedUrl) {
      setActionMessage({ message: 'User, title and URL are required for new document.', isError: true });
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${newDocumentForm.userId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: normalizedTitle,
          url: normalizedUrl,
          status: newDocumentForm.status,
          note: newDocumentForm.note,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to add document');
      }

      setActionMessage({ message: 'Document added.', isError: false });
      setNewDocumentForm((prev) => ({ ...prev, title: '', url: '', note: '' }));
      handleRefresh();
    } catch (error) {
      setActionMessage({ message: error.message || 'Failed to add document', isError: true });
    }
  };

  const cardStyle = {
    backgroundColor: '#000',
    border: '1px solid #333',
    borderRadius: '12px',
    padding: '1rem',
  };

  const inputStyle = {
    width: '100%',
    borderRadius: '8px',
    border: '1px solid #333',
    backgroundColor: '#0f0f0f',
    padding: '0.55rem 0.75rem',
    color: '#fff',
    fontSize: '0.85rem',
  };

  const actionButtonStyle = {
    borderRadius: '8px',
    border: '1px solid #d4af37',
    backgroundColor: 'transparent',
    color: '#d4af37',
    padding: '0.45rem 0.75rem',
    cursor: 'pointer',
    fontSize: '0.8rem',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.35rem',
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f0f0f', color: '#fff' }}>
      <nav style={{ backgroundColor: '#000', borderBottom: '1px solid #333', padding: '1rem 1.5rem' }}>
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h1 style={{ margin: 0, color: '#d4af37', fontSize: '1.5rem' }}>NepRide</h1>
            <span style={{ color: '#fff', fontSize: '1rem' }}>Admin Dashboard</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button onClick={handleRefresh} style={actionButtonStyle}>
              <RefreshCcw size={14} /> Refresh
            </button>
            <button onClick={handleLogout} style={actionButtonStyle}>
              <LogOut size={14} /> Logout
            </button>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={cardStyle}>
            <p style={{ margin: 0, color: '#a0a0a0', fontSize: '0.8rem' }}>Users</p>
            <h3 style={{ margin: '0.35rem 0 0', color: '#d4af37' }}>{summary.usersCount || 0}</h3>
          </div>
          <div style={cardStyle}>
            <p style={{ margin: 0, color: '#a0a0a0', fontSize: '0.8rem' }}>Vehicle Listings</p>
            <h3 style={{ margin: '0.35rem 0 0', color: '#d4af37' }}>{summary.vehiclesCount || 0}</h3>
          </div>
          <div style={cardStyle}>
            <p style={{ margin: 0, color: '#a0a0a0', fontSize: '0.8rem' }}>Bookings</p>
            <h3 style={{ margin: '0.35rem 0 0', color: '#d4af37' }}>{summary.bookingsCount || 0}</h3>
          </div>
          <div style={cardStyle}>
            <p style={{ margin: 0, color: '#a0a0a0', fontSize: '0.8rem' }}>Paid Revenue</p>
            <h3 style={{ margin: '0.35rem 0 0', color: '#d4af37' }}>Rs. {summary.totalRevenue || 0}</h3>
          </div>
          <div style={cardStyle}>
            <p style={{ margin: 0, color: '#a0a0a0', fontSize: '0.8rem' }}>Documents</p>
            <h3 style={{ margin: '0.35rem 0 0', color: '#d4af37' }}>{summary.totalDocuments || 0}</h3>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  borderRadius: '8px',
                  border: isActive ? '1px solid #d4af37' : '1px solid #333',
                  backgroundColor: isActive ? '#d4af37' : '#000',
                  color: isActive ? '#000' : '#d4af37',
                  padding: '0.6rem 0.9rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                }}
              >
                <Icon size={15} /> {tab.label}
              </button>
            );
          })}
        </div>

        {actionMessage.message && (
          <div
            style={{
              marginBottom: '1rem',
              padding: '0.7rem 0.9rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              border: actionMessage.isError ? '1px solid #ef444460' : '1px solid #16a34a60',
              backgroundColor: actionMessage.isError ? '#ef444415' : '#16a34a15',
              color: actionMessage.isError ? '#f87171' : '#4ade80',
            }}
          >
            {actionMessage.message}
          </div>
        )}

        {loading ? (
          <div style={{ ...cardStyle, textAlign: 'center', color: '#a0a0a0' }}>Loading {activeTab}...</div>
        ) : null}

        {!loading && activeTab === 'users' && (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {users.length === 0 ? (
              <div style={{ ...cardStyle, color: '#a0a0a0' }}>No users found.</div>
            ) : (
              users.map((user) => {
                const draft = userDrafts[user._id] || { role: user.role, isVerified: user.isVerified };
                return (
                  <div key={user._id} style={{ ...cardStyle, display: 'grid', gap: '0.65rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1rem' }}>{user.name}</h3>
                        <p style={{ margin: '0.2rem 0 0', color: '#a0a0a0', fontSize: '0.84rem' }}>{user.email}</p>
                        <p style={{ margin: '0.2rem 0 0', color: '#a0a0a0', fontSize: '0.84rem' }}>{user.phone}</p>
                      </div>
                      <div style={{ color: '#a0a0a0', fontSize: '0.82rem' }}>
                        <p style={{ margin: 0 }}>Docs: {user.documentsCount || 0}</p>
                        <p style={{ margin: '0.2rem 0 0' }}>Verified: {user.isVerified ? 'Yes' : 'No'}</p>
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                        gap: '0.75rem',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <label style={{ color: '#a0a0a0', fontSize: '0.75rem', display: 'block', marginBottom: '0.25rem' }}>
                          Role
                        </label>
                        <select
                          style={inputStyle}
                          value={draft.role}
                          onChange={(event) => updateUserDraft(user._id, 'role', event.target.value)}
                        >
                          {userRoleOptions.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={{ color: '#a0a0a0', fontSize: '0.75rem', display: 'block', marginBottom: '0.25rem' }}>
                          Verification
                        </label>
                        <select
                          style={inputStyle}
                          value={draft.isVerified ? 'true' : 'false'}
                          onChange={(event) => updateUserDraft(user._id, 'isVerified', event.target.value === 'true')}
                        >
                          <option value="true">Verified</option>
                          <option value="false">Not Verified</option>
                        </select>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', alignSelf: 'end' }}>
                        <button style={actionButtonStyle} onClick={() => saveUser(user._id)}>
                          <Save size={13} /> Save
                        </button>
                        <button
                          style={{ ...actionButtonStyle, border: '1px solid #ef4444', color: '#ef4444' }}
                          onClick={() => deleteUser(user._id)}
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {!loading && activeTab === 'vehicles' && (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {vehicles.length === 0 ? (
              <div style={{ ...cardStyle, color: '#a0a0a0' }}>No vehicle listings found.</div>
            ) : (
              vehicles.map((vehicle) => (
                <div
                  key={vehicle._id}
                  style={{
                    ...cardStyle,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1rem' }}>{vehicle.title || vehicle.name}</h3>
                    <p style={{ margin: '0.2rem 0 0', color: '#a0a0a0', fontSize: '0.84rem' }}>
                      {vehicle.vehicleType || vehicle.type} • {vehicle.fuelType || vehicle.fuel} • {vehicle.seatCapacity ?? vehicle.seats} seats
                    </p>
                    <p style={{ margin: '0.2rem 0 0', color: '#a0a0a0', fontSize: '0.84rem' }}>
                      Vendor: {vehicle.vendor?.name || vehicle.vendorName || 'Unknown'}
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <strong style={{ color: '#d4af37' }}>Rs. {vehicle.pricePerDay}</strong>
                    <button
                      style={{ ...actionButtonStyle, border: '1px solid #ef4444', color: '#ef4444' }}
                      onClick={() => deleteVehicle(vehicle._id)}
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {!loading && activeTab === 'payments' && (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {payments.length === 0 ? (
              <div style={{ ...cardStyle, color: '#a0a0a0' }}>No payments found.</div>
            ) : (
              payments.map((payment) => {
                const draft = paymentDrafts[payment._id] || {
                  paymentStatus: payment.paymentStatus,
                  paymentMethod: payment.paymentMethod || '',
                };

                return (
                  <div key={payment._id} style={{ ...cardStyle, display: 'grid', gap: '0.65rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1rem' }}>{payment.vehicle?.title || 'Vehicle'}</h3>
                        <p style={{ margin: '0.2rem 0 0', color: '#a0a0a0', fontSize: '0.84rem' }}>
                          Customer: {payment.customer?.name || 'Unknown'}
                        </p>
                        <p style={{ margin: '0.2rem 0 0', color: '#a0a0a0', fontSize: '0.84rem' }}>
                          Booking status: {payment.bookingStatus}
                        </p>
                      </div>
                      <strong style={{ color: '#d4af37' }}>Rs. {payment.amount}</strong>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                        gap: '0.75rem',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <label style={{ color: '#a0a0a0', fontSize: '0.75rem', display: 'block', marginBottom: '0.25rem' }}>
                          Payment Status
                        </label>
                        <select
                          style={inputStyle}
                          value={draft.paymentStatus}
                          onChange={(event) => updatePaymentDraft(payment._id, 'paymentStatus', event.target.value)}
                        >
                          {paymentStatusOptions.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={{ color: '#a0a0a0', fontSize: '0.75rem', display: 'block', marginBottom: '0.25rem' }}>
                          Payment Method
                        </label>
                        <input
                          style={inputStyle}
                          value={draft.paymentMethod}
                          onChange={(event) => updatePaymentDraft(payment._id, 'paymentMethod', event.target.value)}
                          placeholder="e.g. Cash, Card, eSewa"
                        />
                      </div>

                      <div style={{ alignSelf: 'end' }}>
                        <button style={actionButtonStyle} onClick={() => savePayment(payment._id)}>
                          <Save size={13} /> Save Payment
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {!loading && activeTab === 'documents' && (
          <div style={{ display: 'grid', gap: '0.9rem' }}>
            <form onSubmit={addDocument} style={{ ...cardStyle, display: 'grid', gap: '0.7rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem' }}>Add User Document</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.65rem' }}>
                <select
                  style={inputStyle}
                  value={newDocumentForm.userId}
                  onChange={(event) => setNewDocumentForm((prev) => ({ ...prev, userId: event.target.value }))}
                >
                  {userSelectOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>

                <input
                  style={inputStyle}
                  value={newDocumentForm.title}
                  onChange={(event) => setNewDocumentForm((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="Document title"
                />

                <input
                  style={inputStyle}
                  value={newDocumentForm.url}
                  onChange={(event) => setNewDocumentForm((prev) => ({ ...prev, url: event.target.value }))}
                  placeholder="Document URL"
                />

                <select
                  style={inputStyle}
                  value={newDocumentForm.status}
                  onChange={(event) => setNewDocumentForm((prev) => ({ ...prev, status: event.target.value }))}
                >
                  {documentStatusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>

                <input
                  style={inputStyle}
                  value={newDocumentForm.note}
                  onChange={(event) => setNewDocumentForm((prev) => ({ ...prev, note: event.target.value }))}
                  placeholder="Optional note"
                />

                <button type="submit" style={actionButtonStyle}>
                  <Save size={13} /> Add Document
                </button>
              </div>
            </form>

            {documents.length === 0 ? (
              <div style={{ ...cardStyle, color: '#a0a0a0' }}>No documents found.</div>
            ) : (
              documents.map((document) => {
                const draft = documentDrafts[document._id] || {
                  status: document.status,
                  note: document.note || '',
                };

                return (
                  <div key={document._id} style={{ ...cardStyle, display: 'grid', gap: '0.65rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1rem' }}>{document.title}</h3>
                        <p style={{ margin: '0.2rem 0 0', color: '#a0a0a0', fontSize: '0.84rem' }}>
                          User: {document.user?.name} ({document.user?.email})
                        </p>
                      </div>
                      <a
                        href={document.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: '#d4af37', fontSize: '0.85rem' }}
                      >
                        Open Document
                      </a>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                        gap: '0.75rem',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <label style={{ color: '#a0a0a0', fontSize: '0.75rem', display: 'block', marginBottom: '0.25rem' }}>
                          Status
                        </label>
                        <select
                          style={inputStyle}
                          value={draft.status}
                          onChange={(event) => updateDocumentDraft(document._id, 'status', event.target.value)}
                        >
                          {documentStatusOptions.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={{ color: '#a0a0a0', fontSize: '0.75rem', display: 'block', marginBottom: '0.25rem' }}>
                          Note
                        </label>
                        <input
                          style={inputStyle}
                          value={draft.note}
                          onChange={(event) => updateDocumentDraft(document._id, 'note', event.target.value)}
                          placeholder="Admin note"
                        />
                      </div>

                      <div style={{ alignSelf: 'end' }}>
                        <button style={actionButtonStyle} onClick={() => saveDocument(document)}>
                          <Save size={13} /> Save Document
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;