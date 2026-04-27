/**
 * NAVETTE EXPRESS — API Bridge (remplace Supabase)
 * PWA Chauffeur — Toutes les fonctions appellent https://api.jaebets-holding.com
 * JAEBETS HOLDING — W2K-Digital 2025
 */

const API_BASE = 'https://api.jaebets-holding.com';

// Stub pour éviter les erreurs résiduelles
window.supabaseClient = null;

// ─── Helpers internes ─────────────────────────────────────────────────

function _getToken() {
  try {
    const s = localStorage.getItem('chauffeur_session');
    return s ? JSON.parse(s).token : null;
  } catch(e) { return null; }
}

async function _apiFetch(path, options = {}) {
  const token = _getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const res = await fetch(API_BASE + path, { ...options, headers });
  if (res.status === 401) {
    localStorage.removeItem('chauffeur_session');
    localStorage.removeItem('chauffeur_logged_in');
    window.location.href = 'connexion.html';
    return null;
  }
  return res.json();
}

function getSession() {
  try {
    const s = localStorage.getItem('chauffeur_session');
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}

function isLoggedIn() {
  return localStorage.getItem('chauffeur_logged_in') === 'true' && !!_getToken();
}

// ─── AUTHENTIFICATION ─────────────────────────────────────────────────

async function loginChauffeur(email, password) {
  try {
    const res = await fetch(API_BASE + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const json = await res.json();

    if (!json.success) {
      return { success: false, error: json.error?.message || 'Identifiants incorrects' };
    }

    const user = json.data.user;
    if (user.role !== 'driver') {
      return { success: false, error: 'Accès réservé aux chauffeurs.' };
    }

    const session = {
      token: json.data.token,
      id: user.id,
      driver_id: user.driver_id || null,
      prenom: (user.full_name || '').split(' ')[0],
      nom: (user.full_name || '').split(' ').slice(1).join(' '),
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      vehicle_id: user.vehicle_id || null,
      vehicle: user.vehicle || null,
      employee_id: user.employee_id || null,
      loginTime: new Date().toISOString()
    };

    localStorage.setItem('chauffeur_session', JSON.stringify(session));
    localStorage.setItem('chauffeur_logged_in', 'true');

    return { success: true, chauffeur: session };
  } catch (error) {
    console.error('[Auth] Erreur connexion chauffeur:', error.message);
    return { success: false, error: 'Impossible de contacter le serveur.' };
  }
}

async function logoutChauffeur() {
  localStorage.removeItem('chauffeur_session');
  localStorage.removeItem('chauffeur_logged_in');
  window.location.href = 'connexion.html';
}

// ─── TRAJETS ──────────────────────────────────────────────────────────

async function getTrajetsJour(chauffeurId) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const json = await _apiFetch('/api/trips?driver_id=' + chauffeurId + '&date=' + today);
    const list = json?.data || [];
    const mapped = list.map(t => ({
      ...t,
      heure_depart: t.departure_time,
      heure_arrivee: t.arrival_time,
      date: t.trip_date,
      statut: t.status,
      nom_ligne: t.line?.name || t.ligne?.name,
      depart: t.line?.origin || t.ligne?.origin,
      destination_ligne: t.line?.destination || t.ligne?.destination,
      immatriculation: t.vehicle?.plate_number || t.bus?.plate_number,
      arrets: t.line?.stops || t.ligne?.stops
    }));
    return { success: true, data: mapped };
  } catch (error) {
    console.error('[Trajets] Erreur:', error.message);
    return { success: false, data: [], error: error.message };
  }
}

async function getPassagers(trajetId) {
  try {
    const json = await _apiFetch('/api/trips/' + trajetId + '/passengers');
    const list = json?.data || [];
    const mapped = list.map(r => ({
      ...r,
      siege: r.seat_number,
      statut_embarquement: r.boarding_status,
      heure_embarquement: r.boarding_time,
      nom: r.user?.full_name || r.passager?.full_name,
      telephone: r.user?.phone || r.passager?.phone
    }));
    return { success: true, data: mapped };
  } catch (error) {
    console.error('[Passagers] Erreur:', error.message);
    return { success: false, data: [], error: error.message };
  }
}

async function updateEmbarquement(reservationId, statut) {
  try {
    const statusMap = { embarque: 'boarded', absent: 'absent', attente: 'waiting' };
    const newStatus = statusMap[statut] || statut;
    const json = await _apiFetch('/api/reservations/' + reservationId + '/boarding', {
      method: 'PUT',
      body: JSON.stringify({ boarding_status: newStatus })
    });
    if (!json?.success) throw new Error(json?.error?.message || 'Erreur');
    return { success: true, data: json.data };
  } catch (error) {
    console.error('[Embarquement] Erreur:', error.message);
    return { success: false, error: error.message };
  }
}

// ─── PLANNING ─────────────────────────────────────────────────────────

