import { useState, useMemo } from 'react';
import { Eye } from 'lucide-react';

const palette = {
  bg: '#F8FAFC',
  card: '#FFFFFF',
  border: '#E5E7EB',
  accent: '#D4AF37',
  text: '#111827',
  textSecondary: '#6B7280',
  approved: '#22C55E',
  underReview: '#F59E0B',
  rejected: '#EF4444',
  notSubmitted: '#9CA3AF',
};

const UsersList = ({ users, onViewDocuments }) => {
  const [filter, setFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  const filters = [
    { key: 'All', label: 'All Users' },
    { key: 'Customer', label: 'Customers' },
    { key: 'Vendor', label: 'Vendors' },
    { key: 'Verified', label: 'Verified' },
    { key: 'UnderReview', label: 'Under Review' },
    { key: 'Rejected', label: 'Rejected' },
    { key: 'NotSubmitted', label: 'Not Submitted' },
  ];

  const filteredUsers = useMemo(() => {
    let result = users;

    // Apply role/verification filter
    if (filter === 'Customer') {
      result = result.filter((u) => u.role === 'Customer');
    } else if (filter === 'Vendor') {
      result = result.filter((u) => u.role === 'Vendor');
    } else if (filter === 'Verified') {
      result = result.filter((u) => u.verificationStatus === 'Approved');
    } else if (filter === 'UnderReview') {
      result = result.filter((u) => u.verificationStatus === 'UnderReview');
    } else if (filter === 'Rejected') {
      result = result.filter((u) => u.verificationStatus === 'Rejected');
    } else if (filter === 'NotSubmitted') {
      result = result.filter((u) => u.verificationStatus === 'NotSubmitted');
    }

    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (u) =>
          u.name.toLowerCase().includes(term) ||
          u.email.toLowerCase().includes(term) ||
          u.phone.includes(term)
      );
    }

    return result;
  }, [users, filter, searchTerm]);

  const getVerificationStatusColor = (status) => {
    switch (status) {
      case 'Approved':
        return { bg: '#22C55E1A', text: palette.approved, border: '#22C55E66' };
      case 'UnderReview':
        return { bg: '#F59E0B1A', text: palette.underReview, border: '#F59E0B66' };
      case 'Rejected':
        return { bg: '#EF44441A', text: palette.rejected, border: '#EF444466' };
      case 'NotSubmitted':
        return { bg: '#9CA3AF1A', text: palette.notSubmitted, border: '#9CA3AF66' };
      default:
        return { bg: '#9CA3AF1A', text: palette.notSubmitted, border: '#9CA3AF66' };
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'Customer':
        return { bg: '#EEF2FF', text: '#4338CA', border: '#C7D2FE' };
      case 'Vendor':
        return { bg: '#FFF7ED', text: '#C2410C', border: '#FED7AA' };
      case 'Admin':
        return { bg: '#FFF8E1', text: '#A16207', border: '#FDE68A' };
      default:
        return { bg: '#EEF2FF', text: '#4338CA', border: '#C7D2FE' };
    }
  };

  const getAccessStatusColor = (allowed) => {
    return allowed
      ? { bg: '#22C55E1A', text: palette.approved, border: '#22C55E66' }
      : { bg: '#EF44441A', text: palette.rejected, border: '#EF444466' };
  };

  const cardStyle = {
    backgroundColor: palette.card,
    border: `1px solid ${palette.border}`,
    borderRadius: '12px',
    padding: '1rem',
  };

  const inputStyle = {
    width: '100%',
    borderRadius: '8px',
    border: `1px solid ${palette.border}`,
    backgroundColor: palette.card,
    padding: '0.55rem 0.75rem',
    color: palette.text,
    fontSize: '0.85rem',
  };

  const badgeStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '0.25rem 0.5rem',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: 500,
    border: '1px solid',
    marginRight: '0.35rem',
    marginBottom: '0.35rem',
  };

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      {/* Filters Section */}
      <div style={{ ...cardStyle, display: 'grid', gap: '0.75rem' }}>
        <div>
          <label style={{ color: palette.textSecondary, fontSize: '0.8rem', display: 'block', marginBottom: '0.35rem' }}>
            Filter Users
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                style={{
                  borderRadius: '6px',
                  border: filter === f.key ? `1px solid ${palette.accent}` : `1px solid ${palette.border}`,
                  backgroundColor: filter === f.key ? '#FFF8E1' : palette.card,
                  color: filter === f.key ? '#A16207' : palette.textSecondary,
                  padding: '0.4rem 0.65rem',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  transition: 'all 0.2s',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={{ color: palette.textSecondary, fontSize: '0.8rem', display: 'block', marginBottom: '0.35rem' }}>
            Search by Name, Email, or Phone
          </label>
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={inputStyle}
          />
        </div>
      </div>

      {/* Results Count */}
      <div style={{ color: palette.textSecondary, fontSize: '0.85rem' }}>
        Showing {filteredUsers.length} of {users.length} users
      </div>

      {/* Users Table */}
      {filteredUsers.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: 'center', color: palette.textSecondary, padding: '2rem' }}>
          No users found matching the selected filters.
        </div>
      ) : (
        <div
          style={{
            overflowX: 'auto',
            borderRadius: '12px',
            border: `1px solid ${palette.border}`,
            backgroundColor: palette.card,
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.85rem',
            }}
          >
            <thead>
              <tr style={{ borderBottom: `1px solid ${palette.border}`, backgroundColor: palette.bg }}>
                <th style={{ padding: '0.75rem', textAlign: 'left', color: palette.text, fontWeight: 600 }}>
                  Name
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'left', color: palette.text, fontWeight: 600 }}>
                  Email
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'left', color: palette.text, fontWeight: 600 }}>
                  Role
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'left', color: palette.text, fontWeight: 600 }}>
                  Verification
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'left', color: palette.text, fontWeight: 600 }}>
                  Access
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'center', color: palette.text, fontWeight: 600 }}>
                  Docs
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'center', color: palette.text, fontWeight: 600 }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => {
                const roleColor = getRoleColor(user.role);
                const verificationColor = getVerificationStatusColor(user.verificationStatus);
                const accessColor = getAccessStatusColor(user.isServiceAccessAllowed);
                const documentCount = Array.isArray(user.documents) ? user.documents.length : 0;

                return (
                  <tr
                    key={user._id}
                    style={{
                      borderBottom: `1px solid ${palette.border}`,
                      backgroundColor: palette.card,
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                  >
                    {/* Name */}
                    <td style={{ padding: '0.75rem', borderRight: `1px solid ${palette.border}` }}>
                      <div>
                        <p style={{ margin: 0, fontWeight: 600, color: palette.text }}>{user.name}</p>
                        <p style={{ margin: '0.2rem 0 0', color: palette.textSecondary, fontSize: '0.75rem' }}>
                          {user.phone}
                        </p>
                      </div>
                    </td>

                    {/* Email */}
                    <td style={{ padding: '0.75rem', borderRight: `1px solid ${palette.border}`, color: palette.textSecondary }}>
                      {user.email}
                    </td>

                    {/* Role */}
                    <td style={{ padding: '0.75rem', borderRight: `1px solid ${palette.border}` }}>
                      <div
                        style={{
                          ...roleColor,
                          ...badgeStyle,
                          display: 'inline-flex',
                          marginRight: 0,
                          marginBottom: 0,
                        }}
                      >
                        {user.role}
                      </div>
                    </td>

                    {/* Verification Status */}
                    <td style={{ padding: '0.75rem', borderRight: `1px solid ${palette.border}` }}>
                      <div
                        style={{
                          ...verificationColor,
                          ...badgeStyle,
                          display: 'inline-flex',
                          marginRight: 0,
                          marginBottom: 0,
                        }}
                      >
                        {user.verificationStatus === 'Approved'
                          ? 'Verified'
                          : user.verificationStatus === 'UnderReview'
                            ? 'Under Review'
                            : user.verificationStatus === 'Rejected'
                              ? 'Rejected'
                              : 'Not Submitted'}
                      </div>
                    </td>

                    {/* Access Status */}
                    <td style={{ padding: '0.75rem', borderRight: `1px solid ${palette.border}` }}>
                      <div
                        style={{
                          ...accessColor,
                          ...badgeStyle,
                          display: 'inline-flex',
                          marginRight: 0,
                          marginBottom: 0,
                        }}
                      >
                        {user.isServiceAccessAllowed ? 'Allowed' : 'Blocked'}
                      </div>
                    </td>

                    {/* Document Count */}
                    <td style={{ padding: '0.75rem', textAlign: 'center', borderRight: `1px solid ${palette.border}`, color: palette.accent, fontWeight: 700 }}>
                      {documentCount}
                    </td>

                    {/* Actions */}
                    <td
                      style={{
                        padding: '0.75rem',
                        textAlign: 'center',
                      }}
                    >
                      <button
                        onClick={() => onViewDocuments(user)}
                        style={{
                          borderRadius: '6px',
                          border: `1px solid ${palette.accent}`,
                          backgroundColor: '#FFF8E1',
                          color: '#A16207',
                          padding: '0.35rem 0.65rem',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          fontWeight: 500,
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#FDE68A';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#FFF8E1';
                        }}
                        title={`View ${documentCount} document${documentCount !== 1 ? 's' : ''}`}
                      >
                        <Eye size={13} /> View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default UsersList;
