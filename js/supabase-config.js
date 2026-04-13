/**
 * Configuration Supabase — Navette Express Espace Chauffeur
 * Connexion backend Supabase — Schéma unifié JAEBETS HOLDING
 * W2K-Digital 2025
 */

const SUPABASE_URL = 'https://ilycnutphhmuvaonkrsa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlseWNudXRwaGhtdXZhb25rcnNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MjY5NDcsImV4cCI6MjA5MDEwMjk0N30.80ipBwMVvAkC2f0Oz2Wzl8E6GjMwlLCoE72XbePtmnM';

let supabase = null;

function initSupabase() {
    if (typeof window.supabase !== 'undefined') {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('[Supabase] Client chauffeur initialisé');
        return true;
    }
    console.warn('[Supabase] SDK non chargé');
    return false;
}

// ─── AUTHENTIFICATION ────────────────────────────────────────────────

/**
 * Connexion chauffeur (email + mot de passe via Supabase Auth)
 * L'Admin crée le compte chauffeur depuis le panneau Admin ou Supabase Dashboard
 */
async function loginChauffeur(email, password) {
    if (!supabase) initSupabase();

    try {
        // Connexion directe via table users (email + password_hash)
        const { data: userRows, error: userErr } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .eq('password_hash', password)
            .eq('role', 'driver');

        if (userErr || !userRows || userRows.length === 0) {
            throw new Error('Identifiants incorrects');
        }

        const userRow = userRows[0];

        // Récupérer l'entrée dans drivers
        const { data: driverRow, error: driverErr } = await supabase
            .from('drivers')
            .select('*, vehicle:vehicles(plate_number, model, brand, capacity, type)')
            .eq('user_id', userRow.id)
            .single();

        const driverData = driverErr ? null : driverRow;

        const session = {
            id: userRow.id,
            driver_id: driverData?.id || null,
            auth_id: data.user.id,
            prenom: userRow.full_name.split(' ')[0],
            nom: userRow.full_name.split(' ').slice(1).join(' '),
            full_name: userRow.full_name,
            email: userRow.email,
            phone: userRow.phone,
            vehicle_id: driverData?.vehicle_id || null,
            vehicle: driverData?.vehicle || null,
            employee_id: driverData?.employee_id || null,
            loginTime: new Date().toISOString()
        };

        localStorage.setItem('chauffeur_session', JSON.stringify(session));
        localStorage.setItem('chauffeur_logged_in', 'true');

        return { success: true, chauffeur: session };
    } catch (error) {
        console.error('[Auth] Erreur connexion chauffeur:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Déconnexion
 */
async function logoutChauffeur() {
    if (!supabase) initSupabase();
    await supabase.auth.signOut();
    localStorage.removeItem('chauffeur_session');
    localStorage.removeItem('chauffeur_logged_in');
    window.location.href = '/connexion.html';
}

function getSession() {
    try {
        const s = localStorage.getItem('chauffeur_session');
        return s ? JSON.parse(s) : null;
    } catch { return null; }
}

function isLoggedIn() {
    return localStorage.getItem('chauffeur_logged_in') === 'true';
}

// ─── TRAJETS ─────────────────────────────────────────────────────────

/**
 * Récupérer les trajets du jour pour le chauffeur connecté
 */
async function getTrajetsJour(chauffeurId) {
    if (!supabase) return { success: false, data: [] };

    try {
        const today = new Date().toISOString().split('T')[0];
        // chauffeurId ici = drivers.id
        const { data, error } = await supabase
            .from('trips')
            .select(`
                *,
                ligne:lines(id, name, origin, destination, stops, departure_time, return_time),
                bus:vehicles(id, plate_number, model, brand, capacity)
            `)
            .eq('driver_id', chauffeurId)
            .eq('trip_date', today)
            .order('departure_time', { ascending: true });

        if (error) throw error;

        // Mapper vers les noms attendus par l'app.js chauffeur
        const mapped = (data || []).map(t => ({
            ...t,
            heure_depart: t.departure_time,
            heure_arrivee: t.arrival_time,
            date: t.trip_date,
            statut: t.status,
            nom_ligne: t.ligne?.name,
            depart: t.ligne?.origin,
            destination_ligne: t.ligne?.destination,
            immatriculation: t.bus?.plate_number,
            arrets: t.ligne?.stops
        }));

        return { success: true, data: mapped };
    } catch (error) {
        console.error('[Trajets] Erreur:', error.message);
        return { success: false, data: [], error: error.message };
    }
}

/**
 * Récupérer la liste des passagers d'un trajet
 */
async function getPassagers(trajetId) {
    if (!supabase) return { success: false, data: [] };

    try {
        const { data, error } = await supabase
            .from('reservations')
            .select(`
                *,
                passager:users(id, full_name, phone, avatar_url)
            `)
            .eq('trip_id', trajetId)
            .order('seat_number', { ascending: true });

        if (error) throw error;

        const mapped = (data || []).map(r => ({
            ...r,
            siege: r.seat_number,
            statut_embarquement: r.boarding_status,
            heure_embarquement: r.boarding_time,
            nom: r.passager?.full_name,
            telephone: r.passager?.phone
        }));

        return { success: true, data: mapped };
    } catch (error) {
        console.error('[Passagers] Erreur:', error.message);
        return { success: false, data: [], error: error.message };
    }
}

/**
 * Mettre à jour le statut d'embarquement d'un passager
 * statut : 'boarded' | 'absent' | 'waiting'
 */
async function updateEmbarquement(reservationId, statut) {
    if (!supabase) return { success: false };

    // Mapper les anciens statuts vers les nouveaux
    const statusMap = { embarque: 'boarded', absent: 'absent', attente: 'waiting' };
    const newStatus = statusMap[statut] || statut;

    try {
        const { data, error } = await supabase
            .from('reservations')
            .update({
                boarding_status: newStatus,
                boarding_time: newStatus === 'boarded' ? new Date().toISOString() : null
            })
            .eq('id', reservationId)
            .select()
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('[Embarquement] Erreur:', error.message);
        return { success: false, error: error.message };
    }
}

// ─── PLANNING ────────────────────────────────────────────────────────

/**
 * Récupérer le planning hebdomadaire
 */
async function getPlanningHebdo(chauffeurId) {
    if (!supabase) return { success: false, data: [] };

    try {
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay() + 1);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);

        const { data, error } = await supabase
            .from('trips')
            .select(`
                *,
                ligne:lines(id, name, origin, destination, departure_time),
                bus:vehicles(id, plate_number, model, type)
            `)
            .eq('driver_id', chauffeurId)
            .gte('trip_date', startOfWeek.toISOString().split('T')[0])
            .lte('trip_date', endOfWeek.toISOString().split('T')[0])
            .order('trip_date', { ascending: true })
            .order('departure_time', { ascending: true });

        if (error) throw error;

        const mapped = (data || []).map(t => ({
            ...t,
            date: t.trip_date,
            heure_depart: t.departure_time,
            nom_ligne: t.ligne?.name,
            depart: t.ligne?.origin,
            destination_ligne: t.ligne?.destination,
            immatriculation: t.bus?.plate_number,
            type_bus: t.bus?.type
        }));

        return { success: true, data: mapped };
    } catch (error) {
        console.error('[Planning] Erreur:', error.message);
        return { success: false, data: [], error: error.message };
    }
}

// ─── VÉHICULE ────────────────────────────────────────────────────────

/**
 * Récupérer les informations du bus assigné
 */
async function getInfoBus(busId) {
    if (!supabase) return { success: false, data: null };

    try {
        const { data, error } = await supabase
            .from('vehicles')
            .select('*')
            .eq('id', busId)
            .single();

        if (error) throw error;

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

// ─── INCIDENTS ───────────────────────────────────────────────────────

/**
 * Signaler un incident
 */
async function signalerIncident(incident) {
    if (!supabase) return { success: false };

    try {
        const session = getSession();
        const { data, error } = await supabase
            .from('incidents')
            .insert({
                driver_id: session?.driver_id,
                trip_id: incident.trajetId || null,
                type: incident.type,
                description: incident.description,
                photo_url: incident.photoUrl || null,
                location: incident.localisation || null,
                status: 'new',
                reported_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('[Incident] Erreur:', error.message);
        return { success: false, error: error.message };
    }
}

// ─── NOTIFICATIONS ───────────────────────────────────────────────────

/**
 * Récupérer les notifications du chauffeur
 */
async function getNotifications(chauffeurId) {
    if (!supabase) return { success: false, data: [] };

    try {
        const session = getSession();
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .or(`target_audience.eq.all,target_audience.eq.drivers,target_user_id.eq.${session?.id}`)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;

        const mapped = (data || []).map(n => ({
            ...n,
            lue: n.is_read,
            date_creation: n.created_at
        }));

        return { success: true, data: mapped };
    } catch (error) {
        console.error('[Notifications] Erreur:', error.message);
        return { success: false, data: [], error: error.message };
    }
}

/**
 * Marquer une notification comme lue
 */
async function markNotificationRead(notificationId) {
    if (!supabase) return { success: false };

    try {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notificationId);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('[Notification] Erreur marquage:', error.message);
        return { success: false, error: error.message };
    }
}

// ─── PROFIL ──────────────────────────────────────────────────────────

/**
 * Récupérer le profil complet du chauffeur
 */
async function getProfilChauffeur(chauffeurId) {
    if (!supabase) return { success: false, data: null };

    try {
        const { data, error } = await supabase
            .from('drivers')
            .select(`
                *,
                user:users(full_name, phone, email, avatar_url),
                vehicle:vehicles(plate_number, model, brand, capacity, type)
            `)
            .eq('id', chauffeurId)
            .single();

        if (error) throw error;

        return {
            success: true,
            data: {
                ...data,
                nom: data.user?.full_name,
                telephone: data.user?.phone,
                email: data.user?.email,
                photo: data.user?.avatar_url,
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

// ─── GPS ─────────────────────────────────────────────────────────────

/**
 * Envoyer la position GPS du chauffeur
 */
async function sendPosition(vehicleId, tripId, lat, lng, speed = 0) {
    if (!supabase) return { success: false };

    try {
        // Désactiver les anciennes positions de ce véhicule
        await supabase
            .from('vehicle_positions')
            .update({ is_active: false })
            .eq('vehicle_id', vehicleId);

        const { error } = await supabase
            .from('vehicle_positions')
            .insert({
                vehicle_id: vehicleId,
                trip_id: tripId,
                latitude: lat,
                longitude: lng,
                speed: speed,
                is_active: true,
                recorded_at: new Date().toISOString()
            });

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('[GPS] Erreur envoi position:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Mettre à jour le statut d'un trajet
 */
async function updateTripStatus(tripId, status) {
    if (!supabase) return { success: false };

    try {
        const { data, error } = await supabase
            .from('trips')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', tripId)
            .select()
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('[Trip] Erreur mise à jour statut:', error.message);
        return { success: false, error: error.message };
    }
}

// ─── INITIALISATION AUTO ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
    initSupabase();
});

// Export global
window.NavetteAPI = {
    init: initSupabase,
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
