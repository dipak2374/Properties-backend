const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');

const hashPassword = (password) => {
  const salt = crypto.randomBytes(8).toString('hex');
  const hash = crypto.createHmac('sha256', salt).update(password).digest('hex');
  return `${salt}:${hash}`;
};

const verifyPassword = (password, storedHash) => {
  const [salt, expectedHash] = storedHash.split(':');
  const hash = crypto.createHmac('sha256', salt).update(password).digest('hex');
  return hash === expectedHash;
};

const createToken = (user) => Buffer.from(JSON.stringify({
  id: user._id?.toString?.() || user.id,
  email: user.email,
  name: user.name,
  role: user.role,
})).toString('base64');

const buildAuthPayload = (user) => ({
  message: 'Authentication successful.',
  user: {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    profilePicture: user.profilePicture,
  },
  token: createToken(user),
});

const sendAuthPopupResponse = (res, provider = 'google', payload, error) => {
  const safeError = String(error || '').replace(/['\\]/g, '\\$&');
  const type = `propertyhub-${provider}-auth`;
  const script = `window.opener?.postMessage({ type: '${type}', payload: ${payload ? JSON.stringify(payload) : 'undefined'}, error: ${error ? `'${safeError}'` : 'undefined'} }, '*'); window.close();`;
  return res.status(200).send(`<!doctype html><html><body><script>${script}</script></body></html>`);
};

const sendAuthRedirectResponse = (res, payload, error) => {
  const clientOrigin = process.env.CLIENT_ORIGIN || 'https://properties-frontend-delta.vercel.app';
  if (error) {
    return res.redirect(`${clientOrigin}/auth/callback?error=${encodeURIComponent(error)}`);
  }
  const token = encodeURIComponent(payload.token);
  const user = encodeURIComponent(JSON.stringify(payload.user));
  return res.redirect(`${clientOrigin}/auth/callback?token=${token}&user=${user}`);
};

const normalizeRole = (role) => {
  if (role === 'seller' || role === 'agent') return 'seller';
  if (role === 'user' || role === 'buyer') return 'user';
  return 'user';
};

module.exports.normalizeRole = normalizeRole;

// --- Facebook OAuth handlers ---
exports.startFacebookOAuth = (req, res) => {
  const clientId = process.env.FACEBOOK_CLIENT_ID;
  const redirectUri = process.env.FACEBOOK_REDIRECT_URI || 'http://localhost:5005/api/auth/facebook/callback';

  if (!clientId) {
    return sendAuthPopupResponse(res, 'facebook', null, 'Facebook OAuth is not configured.');
  }

  const authorizeUrl = new URL('https://www.facebook.com/v14.0/dialog/oauth');
  authorizeUrl.searchParams.set('client_id', clientId);
  authorizeUrl.searchParams.set('redirect_uri', redirectUri);
  authorizeUrl.searchParams.set('scope', 'email');
  authorizeUrl.searchParams.set('response_type', 'code');

  return res.redirect(authorizeUrl.toString());
};

exports.facebookCallback = async (req, res) => {
  const { code, error } = req.query || {};
  const clientId = process.env.FACEBOOK_CLIENT_ID;
  const clientSecret = process.env.FACEBOOK_CLIENT_SECRET;
  const redirectUri = process.env.FACEBOOK_REDIRECT_URI || 'http://localhost:5005/api/auth/facebook/callback';

  if (error) {
    return sendAuthPopupResponse(res, 'facebook', null, error);
  }

  if (!code || !clientId || !clientSecret) {
    return sendAuthPopupResponse(res, 'facebook', null, 'Facebook OAuth is not configured.');
  }

  try {
    const tokenResponse = await fetch(`https://graph.facebook.com/v14.0/oauth/access_token?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${encodeURIComponent(clientSecret)}&code=${encodeURIComponent(code)}`);
    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) {
      throw new Error(tokenData.error?.message || 'Unable to exchange Facebook code');
    }

    const profileRes = await fetch(`https://graph.facebook.com/me?fields=id,name,email&access_token=${encodeURIComponent(tokenData.access_token)}`);
    const profile = await profileRes.json();
    const email = String(profile.email || '').toLowerCase();

    let user = null;
    if (email) {
      user = await User.findOne({ email });
    }

    if (!user) {
      user = await User.create({
        name: profile.name || (email ? email.split('@')[0] : `fb-${profile.id}`),
        email: email || `fb-${profile.id}@noemail.local`,
        password: hashPassword(`${Date.now()}-${Math.random()}`),
        role: 'user',
      });
    }

    const authPayload = buildAuthPayload(user);
    return sendAuthPopupResponse(res, 'facebook', authPayload, null);
  } catch (err) {
    return sendAuthPopupResponse(res, 'facebook', null, err.message || String(err));
  }
};

// --- Apple OAuth implementation ---
const APPLE_AUTH_COOKIE_NAME = 'apple_auth_state';
const APPLE_AUTH_COOKIE_SECRET = process.env.APPLE_AUTH_COOKIE_SECRET || '';

const parseCookies = (cookieHeader = '') => {
  return cookieHeader.split(';').reduce((acc, part) => {
    const [key, value] = part.split('=').map((item) => item && item.trim());
    if (key && value !== undefined) {
      acc[key] = decodeURIComponent(value);
    }
    return acc;
  }, {});
};

const signPayload = (payload) => {
  if (!APPLE_AUTH_COOKIE_SECRET) return null;
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', APPLE_AUTH_COOKIE_SECRET).update(data).digest('base64url');
  return `${data}.${signature}`;
};

const verifySignedPayload = (value) => {
  if (!APPLE_AUTH_COOKIE_SECRET || !value) return null;
  const [data, signature] = String(value).split('.');
  if (!data || !signature) return null;
  const expected = crypto.createHmac('sha256', APPLE_AUTH_COOKIE_SECRET).update(data).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return null;
  }
  try {
    return JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
};

const setSignedCookie = (res, name, value, options = {}) => {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (options.maxAge) parts.push(`Max-Age=${Math.floor(options.maxAge / 1000)}`);
  if (options.httpOnly) parts.push('HttpOnly');
  if (options.secure) parts.push('Secure');
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  if (options.path) parts.push(`Path=${options.path}`);
  res.setHeader('Set-Cookie', parts.join('; '));
};

const clearCookie = (res, name) => {
  res.setHeader('Set-Cookie', `${name}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax`);
};

const getSignedAppleAuthState = (req) => {
  const cookies = parseCookies(req.headers.cookie || '');
  const signedValue = cookies[APPLE_AUTH_COOKIE_NAME];
  return verifySignedPayload(signedValue);
};

const generateCodeVerifier = () => crypto.randomBytes(32).toString('hex');

const buildCodeChallenge = (verifier) => {
  const hash = crypto.createHash('sha256').update(verifier).digest();
  return Buffer.from(hash).toString('base64url');
};

const buildAppleClientSecret = () => {
  const teamId = process.env.APPLE_TEAM_ID;
  const keyId = process.env.APPLE_KEY_ID;
  const clientId = process.env.APPLE_CLIENT_ID;
  const privateKey = process.env.APPLE_PRIVATE_KEY;

  if (!teamId || !keyId || !clientId || !privateKey) {
    return null;
  }

  const header = { alg: 'ES256', kid: keyId };
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: teamId,
    iat: now,
    exp: now + 15777000, // 6 months
    aud: 'https://appleid.apple.com',
    sub: clientId,
  };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedClaims = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const signingInput = `${encodedHeader}.${encodedClaims}`;

  const sign = crypto.createSign('SHA256');
  sign.update(signingInput);
  sign.end();

  const signature = sign.sign({ key: privateKey, dsaEncoding: 'ieee-p1363' });
  return `${signingInput}.${signature.toString('base64url')}`;
};

