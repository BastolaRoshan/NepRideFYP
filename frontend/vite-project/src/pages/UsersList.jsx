import { useMemo, useState } from 'react';
import { Eye } from 'lucide-react';

const palette = {
  bg: '#F8FAFC',
  card: '#FFFFFF',
  border: '#E5E7EB',
  accent: '#D4AF37',
  text: '#111827',
  textSecondary: '#6B7280',
  approved: '#0f5c3a',
  underReview: '#F59E0B',
  rejected: '#EF4444',
  notSubmitted: '#9CA3AF',
};

const UsersList = ({
  users,
  onViewDocuments,
  accountStatusDrafts = {},
  onUpdateAccountStatus,
  onSaveAccountStatus,
  savingAccountStatus = {},
}) => {
  const [filter, setFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  const filters = [
    { key: 'All', label: 'All Users' },
    { key: 'Customer', label: 'Customers' },
    { key: 'Vendor', label: 'Vendors' },
    { key: 'Verified', label: 'Verified' },
    { key: 'UnderReview', label: 'Under Review' },
    { key: 'Rejected', label: 'Rejected' },
    { key: 'NotSubmitted', label: 'Unverified' },
  ];

  const filteredUsers = useMemo(() => {
    let result = users;

    if (filter === 'Customer') {
      result = result.filter((user) => user.role === 'Customer');
    } else if (filter === 'Vendor') {
      result = result.filter((user) => user.role === 'Vendor');
    } else if (filter === 'Verified') {
      result = result.filter((user) => user.verificationStatus === 'Approved');
    } else if (filter === 'UnderReview') {
      result = result.filter((user) => user.verificationStatus === 'UnderReview');
    } else if (filter === 'Rejected') {
      result = result.filter((user) => user.verificationStatus === 'Rejected');
    } else if (filter === 'NotSubmitted') {
      result = result.filter((user) => user.verificationStatus === 'NotSubmitted');
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (user) =>
          user.name.toLowerCase().includes(term) ||
          user.email.toLowerCase().includes(term) ||
          user.phone.includes(term)
      );
    }

    return result;
  }, [users, filter, searchTerm]);

  const getVerificationStatusColor = (status) => {
    switch (status) {
      case 'Approved':
        return { backgroundColor: '#BBF7D0', color: palette.approved, borderColor: '#0f5c3a' };
      case 'UnderReview':
        return { backgroundColor: '#F59E0B1A', color: palette.underReview, borderColor: '#F59E0B66' };
      case 'Rejected':
        return { backgroundColor: '#EF44441A', color: palette.rejected, borderColor: '#EF444466' };
      case 'NotSubmitted':
      default:
        return { backgroundColor: '#F3F4F6', color: palette.textSecondary, borderColor: '#D1D5DB' };
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

  const getAccountStatusColor = (status) => {
    switch (status) {
      case 'active':
        return { bg: '#22C55E1A', text: '#15803d', border: '#22C55E66' };
      case 'suspended':
        return { bg: '#F59E0B1A', text: '#92400e', border: '#F59E0B66' };
      case 'blocked':
        return { bg: '#EF44441A', text: '#991b1b', border: '#EF444466' };
      default:
        return { bg: '#22C55E1A', text: '#15803d', border: '#22C55E66' };
    }
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
      <div style={{ ...cardStyle, display: 'grid', gap: '0.75rem' }}>
        <div>
          <label style={{ color: palette.textSecondary, fontSize: '0.8rem', display: 'block', marginBottom: '0.35rem' }}>
            Filter Users
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {filters.map((item) => (
              <button
                key={item.key}
                onClick={() => setFilter(item.key)}
                style={{
                  borderRadius: '6px',
                  border: filter === item.key ? `1px solid ${palette.accent}` : `1px solid ${palette.border}`,
                  backgroundColor: filter === item.key ? '#FFF8E1' : palette.card,
                  color: filter === item.key ? '#A16207' : palette.textSecondary,
                  padding: '0.4rem 0.65rem',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  transition: 'all 0.2s',
                }}
              >
                {item.label}
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
            onChange={(event) => setSearchTerm(event.target.value)}
            style={inputStyle}
          />
        </div>
      </div>

      <div style={{ color: palette.textSecondary, fontSize: '0.85rem' }}>
        Showing {filteredUsers.length} of {users.length} users
      </div>

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
                <th style={{ padding: '0.75rem', textAlign: 'left', color: palette.text, fontWeight: 600 }}>Name</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', color: palette.text, fontWeight: 600 }}>Email</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', color: palette.text, fontWeight: 600 }}>Role</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', color: palette.text, fontWeight: 600 }}>Verification</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', color: palette.text, fontWeight: 600 }}>Account Status</th>
                <th style={{ padding: '0.75rem', textAlign: 'center', color: palette.text, fontWeight: 600 }}>Docs</th>
                <th style={{ padding: '0.75rem', textAlign: 'center', color: palette.text, fontWeight: 600 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => {
                const roleColor = getRoleColor(user.role);
                const verificationColor = getVerificationStatusColor(user.verificationStatus);
                const currentAccountStatus = accountStatusDrafts[user._id] || user.accountStatus || 'active';
                const accountStatusColor = getAccountStatusColor(currentAccountStatus);
                const documentCount = Array.isArray(user.documents) ? user.documents.length : 0;
                const isDirty = currentAccountStatus !== (user.accountStatus || 'active');

                return (
                  <tr
                    key={user._id}
                    style={{
                      borderBottom: `1px solid ${palette.border}`,
                      backgroundColor: palette.card,
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(event) => (event.currentTarget.style.backgroundColor = '#F8FAFC')}
                    onMouseLeave={(event) => (event.currentTarget.style.backgroundColor = '#FFFFFF')}
                  >
                    <td style={{ padding: '0.75rem', borderRight: `1px solid ${palette.border}` }}>
                      <div>
                        <p style={{ margin: 0, fontWeight: 600, color: palette.text }}>{user.name}</p>
                        <p style={{ margin: '0.2rem 0 0', color: palette.textSecondary, fontSize: '0.75rem' }}>{user.phone}</p>
                      </div>
                    </td>

                    <td style={{ padding: '0.75rem', borderRight: `1px solid ${palette.border}`, color: palette.textSecondary }}>
                      {user.email}
                    </td>

                    <td style={{ padding: '0.75rem', borderRight: `1px solid ${palette.border}` }}>
                      <div style={{ ...roleColor, ...badgeStyle, display: 'inline-flex', marginRight: 0, marginBottom: 0 }}>
                        {user.role}
                      </div>
                    </td>

                    <td style={{ padding: '0.75rem', borderRight: `1px solid ${palette.border}` }}>
                      <div style={{ ...verificationColor, ...badgeStyle, display: 'inline-flex', marginRight: 0, marginBottom: 0 }}>
                        {user.verificationStatus === 'Approved'
                          ? 'Verified'
                          : user.verificationStatus === 'UnderReview'
                            ? 'Under Review'
                            : user.verificationStatus === 'Rejected'
                              ? 'Rejected'
                              : 'Unverified'}
                      </div>
                    </td>

                    <td style={{ padding: '0.75rem', borderRight: `1px solid ${palette.border}` }}>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <select
                          value={currentAccountStatus}
                          onChange={(event) => onUpdateAccountStatus && onUpdateAccountStatus(user._id, event.target.value)}
                          style={{
                            borderRadius: '6px',
                            border: `1px solid ${palette.border}`,
                            backgroundColor: palette.card,
                            color: palette.text,
                            padding: '0.35rem 0.5rem',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                          }}
                        >
                          <option value="active">Active</option>
                          <option value="suspended">Suspended</option>
                          <option value="blocked">Blocked</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => onSaveAccountStatus && onSaveAccountStatus(user._id)}
                          disabled={savingAccountStatus[user._id]}
                          style={{
                            borderRadius: '4px',
                            border: `1px solid ${accountStatusColor.border}`,
                            backgroundColor: accountStatusColor.bg,
                            color: accountStatusColor.text,
                            padding: '0.3rem 0.55rem',
                            cursor: savingAccountStatus[user._id] ? 'not-allowed' : 'pointer',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            opacity: savingAccountStatus[user._id] ? 0.6 : 1,
                          }}
                        >
                          {savingAccountStatus[user._id]
                            ? 'Saving...'
                            : user.accountStatus === 'blocked' && currentAccountStatus === 'active'
                              ? 'Unblock'
                              : 'Save'}
                        </button>
                      </div>
                    </td>

                    <td style={{ padding: '0.75rem', textAlign: 'center', borderRight: `1px solid ${palette.border}`, color: palette.accent, fontWeight: 700 }}>
                      {documentCount}
                    </td>

                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
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
                        onMouseEnter={(event) => {
                          event.currentTarget.style.backgroundColor = '#FDE68A';
                        }}
                        onMouseLeave={(event) => {
                          event.currentTarget.style.backgroundColor = '#FFF8E1';
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
