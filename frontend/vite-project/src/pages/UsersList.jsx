import { useState, useMemo } from 'react';
import { ChevronDown, FileText, Eye } from 'lucide-react';

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
        return { bg: '#16a34a25', text: '#4ade80', border: '#16a34a60' };
      case 'UnderReview':
        return { bg: '#ea580c25', text: '#fb923c', border: '#ea580c60' };
      case 'Rejected':
        return { bg: '#dc262625', text: '#f87171', border: '#dc262660' };
      case 'NotSubmitted':
        return { bg: '#64748b25', text: '#94a3b8', border: '#64748b60' };
      default:
        return { bg: '#64748b25', text: '#94a3b8', border: '#64748b60' };
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'Customer':
        return { bg: '#3b82f625', text: '#60a5fa', border: '#3b82f660' };
      case 'Vendor':
        return { bg: '#a855f725', text: '#d8b4fe', border: '#a855f760' };
      case 'Admin':
        return { bg: '#d4af3725', text: '#d4af37', border: '#d4af3760' };
      default:
        return { bg: '#3b82f625', text: '#60a5fa', border: '#3b82f660' };
    }
  };

  const getAccessStatusColor = (allowed) => {
    return allowed
      ? { bg: '#16a34a25', text: '#4ade80', border: '#16a34a60' }
      : { bg: '#dc262625', text: '#f87171', border: '#dc262660' };
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
          <label style={{ color: '#a0a0a0', fontSize: '0.8rem', display: 'block', marginBottom: '0.35rem' }}>
            Filter Users
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                style={{
                  borderRadius: '6px',
                  border: filter === f.key ? '1px solid #d4af37' : '1px solid #333',
                  backgroundColor: filter === f.key ? '#d4af3720' : '#0f0f0f',
                  color: filter === f.key ? '#d4af37' : '#a0a0a0',
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
          <label style={{ color: '#a0a0a0', fontSize: '0.8rem', display: 'block', marginBottom: '0.35rem' }}>
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
      <div style={{ color: '#a0a0a0', fontSize: '0.85rem' }}>
        Showing {filteredUsers.length} of {users.length} users
      </div>

      {/* Users Table */}
      {filteredUsers.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: 'center', color: '#a0a0a0', padding: '2rem' }}>
          No users found matching the selected filters.
        </div>
      ) : (
        <div
          style={{
            overflowX: 'auto',
            borderRadius: '12px',
            border: '1px solid #333',
            backgroundColor: '#000',
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
              <tr style={{ borderBottom: '1px solid #333', backgroundColor: '#0f0f0f' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left', color: '#d4af37', fontWeight: 600 }}>
                  Name
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'left', color: '#d4af37', fontWeight: 600 }}>
                  Email
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'left', color: '#d4af37', fontWeight: 600 }}>
                  Role
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'left', color: '#d4af37', fontWeight: 600 }}>
                  Verification
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'left', color: '#d4af37', fontWeight: 600 }}>
                  Access
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'center', color: '#d4af37', fontWeight: 600 }}>
                  Docs
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'center', color: '#d4af37', fontWeight: 600 }}>
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
                      borderBottom: '1px solid #1f1f1f',
                      backgroundColor: '#000',
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#0a0a0a')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#000')}
                  >
                    {/* Name */}
                    <td style={{ padding: '0.75rem', borderRight: '1px solid #1f1f1f' }}>
                      <div>
                        <p style={{ margin: 0, fontWeight: 500, color: '#fff' }}>{user.name}</p>
                        <p style={{ margin: '0.2rem 0 0', color: '#a0a0a0', fontSize: '0.75rem' }}>
                          {user.phone}
                        </p>
                      </div>
                    </td>

                    {/* Email */}
                    <td style={{ padding: '0.75rem', borderRight: '1px solid #1f1f1f', color: '#a0a0a0' }}>
                      {user.email}
                    </td>

                    {/* Role */}
                    <td style={{ padding: '0.75rem', borderRight: '1px solid #1f1f1f' }}>
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
                    <td style={{ padding: '0.75rem', borderRight: '1px solid #1f1f1f' }}>
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
                    <td style={{ padding: '0.75rem', borderRight: '1px solid #1f1f1f' }}>
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
                    <td style={{ padding: '0.75rem', textAlign: 'center', borderRight: '1px solid #1f1f1f', color: '#d4af37', fontWeight: 600 }}>
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
                          border: '1px solid #d4af37',
                          backgroundColor: 'transparent',
                          color: '#d4af37',
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
                          e.currentTarget.style.backgroundColor = '#d4af3720';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
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