exports.startAppleOAuth = (req, res) => {
  const clientId = process.env.APPLE_CLIENT_ID;
  const redirectUri = process.env.APPLE_REDIRECT_URI || 'http://localhost:5005/api/auth/apple/callback';

  if (!clientId) {
    return sendAuthPopupResponse(res, 'apple', null, 'Apple OAuth is not configured. Missing APPLE_CLIENT_ID.');
  }

  if (!APPLE_AUTH_COOKIE_SECRET) {
    return sendAuthPopupResponse(res, 'apple', null, 'Apple OAuth is not configured. Missing APPLE_AUTH_COOKIE_SECRET.');
  }

  const state = crypto.randomBytes(16).toString('hex');
  const nonce = crypto.randomBytes(16).toString('hex');
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = buildCodeChallenge(codeVerifier);
  const cookiePayload = { state, nonce, codeVerifier, createdAt: Date.now() };
  const signedValue = signPayload(cookiePayload);

  if (!signedValue) {
    return sendAuthPopupResponse(res, 'apple', null, 'Unable to sign Apple auth cookie.');
  }

  setSignedCookie(res, APPLE_AUTH_COOKIE_NAME, signedValue, {
    maxAge: 10 * 60 * 1000,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    path: '/',
  });

  const authorizeUrl = new URL('https://appleid.apple.com/auth/authorize');
  authorizeUrl.searchParams.set('response_type', 'code id_token');
  authorizeUrl.searchParams.set('response_mode', 'form_post');
  authorizeUrl.searchParams.set('client_id', clientId);
  authorizeUrl.searchParams.set('redirect_uri', redirectUri);
  authorizeUrl.searchParams.set('scope', 'name email');
  authorizeUrl.searchParams.set('state', state);
  authorizeUrl.searchParams.set('nonce', nonce);
  authorizeUrl.searchParams.set('code_challenge', codeChallenge);
  authorizeUrl.searchParams.set('code_challenge_method', 'S256');

  return res.redirect(authorizeUrl.toString());
};

