const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function getErrorMessage(payload, fallback) {
  if (!payload) return fallback;
  if (typeof payload === 'string') return payload;
  return payload.msg || payload.message || payload.error_description || payload.error || fallback;
}

function ensureEnv() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase environment variables. Add them in Vercel project settings.');
  }
}

export function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

export function allowMethods(req, res, methods) {
  if (methods.includes(req.method)) return true;

  res.setHeader('Allow', methods.join(', '));
  json(res, 405, { error: 'Method not allowed.' });
  return false;
}

export async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string' && req.body.trim()) {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  return await new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
    });
    req.on('end', () => {
      if (!raw.trim()) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

export function parseCookies(req) {
  const cookieHeader = req.headers.cookie || '';
  return cookieHeader.split(';').reduce((acc, item) => {
    const [rawKey, ...rest] = item.trim().split('=');
    if (!rawKey) return acc;
    acc[rawKey] = decodeURIComponent(rest.join('='));
    return acc;
  }, {});
}

function buildCookie(name, value, maxAgeSeconds) {
  const parts = [
    `${name}=${encodeURIComponent(value || '')}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
  ];

  if (process.env.NODE_ENV !== 'development') {
    parts.push('Secure');
  }

  return parts.join('; ');
}

export function setSessionCookies(res, session = {}) {
  const maxAge = Number(session.expires_in || 3600);

  res.setHeader('Set-Cookie', [
    buildCookie('tic_access_token', session.access_token || '', maxAge),
    buildCookie('tic_refresh_token', session.refresh_token || '', 60 * 60 * 24 * 30),
  ]);
}

export function clearSessionCookies(res) {
  res.setHeader('Set-Cookie', [
    buildCookie('tic_access_token', '', 0),
    buildCookie('tic_refresh_token', '', 0),
  ]);
}

async function parseResponse(response) {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return await response.json().catch(() => null);
  }

  return await response.text().catch(() => '');
}

export async function supabaseRequest(path, options = {}) {
  ensureEnv();

  const {
    method = 'GET',
    service = false,
    accessToken = '',
    body,
    headers = {},
    prefer,
  } = options;

  const apiKey = service ? SUPABASE_SERVICE_ROLE_KEY : SUPABASE_ANON_KEY;
  const requestHeaders = {
    apikey: apiKey,
    Authorization: `Bearer ${accessToken || apiKey}`,
    ...headers,
  };

  if (body !== undefined) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  if (prefer) {
    requestHeaders.Prefer = prefer;
  }

  const response = await fetch(`${SUPABASE_URL}${path}`, {
    method,
    headers: requestHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const payload = await parseResponse(response);

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, `Supabase request failed with status ${response.status}`));
  }

  return payload;
}

export function formatUserForClient(profile = {}) {
  return {
    id: profile.id,
    email: profile.email || '',
    role: profile.role || 'Viewer',
    active: profile.active !== false,
  };
}

export async function ensureProfileForUser(user = {}) {
  if (!user?.id) return null;

  try {
    const existing = await supabaseRequest(
      `/rest/v1/profiles?select=id,email,role,active&id=eq.${encodeURIComponent(user.id)}&limit=1`,
      { service: true }
    );

    if (Array.isArray(existing) && existing[0]) {
      return formatUserForClient(existing[0]);
    }
  } catch {
    return formatUserForClient({ id: user.id, email: user.email, role: 'Admin', active: true });
  }

  let role = 'Viewer';

  try {
    const profiles = await supabaseRequest('/rest/v1/profiles?select=id&limit=1', { service: true });
    if (Array.isArray(profiles) && profiles.length === 0) {
      role = 'Admin';
    }
  } catch {
    role = 'Admin';
  }

  const inserted = await supabaseRequest('/rest/v1/profiles', {
    method: 'POST',
    service: true,
    body: [{
      id: user.id,
      email: user.email || null,
      role,
      active: true,
    }],
    prefer: 'return=representation',
  });

  const created = Array.isArray(inserted) ? inserted[0] : inserted;
  return formatUserForClient(created || { id: user.id, email: user.email, role, active: true });
}

export async function getUserFromSession(req, res) {
  const cookies = parseCookies(req);
  let accessToken = cookies.tic_access_token || '';
  const refreshToken = cookies.tic_refresh_token || '';

  if (!accessToken && !refreshToken) {
    return null;
  }

  try {
    try {
      return await supabaseRequest('/auth/v1/user', { accessToken });
    } catch {
      if (!refreshToken) return null;

      const refreshed = await supabaseRequest('/auth/v1/token?grant_type=refresh_token', {
        method: 'POST',
        body: { refresh_token: refreshToken },
      });

      setSessionCookies(res, refreshed);
      accessToken = refreshed?.access_token || accessToken;
      return refreshed?.user || await supabaseRequest('/auth/v1/user', { accessToken });
    }
  } catch {
    clearSessionCookies(res);
    return null;
  }
}

export async function getProfileFromSession(req, res) {
  const authUser = await getUserFromSession(req, res);
  if (!authUser) return null;

  const user = await ensureProfileForUser(authUser);
  if (user?.active === false) {
    clearSessionCookies(res);
    return null;
  }

  return user;
}

export async function requireRole(req, res, allowedRoles = []) {
  const user = await getProfileFromSession(req, res);

  if (!user) {
    json(res, 401, { error: 'Authentication required.' });
    return null;
  }

  if (Array.isArray(allowedRoles) && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    json(res, 403, { error: 'You do not have permission for this action.' });
    return null;
  }

  return user;
}

export function formatRoomForClient(row = {}) {
  return {
    id: row.room_id,
    roomId: row.room_id,
    building: row.building,
    buildingCode: row.building_code,
    floor: row.floor,
    roomNo: row.room_no,
    roomType: row.room_type,
    ac: row.ac,
    attached: row.attached,
    roomActive: row.room_active,
    totalBeds: row.total_beds,
    usedBeds: row.used_beds,
    availableBeds: row.available_beds,
  };
}

export function toRoomRow(payload = {}) {
  const totalBeds = Number.parseInt(payload.totalBeds, 10) || 1;
  const usedBeds = Number.parseInt(payload.usedBeds, 10) || 0;

  return {
    room_id: payload.id || payload.roomId || payload.roomNo,
    building: payload.building || null,
    building_code: payload.buildingCode || null,
    floor: payload.floor || null,
    room_no: payload.roomNo || payload.id || null,
    room_type: payload.roomType || 'Internal',
    ac: Boolean(payload.ac),
    attached: Boolean(payload.attached),
    room_active: payload.roomActive || 'Yes',
    total_beds: totalBeds,
    used_beds: usedBeds,
    available_beds: Math.max(0, Number.parseInt(payload.availableBeds, 10) || (totalBeds - usedBeds)),
  };
}

export function formatOccupantForClient(row = {}) {
  return {
    id: row.id,
    personType: row.person_type,
    staffId: row.staff_id,
    name: row.full_name,
    section: row.section,
    department: row.department,
    nationality: row.nationality,
    roomId: row.room_id,
    bedNo: row.bed_no,
    fasting: row.fasting,
    checkIn: row.check_in,
    checkOut: row.check_out,
    status: row.status,
    building: row.building,
    buildingCode: row.building_code,
  };
}

export function toOccupancyRow(payload = {}) {
  return {
    person_type: payload.personType || 'Permanent',
    staff_id: payload.staffId || null,
    full_name: payload.name || null,
    section: payload.section || null,
    department: payload.department || null,
    nationality: payload.nationality || null,
    room_id: payload.roomId || null,
    bed_no: Number.parseInt(payload.bedNo, 10) || null,
    fasting: Boolean(payload.fasting),
    check_in: payload.checkIn || null,
    check_out: payload.checkOut || null,
    status: payload.status || 'Active',
    building: payload.building || null,
    building_code: payload.buildingCode || null,
  };
}

export function formatStayHistoryForClient(row = {}) {
  const details = row.details && typeof row.details === 'object' ? row.details : {};

  return {
    id: row.id,
    type: row.action || 'Edit',
    name: row.occupant_name || details.name || '',
    roomId: row.room_id || details.roomId || '',
    bedNo: details.bedNo ?? null,
    details: details.details || details.message || details.text || '',
    timestamp: row.created_at,
    user: details.user || '',
  };
}

export function toStayHistoryRow(payload = {}) {
  return {
    action: payload.type || 'Edit',
    occupant_name: payload.name || null,
    room_id: payload.roomId || null,
    details: {
      bedNo: payload.bedNo ?? null,
      details: payload.details || '',
      user: payload.user || null,
    },
  };
}
