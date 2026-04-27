import React, { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { deleteManagedUser, fetchUsersForRoleManagement, sendPasswordResetForUser, updateProfileRole } from '../services/authService';
import { clearAllOccupancyData } from '../services/occupancyService';
import { fetchOccupancyHealth } from '../services/healthService';
import { createRoom } from '../services/roomsService';

const roleDescriptions = [
  { role: 'Viewer', desc: 'Read-only access across the accommodation module.' },
  { role: 'Accommodation', desc: 'Can manage rooms, occupancy, and stay history.' },
  { role: 'Admin', desc: 'Full control over users, settings, and data tools.' },
];

const defaultRoomForm = {
  building: 'OFFICE BUILDING',
  buildingCode: 'OB',
  floor: '1',
  roomNo: '',
  roomType: 'Internal',
  acType: 'AC',
  toiletType: 'Attached',
  roomActive: 'Yes',
  totalBeds: '1',
};

function compareRoomIds(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

function formatDate(value) {
  if (!value) return 'Never';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function ConfirmationDialog({ config, busy, onCancel, onConfirm }) {
  if (!config?.open) return null;

  const isDanger = config.variant === 'danger';

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 460, background: '#fff', borderRadius: 20, boxShadow: '0 24px 60px rgba(15,23,42,.22)', border: '1px solid #dbe4f0', overflow: 'hidden' }}>
        <div style={{ padding: '20px 22px', background: isDanger ? 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%)' : 'linear-gradient(135deg, #1e3a8a 0%, #0ea5e9 100%)', color: '#fff' }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.5, textTransform: 'uppercase', opacity: 0.9 }}>Please Confirm</div>
          <div style={{ fontSize: 22, fontWeight: 900, marginTop: 4 }}>{config.title}</div>
        </div>

        <div style={{ padding: '20px 22px 22px' }}>
          <p style={{ margin: 0, color: '#475569', fontSize: 15, lineHeight: 1.6, fontWeight: 600 }}>{config.message}</p>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #cbd5e1', background: '#fff', color: '#334155', fontWeight: 800, cursor: busy ? 'not-allowed' : 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={busy}
              style={{ padding: '10px 14px', borderRadius: 10, border: 'none', background: isDanger ? '#dc2626' : '#2563eb', color: '#fff', fontWeight: 800, cursor: busy ? 'not-allowed' : 'pointer' }}
            >
              {busy ? 'Please wait...' : (config.confirmLabel || 'Confirm')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Settings({ user, setUser }) {
  const { roomsState = [], setRoomsState, setOccupants, setStayHistory } = useOutletContext();
  const [roomForm, setRoomForm] = useState(defaultRoomForm);
  const [isResetting, setIsResetting] = useState(false);
  const [isSavingRoom, setIsSavingRoom] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [managedUsers, setManagedUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [pendingRoles, setPendingRoles] = useState({});
  const [savingRoleUserId, setSavingRoleUserId] = useState('');
  const [userActionState, setUserActionState] = useState({ id: '', type: '' });
  const [confirmConfig, setConfirmConfig] = useState({ open: false });
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthSummary, setHealthSummary] = useState(null);
  const isAdmin = (user?.role || 'Admin') === 'Admin';

  const existingRoomIds = useMemo(() => new Set(roomsState.map(room => String(room.id || '').toUpperCase())), [roomsState]);

  useEffect(() => {
    if (!isAdmin) return;

    let cancelled = false;
    setUsersLoading(true);

    fetchUsersForRoleManagement()
      .then(users => {
        if (!cancelled) setManagedUsers(users);
      })
      .catch(error => {
        if (!cancelled) setNotice(error?.message || 'Unable to load user list.');
      })
      .finally(() => {
        if (!cancelled) setUsersLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;

    let cancelled = false;

    (async () => {
      setHealthLoading(true);
      const result = await fetchOccupancyHealth();
      if (!cancelled) {
        setHealthSummary(result);
        setHealthLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return managedUsers;
    return managedUsers.filter(item =>
      String(item.email || '').toLowerCase().includes(q) ||
      String(item.role || '').toLowerCase().includes(q)
    );
  }, [managedUsers, userSearch]);

  const roleCounts = useMemo(() => ({
    Admin: managedUsers.filter(item => item.role === 'Admin').length,
    Accommodation: managedUsers.filter(item => item.role === 'Accommodation').length,
    Viewer: managedUsers.filter(item => item.role === 'Viewer').length,
  }), [managedUsers]);

  const handleRoleSelectionChange = (userId, nextRole) => {
    setPendingRoles(prev => ({ ...prev, [userId]: nextRole }));
    setNotice('');
  };

  const closeConfirmDialog = () => {
    if (confirmBusy) return;
    setConfirmConfig({ open: false });
  };

  const submitRoleChange = async (targetUser, nextRole) => {
    setSavingRoleUserId(targetUser.id);
    setNotice('');

    const result = await updateProfileRole(targetUser.id, targetUser.email, nextRole);

    if (result.user) {
      try {
        const refreshedUsers = await fetchUsersForRoleManagement();
        setManagedUsers(refreshedUsers);

        const refreshedTarget = refreshedUsers.find(item => item.id === targetUser.id);
        if (refreshedTarget?.role === nextRole) {
          setPendingRoles(prev => {
            const next = { ...prev };
            delete next[targetUser.id];
            return next;
          });

          if (user?.id === targetUser.id) setUser(result.user);
          setNotice(`Updated ${targetUser.email} to ${nextRole}.`);
        } else {
          setPendingRoles(prev => ({ ...prev, [targetUser.id]: nextRole }));
          setNotice(`The role for ${targetUser.email} did not save. Please try again.`);
        }
      } catch (error) {
        setManagedUsers(prev => prev.map(item => item.id === targetUser.id ? { ...item, role: nextRole } : item));
        setPendingRoles(prev => {
          const next = { ...prev };
          delete next[targetUser.id];
          return next;
        });

        if (user?.id === targetUser.id) setUser(result.user);
        setNotice(error?.message || `Updated ${targetUser.email}, but the list could not be refreshed.`);
      }
    } else {
      setPendingRoles(prev => ({ ...prev, [targetUser.id]: nextRole }));
      setNotice(result.error || 'Role update failed.');
    }

    setSavingRoleUserId('');
  };

  const runResetData = async () => {
    setIsResetting(true);
    setNotice('');

    const result = await clearAllOccupancyData();
    if (result) {
      setOccupants([]);
      setStayHistory([]);
      localStorage.removeItem('tic_stay_history');
      setNotice('Occupancy and stay history were cleared. Rooms were kept.');
    } else {
      setNotice('Unable to clear the live data.');
    }

    setIsResetting(false);
  };

  const submitPasswordReset = async (targetUser) => {
    setUserActionState({ id: targetUser.id, type: 'reset' });
    setNotice('');

    const result = await sendPasswordResetForUser(targetUser.id, targetUser.email);
    setNotice(result.success ? `Password reset email sent to ${targetUser.email}.` : (result.error || 'Unable to send password reset email.'));

    setUserActionState({ id: '', type: '' });
  };

  const submitDeleteUser = async (targetUser) => {
    setUserActionState({ id: targetUser.id, type: 'delete' });
    setNotice('');

    const result = await deleteManagedUser(targetUser.id);

    if (result.success) {
      setManagedUsers(prev => prev.filter(item => item.id !== targetUser.id));
      setPendingRoles(prev => {
        const next = { ...prev };
        delete next[targetUser.id];
        return next;
      });
      setNotice(`${targetUser.email} was deleted successfully.`);
    } else {
      setNotice(result.error || 'Unable to delete user.');
    }

    setUserActionState({ id: '', type: '' });
  };

  const handleManagedUserRoleChange = async (targetUser) => {
    if (!isAdmin) return;

    const nextRole = pendingRoles[targetUser.id] || targetUser.role;
    if (!nextRole || nextRole === targetUser.role) {
      setNotice(`No changes to save for ${targetUser.email}.`);
      return;
    }

    setConfirmConfig({
      open: true,
      variant: 'primary',
      title: 'Confirm Role Change',
      message: `Are you sure you want to change ${targetUser.email} to ${nextRole}?`,
      confirmLabel: 'Yes, Save Change',
      action: async () => submitRoleChange(targetUser, nextRole),
    });
  };

  const handlePasswordReset = (targetUser) => {
    if (!isAdmin) return;

    setConfirmConfig({
      open: true,
      variant: 'primary',
      title: 'Send Password Reset',
      message: `Send a password reset email to ${targetUser.email}?`,
      confirmLabel: 'Send Reset Email',
      action: async () => submitPasswordReset(targetUser),
    });
  };

  const handleDeleteUser = (targetUser) => {
    if (!isAdmin) return;

    if (targetUser.id === user?.id) {
      setNotice('You cannot delete the account you are currently using.');
      return;
    }

    if (targetUser.role === 'Admin' && roleCounts.Admin <= 1) {
      setNotice('At least one Admin account must remain.');
      return;
    }

    setConfirmConfig({
      open: true,
      variant: 'danger',
      title: 'Delete User',
      message: `Delete ${targetUser.email}? This will remove their login access and profile.`,
      confirmLabel: 'Yes, Delete User',
      action: async () => submitDeleteUser(targetUser),
    });
  };

  const handleResetData = async () => {
    if (!isAdmin || isResetting) return;

    setConfirmConfig({
      open: true,
      variant: 'danger',
      title: 'Clear Live Data',
      message: 'This will remove all live occupancy and stay history data while keeping the room master untouched.',
      confirmLabel: 'Yes, Clear Data',
      action: runResetData,
    });
  };

  const handleConfirmAction = async () => {
    if (!confirmConfig?.action) {
      setConfirmConfig({ open: false });
      return;
    }

    setConfirmBusy(true);
    try {
      await confirmConfig.action();
      setConfirmConfig({ open: false });
    } finally {
      setConfirmBusy(false);
    }
  };

  const handleRoomInput = (e) => {
    const { name, value } = e.target;
    setRoomForm(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'building' && value === 'OFFICE BUILDING' ? { buildingCode: 'OB' } : {}),
      ...(name === 'building' && value === 'F&B BUILDING' ? { buildingCode: 'FB' } : {}),
      ...(name === 'building' && value === 'VTV BUILDING' ? { buildingCode: 'VTV' } : {}),
    }));
  };

  const handleRefreshHealth = async () => {
    if (!isAdmin || healthLoading) return;
    setHealthLoading(true);
    const result = await fetchOccupancyHealth();
    setHealthSummary(result);
    setHealthLoading(false);
  };

  const handleAddRoom = async (e) => {
    e.preventDefault();
    if (!isAdmin || isSavingRoom) return;

    const roomId = `${roomForm.buildingCode}-${roomForm.floor}-${roomForm.roomNo}`.toUpperCase().trim();
    const totalBeds = Math.max(1, Number.parseInt(roomForm.totalBeds, 10) || 1);

    if (!roomForm.roomNo.trim()) {
      setNotice('Please enter a room number.');
      return;
    }

    if (existingRoomIds.has(roomId)) {
      setNotice(`Room ${roomId} already exists.`);
      return;
    }

    setIsSavingRoom(true);
    setNotice('');

    const saved = await createRoom({
      id: roomId,
      roomId,
      building: roomForm.building,
      buildingCode: roomForm.buildingCode,
      floor: roomForm.floor,
      roomNo: roomForm.roomNo.trim(),
      roomType: roomForm.roomType,
      ac: roomForm.acType === 'AC',
      attached: roomForm.toiletType === 'Attached',
      roomActive: roomForm.roomActive,
      totalBeds,
      usedBeds: 0,
      availableBeds: totalBeds,
    });

    if (saved) {
      setRoomsState(prev => [...prev, saved].sort((a, b) => compareRoomIds(a.id, b.id)));
      setRoomForm(defaultRoomForm);
      setNotice(`Room ${roomId} was added successfully.`);
    } else {
      setNotice('Unable to add the room.');
    }

    setIsSavingRoom(false);
  };

  const cardStyle = { background: '#fff', borderRadius: 18, boxShadow: '0 10px 28px rgba(30,49,95,.08)', border: '1px solid #dfe6f1', padding: '22px 24px', marginBottom: 22 };
  const labelStyle = { display: 'flex', flexDirection: 'column', gap: 6, color: '#334155', fontWeight: 700, fontSize: 13 };
  const inputStyle = { fontSize: 14, padding: '10px 12px', borderRadius: 10, border: '1.5px solid #d0d7e2', fontWeight: 600, background: '#fff' };

  return (
    <div className="page-container" style={{ width: '100%', maxWidth: '100%', margin: 0, padding: '24px 32px 24px 32px', background: 'none', fontFamily: 'Inter, Segoe UI, Arial, sans-serif', boxSizing: 'border-box' }}>
      <div style={{ background: 'linear-gradient(125deg, #0f172a 0%, #1e3a8a 45%, #0ea5e9 100%)', color: '#fff', borderRadius: 18, padding: '24px 26px', boxShadow: '0 16px 32px rgba(15,23,42,.18)', marginBottom: 18 }}>
        <div style={{ fontSize: 12, opacity: 0.92, letterSpacing: 0.5, textTransform: 'uppercase', fontWeight: 700 }}>System Control Center</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap', marginTop: 8 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.8rem', lineHeight: 1.1, fontWeight: 900 }}>Settings</h1>
            <p style={{ margin: '8px 0 0', opacity: 0.92 }}>Manage access, testing tools, and room master setup from one place.</p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.14)', padding: '10px 14px', borderRadius: 12, fontWeight: 800 }}>
            Signed in as {user?.role || 'Viewer'}
          </div>
        </div>
      </div>

      {notice ? (
        <div style={{ marginBottom: 16, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: 12, padding: '12px 14px', fontWeight: 700 }}>
          {notice}
        </div>
      ) : null}

      <div style={cardStyle}>
        <h2 style={{ fontWeight: 800, fontSize: '1.25rem', color: '#1e315f', margin: 0 }}>My Access</h2>
        <p style={{ color: '#64748b', fontWeight: 600, margin: '6px 0 16px' }}>Your current permission level in the accommodation system.</p>

        <div style={{ display: 'inline-flex', padding: '8px 14px', borderRadius: 999, background: '#eef2ff', color: '#3730a3', fontWeight: 900, fontSize: 13, marginBottom: 14 }}>
          {user?.role || 'Viewer'}
        </div>

        <div style={{ color: '#475569', fontWeight: 600 }}>
          {(roleDescriptions.find(item => item.role === (user?.role || 'Viewer')) || roleDescriptions[0]).desc}
        </div>
      </div>

      {isAdmin ? (
        <>
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
              <div>
                <h2 style={{ fontWeight: 800, fontSize: '1.25rem', color: '#1e315f', margin: 0 }}>User Access Management</h2>
                <p style={{ color: '#64748b', fontWeight: 600, margin: '6px 0 0' }}>Manage roles, send password reset emails, and remove users safely.</p>
              </div>
              <input
                type="text"
                placeholder="Search by email or role..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                style={{ ...inputStyle, minWidth: 260 }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 18 }}>
              {roleDescriptions.map(item => (
                <div key={item.role} style={{ borderRadius: 14, border: '1px solid #dbe4f0', background: '#f8fbff', padding: '14px 16px' }}>
                  <div style={{ fontWeight: 900, color: '#1e315f', fontSize: 16 }}>{item.role}</div>
                  <div style={{ marginTop: 4, color: '#64748b', fontSize: 13, minHeight: 36 }}>{item.desc}</div>
                  <div style={{ marginTop: 10, display: 'inline-flex', padding: '4px 10px', borderRadius: 999, background: '#e0e7ff', color: '#3730a3', fontWeight: 800, fontSize: 12 }}>
                    {roleCounts[item.role]} users
                  </div>
                </div>
              ))}
            </div>

            {usersLoading ? (
              <div style={{ color: '#64748b', fontWeight: 700 }}>Loading users...</div>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {filteredUsers.length === 0 ? (
                  <div style={{ color: '#94a3b8', fontWeight: 700, padding: '10px 0' }}>No users found.</div>
                ) : filteredUsers.map(item => {
                  const selectedRole = pendingRoles[item.id] || item.role;
                  const hasPendingChange = selectedRole !== item.role;
                  const isSavingThisUser = savingRoleUserId === item.id;
                  const isResettingPassword = userActionState.id === item.id && userActionState.type === 'reset';
                  const isDeletingUser = userActionState.id === item.id && userActionState.type === 'delete';
                  const isBusyUser = isSavingThisUser || isResettingPassword || isDeletingUser;
                  const canDeleteUserRow = item.id !== user?.id && !(item.role === 'Admin' && roleCounts.Admin <= 1);

                  return (
                    <div key={item.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) 120px 120px minmax(320px, 1.2fr)', gap: 12, alignItems: 'center', border: '1px solid #e2e8f0', borderRadius: 14, padding: '12px 14px', background: '#fff' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 800, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.email || 'No email'}</div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>Created: {formatDate(item.createdAt)}</div>
                      </div>
                      <div style={{ fontWeight: 700, color: item.emailConfirmed ? '#166534' : '#b45309' }}>{item.emailConfirmed ? 'Confirmed' : 'Pending'}</div>
                      <div>
                        <span style={{ display: 'inline-flex', padding: '5px 10px', borderRadius: 999, background: '#eef2ff', color: '#3730a3', fontWeight: 800, fontSize: 12 }}>{item.role}</span>
                      </div>
                      <div style={{ display: 'grid', gap: 8 }}>
                        <select value={selectedRole} onChange={e => handleRoleSelectionChange(item.id, e.target.value)} style={inputStyle} disabled={isBusyUser}>
                          {roleDescriptions.map(r => (
                            <option key={r.role} value={r.role}>{r.role}</option>
                          ))}
                        </select>

                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={() => handleManagedUserRoleChange(item)}
                            disabled={!hasPendingChange || isBusyUser}
                            style={{ padding: '8px 12px', borderRadius: 10, border: 'none', background: !hasPendingChange || isBusyUser ? '#cbd5e1' : '#2563eb', color: '#fff', fontWeight: 800, cursor: !hasPendingChange || isBusyUser ? 'not-allowed' : 'pointer' }}
                          >
                            {isSavingThisUser ? 'Saving...' : 'Save Change'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handlePasswordReset(item)}
                            disabled={isBusyUser}
                            style={{ padding: '8px 12px', borderRadius: 10, border: 'none', background: isBusyUser ? '#cbd5e1' : '#0f766e', color: '#fff', fontWeight: 800, cursor: isBusyUser ? 'not-allowed' : 'pointer' }}
                          >
                            {isResettingPassword ? 'Sending...' : 'Reset Password'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteUser(item)}
                            disabled={!canDeleteUserRow || isBusyUser}
                            style={{ padding: '8px 12px', borderRadius: 10, border: 'none', background: !canDeleteUserRow || isBusyUser ? '#cbd5e1' : '#dc2626', color: '#fff', fontWeight: 800, cursor: !canDeleteUserRow || isBusyUser ? 'not-allowed' : 'pointer' }}
                          >
                            {isDeletingUser ? 'Deleting...' : 'Delete User'}
                          </button>

                          {hasPendingChange ? (
                            <button
                              type="button"
                              onClick={() => setPendingRoles(prev => ({ ...prev, [item.id]: item.role }))}
                              disabled={isBusyUser}
                              style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid #cbd5e1', background: '#fff', color: '#334155', fontWeight: 800, cursor: isBusyUser ? 'not-allowed' : 'pointer' }}
                            >
                              Cancel
                            </button>
                          ) : null}
                        </div>

                        {!hasPendingChange ? (
                          <div style={{ color: '#64748b', fontSize: 12, fontWeight: 700 }}>
                            {item.id === user?.id ? 'Current signed-in account cannot be deleted.' : (!canDeleteUserRow ? 'Keep at least one Admin account active.' : 'No pending role changes.')}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
              <div>
                <h2 style={{ fontWeight: 800, fontSize: '1.2rem', color: '#1e315f', margin: 0 }}>System Health</h2>
                <p style={{ color: '#64748b', fontWeight: 600, margin: '6px 0 0' }}>Backend integrity snapshot for live occupancy and stay history.</p>
              </div>
              <button
                type="button"
                onClick={handleRefreshHealth}
                disabled={healthLoading}
                style={{ padding: '10px 14px', borderRadius: 10, border: 'none', background: healthLoading ? '#cbd5e1' : '#1d4ed8', color: '#fff', fontWeight: 800, cursor: healthLoading ? 'not-allowed' : 'pointer' }}
              >
                {healthLoading ? 'Refreshing...' : 'Refresh Health'}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 14 }}>
              <div style={{ borderRadius: 14, border: '1px solid #dbe4f0', background: '#f8fbff', padding: '14px 16px' }}>
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Health Status</div>
                <div style={{ marginTop: 8, fontWeight: 900, fontSize: 18, color: healthSummary?.ok ? '#166534' : '#b91c1c' }}>
                  {healthLoading && !healthSummary ? 'Checking...' : (healthSummary?.ok ? 'Healthy' : 'Needs Attention')}
                </div>
              </div>
              <div style={{ borderRadius: 14, border: '1px solid #dbe4f0', background: '#f8fbff', padding: '14px 16px' }}>
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Active Occupants</div>
                <div style={{ marginTop: 8, fontWeight: 900, fontSize: 18, color: '#1e315f' }}>{healthSummary?.activeOccupants ?? '-'}</div>
              </div>
              <div style={{ borderRadius: 14, border: '1px solid #dbe4f0', background: '#f8fbff', padding: '14px 16px' }}>
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Total Occupancy Rows</div>
                <div style={{ marginTop: 8, fontWeight: 900, fontSize: 18, color: '#1e315f' }}>{healthSummary?.totalRows ?? '-'}</div>
              </div>
              <div style={{ borderRadius: 14, border: '1px solid #dbe4f0', background: '#f8fbff', padding: '14px 16px' }}>
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Stay History Entries</div>
                <div style={{ marginTop: 8, fontWeight: 900, fontSize: 18, color: '#1e315f' }}>{healthSummary?.stayHistoryEntries ?? '-'}</div>
              </div>
            </div>

            {healthSummary?.error ? (
              <div style={{ marginBottom: 12, background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: 12, padding: '12px 14px', fontWeight: 700 }}>
                {healthSummary.error}
              </div>
            ) : null}

            <div style={{ color: '#475569', fontWeight: 700, fontSize: 13 }}>
              Last checked: {healthSummary?.checkedAt ? formatDate(healthSummary.checkedAt) : 'Not checked yet'}
            </div>

            {Array.isArray(healthSummary?.duplicateActiveBeds) && healthSummary.duplicateActiveBeds.length > 0 ? (
              <div style={{ marginTop: 14, borderRadius: 14, border: '1px solid #fecaca', background: '#fff5f5', padding: '14px 16px' }}>
                <div style={{ fontWeight: 900, color: '#b91c1c', marginBottom: 8 }}>Duplicate Active Bed Assignments</div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {healthSummary.duplicateActiveBeds.map(item => (
                    <div key={item.key} style={{ color: '#7f1d1d', fontWeight: 700, fontSize: 13 }}>
                      {item.key}: {item.occupants.join(', ')}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div style={cardStyle}>
            <h2 style={{ fontWeight: 800, fontSize: '1.2rem', color: '#1e315f', marginBottom: 10 }}>Test Data Reset</h2>
            <p style={{ color: '#64748b', fontWeight: 600, margin: '0 0 16px' }}>
              Clear live occupancy and stay history while keeping all room cards and room master data untouched.
            </p>
            <button
              onClick={handleResetData}
              disabled={!isAdmin || isResetting}
              style={{ padding: '11px 18px', borderRadius: 10, border: 'none', background: !isAdmin || isResetting ? '#cbd5e1' : '#dc2626', color: '#fff', fontWeight: 800, cursor: !isAdmin || isResetting ? 'not-allowed' : 'pointer' }}
            >
              {isResetting ? 'Clearing Data...' : 'Clear Occupancy Data'}
            </button>
          </div>

          <div style={cardStyle}>
            <h2 style={{ fontWeight: 800, fontSize: '1.2rem', color: '#1e315f', marginBottom: 10 }}>Add Room</h2>
            <p style={{ color: '#64748b', fontWeight: 600, margin: '0 0 18px' }}>
              Add a new room to the live room master so it appears in the Rooms section for future use.
            </p>

            <form onSubmit={handleAddRoom} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
              <label style={labelStyle}>Building
                <select name="building" value={roomForm.building} onChange={handleRoomInput} style={inputStyle}>
                  <option value="OFFICE BUILDING">Office Building</option>
                  <option value="F&B BUILDING">F&B Building</option>
                  <option value="VTV BUILDING">VTV Building</option>
                </select>
              </label>

              <label style={labelStyle}>Building Code
                <select name="buildingCode" value={roomForm.buildingCode} onChange={handleRoomInput} style={inputStyle}>
                  <option value="OB">OB</option>
                  <option value="FB">FB</option>
                  <option value="VTV">VTV</option>
                </select>
              </label>

              <label style={labelStyle}>Floor
                <input name="floor" value={roomForm.floor} onChange={handleRoomInput} style={inputStyle} />
              </label>

              <label style={labelStyle}>Room No
                <input name="roomNo" value={roomForm.roomNo} onChange={handleRoomInput} style={inputStyle} placeholder="108" />
              </label>

              <label style={labelStyle}>Room Type
                <select name="roomType" value={roomForm.roomType} onChange={handleRoomInput} style={inputStyle}>
                  <option value="Internal">Internal</option>
                  <option value="Project">Project</option>
                  <option value="Quarantine">Quarantine</option>
                </select>
              </label>

              <label style={labelStyle}>AC / Non-AC
                <select name="acType" value={roomForm.acType} onChange={handleRoomInput} style={inputStyle}>
                  <option value="AC">AC</option>
                  <option value="Non-AC">Non-AC</option>
                </select>
              </label>

              <label style={labelStyle}>Toilet Type
                <select name="toiletType" value={roomForm.toiletType} onChange={handleRoomInput} style={inputStyle}>
                  <option value="Attached">Attached</option>
                  <option value="Common">Common</option>
                </select>
              </label>

              <label style={labelStyle}>Room Active
                <select name="roomActive" value={roomForm.roomActive} onChange={handleRoomInput} style={inputStyle}>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </label>

              <label style={labelStyle}>Total Beds
                <input name="totalBeds" type="number" min="1" value={roomForm.totalBeds} onChange={handleRoomInput} style={inputStyle} />
              </label>

              <div style={{ display: 'flex', alignItems: 'end' }}>
                <button
                  type="submit"
                  disabled={!isAdmin || isSavingRoom}
                  style={{ width: '100%', padding: '11px 18px', borderRadius: 10, border: 'none', background: !isAdmin || isSavingRoom ? '#cbd5e1' : '#2563eb', color: '#fff', fontWeight: 800, cursor: !isAdmin || isSavingRoom ? 'not-allowed' : 'pointer' }}
                >
                  {isSavingRoom ? 'Adding Room...' : 'Add Room'}
                </button>
              </div>
            </form>
          </div>
        </>
      ) : null}

      <ConfirmationDialog
        config={confirmConfig}
        busy={confirmBusy}
        onCancel={closeConfirmDialog}
        onConfirm={handleConfirmAction}
      />
    </div>
  );
}

export default Settings;