exports.appleCallback = async (req, res) => {
  const payload = req.body || req.query || {};
  const { code, state, error, id_token: idToken } = payload;
  const clientId = process.env.APPLE_CLIENT_ID;
  const redirectUri = process.env.APPLE_REDIRECT_URI || 'http://localhost:5005/api/auth/apple/callback';

  if (error) {
    clearCookie(res, APPLE_AUTH_COOKIE_NAME);
    return sendAuthPopupResponse(res, 'apple', null, String(error));
  }

  if (!code || !state || !clientId) {
    clearCookie(res, APPLE_AUTH_COOKIE_NAME);
    return sendAuthPopupResponse(res, 'apple', null, 'Apple OAuth is not configured correctly.');
  }

  const stored = getSignedAppleAuthState(req);
  if (!stored || stored.state !== state || Date.now() - stored.createdAt > 10 * 60 * 1000) {
    clearCookie(res, APPLE_AUTH_COOKIE_NAME);
    return sendAuthPopupResponse(res, 'apple', null, 'Apple OAuth state validation failed.');
  }

  clearCookie(res, APPLE_AUTH_COOKIE_NAME);

  const clientSecret = buildAppleClientSecret();
  if (!clientSecret) {
    return sendAuthPopupResponse(res, 'apple', null, 'Apple OAuth is missing team, key, or private key configuration.');
  }

  try {
    const tokenResponse = await fetch('https://appleid.apple.com/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
        code_verifier: stored.codeVerifier,
      }).toString(),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenData.id_token) {
      throw new Error(tokenData.error_description || tokenData.error || 'Unable to exchange code with Apple.');
    }

    const decoded = JSON.parse(Buffer.from(tokenData.id_token.split('.')[1], 'base64url').toString('utf8'));
    if (decoded.aud !== clientId || decoded.iss !== 'https://appleid.apple.com' || decoded.nonce !== stored.nonce) {
      throw new Error('Invalid Apple ID token.');
    }

    const email = String(decoded.email || '').toLowerCase();
    const name = email ? email.split('@')[0] : `apple-${decoded.sub}`;

    let user = null;
    if (decoded.sub) {
      user = await User.findOne({ appleId: decoded.sub });
    }

    if (!user && email) {
      user = await User.findOne({ email });
    }

    if (user && decoded.sub && !user.appleId) {
      user.appleId = decoded.sub;
      await user.save();
    }

    if (!user) {
      user = await User.create({
        name,
        email: email || `apple-${decoded.sub}@noemail.local`,
        appleId: decoded.sub,
        password: hashPassword(`${Date.now()}-${Math.random()}`),
        role: 'user',
      });
    }

    const authPayload = buildAuthPayload(user);
    return sendAuthPopupResponse(res, 'apple', authPayload, null);
  } catch (err) {
    return sendAuthPopupResponse(res, 'apple', null, err.message || String(err));
  }
};

const getGoogleOAuthClient = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return null;
  }

  return new OAuth2Client(clientId);
};