async function getPlanningHebdo(chauffeurId) {
  try {
    const json = await _apiFetch('/api/trips?driver_id=' + chauffeurId + '&period=week');
    const list = json?.data || [];
    const mapped = list.map(t => ({
      ...t,
      date: t.trip_date,
      heure_depart: t.departure_time,
      nom_ligne: t.line?.name || t.ligne?.name,
      depart: t.line?.origin || t.ligne?.origin,
      destination_ligne: t.line?.destination || t.ligne?.destination,
      immatriculation: t.vehicle?.plate_number || t.bus?.plate_number,
      type_bus: t.vehicle?.type || t.bus?.type
    }));
    return { success: true, data: mapped };
  } catch (error) {
    console.error('[Planning] Erreur:', error.message);
    return { success: false, data: [], error: error.message };
  }
}

// ─── VÉHICULE ─────────────────────────────────────────────────────────

async function getInfoBus(busId) {
  try {
    const json = await _apiFetch('/api/vehicles/' + busId);
    const data = json?.data || null;
    if (!data) return { success: false, data: null };
    return {
      success: true,
      data: {
        ...data,
        immatriculation: data.plate_number,
        marque: data.brand,
        modele: data.model,
        capacite: data.capacity
      }
    };
  } catch (error) {
    console.error('[Bus] Erreur:', error.message);
    return { success: false, data: null, error: error.message };
  }
}

// ─── INCIDENTS ────────────────────────────────────────────────────────

async function signalerIncident(incident) {
  try {
    const session = getSession();
    const json = await _apiFetch('/api/incidents', {
      method: 'POST',
      body: JSON.stringify({
        driver_id: session?.driver_id,
        trip_id: incident.trajetId || null,
        type: incident.type,
        description: incident.description,
        photo_url: incident.photoUrl || null,
        location: incident.localisation || null
      })
    });
    if (!json?.success) throw new Error(json?.error?.message || 'Erreur');
    return { success: true, data: json.data };
  } catch (error) {
    console.error('[Incident] Erreur:', error.message);
    return { success: false, error: error.message };
  }
}

// ─── NOTIFICATIONS ────────────────────────────────────────────────────

async function getNotifications() {
  try {
    const json = await _apiFetch('/api/notifications?limit=50');
    const list = json?.data || [];
    const mapped = list.map(n => ({ ...n, lue: n.is_read, date_creation: n.created_at }));
    return { success: true, data: mapped };
  } catch (error) {
    console.error('[Notifications] Erreur:', error.message);
    return { success: false, data: [], error: error.message };
  }
}

async function markNotificationRead(notificationId) {
  try {
    await _apiFetch('/api/notifications/' + notificationId + '/read', { method: 'PUT' });
    return { success: true };
  } catch (error) {
    console.error('[Notification] Erreur marquage:', error.message);
    return { success: false, error: error.message };
  }
}

// ─── PROFIL ───────────────────────────────────────────────────────────

async function getProfilChauffeur(chauffeurId) {
  try {
    const json = await _apiFetch('/api/drivers/' + chauffeurId);
    const data = json?.data || null;
    if (!data) return { success: false, data: null };
    return {
      success: true,
      data: {
        ...data,
        nom: data.user?.full_name || data.full_name,
        telephone: data.user?.phone || data.phone,
        email: data.user?.email || data.email,
        photo: data.user?.avatar_url || data.avatar_url,
        note_moyenne: data.rating,
        trajets_effectues: data.total_trips,
        immatriculation: data.vehicle?.plate_number,
        type_bus: data.vehicle?.type
      }
    };
  } catch (error) {
    console.error('[Profil] Erreur:', error.message);
    return { success: false, data: null, error: error.message };
  }
}

// ─── GPS ──────────────────────────────────────────────────────────────

async function sendPosition(vehicleId, tripId, lat, lng, speed = 0) {
  try {
    const json = await _apiFetch('/api/tracking/position', {
      method: 'POST',
      body: JSON.stringify({ vehicle_id: vehicleId, trip_id: tripId, latitude: lat, longitude: lng, speed })
    });
    if (!json?.success) throw new Error(json?.error?.message || 'Erreur');
    return { success: true };
  } catch (error) {
    console.error('[GPS] Erreur envoi position:', error.message);
    return { success: false, error: error.message };
  }
}

async function updateTripStatus(tripId, status) {
  try {
    const json = await _apiFetch('/api/trips/' + tripId + '/status', {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
    if (!json?.success) throw new Error(json?.error?.message || 'Erreur');
    return { success: true, data: json.data };
  } catch (error) {
    console.error('[Trip] Erreur mise à jour statut:', error.message);
    return { success: false, error: error.message };
  }
}

// ─── EXPORT GLOBAL ────────────────────────────────────────────────────
window.NavetteAPI = {
  init: () => true,
  login: loginChauffeur,
  logout: logoutChauffeur,
  getSession,
  isLoggedIn,
  getTrajetsJour,
  getPassagers,
  updateEmbarquement,
  signalerIncident,
  getPlanningHebdo,
  getInfoBus,
  getNotifications,
  markNotificationRead,
  getProfilChauffeur,
  sendPosition,
  updateTripStatus
};