// Dynamically build the redirect URI from the current request host
const getRedirectUri = (req) => {
  if (process.env.GOOGLE_REDIRECT_URI) return process.env.GOOGLE_REDIRECT_URI;
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}/api/auth/google/callback`;
};

exports.startGoogleOAuth = async (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = getRedirectUri(req);
  const { role } = req.query || {};
  const targetRole = normalizeRole(role);

  if (!clientId) {
    try {
      let user = await User.findOne({ email: `google.demo.${targetRole}@propertyhub.com` });
      if (!user) {
        user = await User.create({
          name: `Google ${targetRole.charAt(0).toUpperCase() + targetRole.slice(1)} User`,
          email: `google.demo.${targetRole}@propertyhub.com`,
          password: hashPassword(`demo-${Date.now()}`),
          role: targetRole,
        });
      }
      const authPayload = buildAuthPayload(user);
      return sendAuthRedirectResponse(res, authPayload, null);
    } catch (err) {
      return sendAuthRedirectResponse(res, null, 'Google Sign-In failed.');
    }
  }

  const authorizeUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authorizeUrl.searchParams.set('client_id', clientId);
  authorizeUrl.searchParams.set('redirect_uri', redirectUri);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('scope', 'openid email profile');
  authorizeUrl.searchParams.set('access_type', 'offline');
  authorizeUrl.searchParams.set('prompt', 'select_account');
  authorizeUrl.searchParams.set('state', JSON.stringify({ role: targetRole }));

  return res.redirect(authorizeUrl.toString());
};

exports.googleCallback = async (req, res) => {
  const { code, error, state } = req.query || {};
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = getRedirectUri(req);

  if (error) {
    return sendAuthRedirectResponse(res, null, error);
  }

  if (!code || !clientId || !clientSecret) {
    return sendAuthRedirectResponse(res, null, 'Google OAuth is not configured. Using demo sign-in instead.');
  }

  try {
    const oauthClient = getGoogleOAuthClient();
    if (!oauthClient) {
      throw new Error('Google OAuth is not configured.');
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenData.id_token) {
      throw new Error(tokenData.error_description || 'Unable to exchange the Google authorization code.');
    }

    const ticket = await oauthClient.verifyIdToken({
      idToken: tokenData.id_token,
      audience: clientId,
    });

    const payload = ticket.getPayload();
    const email = String(payload.email || '').toLowerCase();
    let user = await User.findOne({ email });

    let targetRole = 'user';
    if (state) {
      try {
        const stateObj = JSON.parse(state);
        targetRole = normalizeRole(stateObj?.role);
      } catch (err) {
        // ignore
      }
    }

    if (!user) {
      user = await User.create({
        name: payload.name || payload.given_name || email.split('@')[0],
        email,
        password: hashPassword(`${Date.now()}-${Math.random()}`),
        role: targetRole,
      });
    }

    const authPayload = buildAuthPayload(user);
    return sendAuthRedirectResponse(res, authPayload, null);
  } catch (error) {
    return sendAuthRedirectResponse(res, null, error.message);
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body || {};

  try {
    const user = await User.findOne({ email: String(email || '').toLowerCase() });

    if (!user || !verifyPassword(password, user.password)) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    return res.json(buildAuthPayload(user));
  } catch (error) {
    return res.status(500).json({ message: 'Authentication failed.', error: error.message });
  }
};

exports.register = async (req, res) => {
  const { name, email, phone, password, role, profilePicture } = req.body || {};

  if (!name || !email || !phone || !password) {
    return res.status(400).json({ message: 'Name, email, phone, and password are required.' });
  }

  const normalizedPhone = String(phone).trim();
  if (!/^\d{10}$/.test(normalizedPhone)) {
    return res.status(400).json({ message: 'Phone number must be exactly 10 digits.' });
  }

  try {
    const existingUser = await User.findOne({ email: String(email).toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: 'An account with that email already exists.' });
    }

    const finalRole = normalizeRole(role);
    const uploadedProfilePicture = req.file ? `/uploads/profile-pictures/${req.file.filename}` : undefined;

    const user = await User.create({
      name,
      email: String(email).toLowerCase(),
      phone: normalizedPhone,
      password: hashPassword(password),
      role: finalRole,
      profilePicture: uploadedProfilePicture || (typeof profilePicture === 'string' ? profilePicture.trim() : undefined),
    });

    return res.status(201).json(buildAuthPayload(user));
  } catch (error) {
    return res.status(500).json({ message: 'Registration failed.', error: error.message });
  }
};
