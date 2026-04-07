/**
 * Configuration Supabase - Navette Express Espace Chauffeur
 * Connexion backend Supabase
 * W2K-Digital 2025
 */

// Configuration Supabase - JAEBETS HOLDING
const SUPABASE_CONFIG = {
  url: 'https://ilycnutphhmuvaonkrsa.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlseWNudXRwaGhtdXZhb25rcnNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MjY5NDcsImV4cCI6MjA5MDEwMjk0N30.80ipBwMVvAkC2f0Oz2Wzl8E6GjMwlLCoE72XbePtmnM'
};

// Instance Supabase (initialisée après chargement SDK)
let supabase = null;

/**
 * Initialisation de Supabase
 * Appeler après chargement du SDK Supabase
 */
function initSupabase() {
  if (typeof window.supabase !== 'undefined') {
    supabase = window.supabase.createClient(
      SUPABASE_CONFIG.url,
      SUPABASE_CONFIG.anonKey
    );
    console.log('[Supabase] Client initialisé');
    return true;
  }
  console.warn('[Supabase] SDK non chargé');
  return false;
}

/**
 * Authentification chauffeur
 * @param {string} employeeId - ID employé
 * @param {string} password - Mot de passe
 * @returns {Promise} Résultat authentification
 */
async function loginChauffeur(employeeId, password) {
  if (!supabase) {
    console.error('[Auth] Supabase non initialisé');
    return { success: false, error: 'Service non disponible' };
  }

  try {
    // Authentification via table chauffeurs
    const { data, error } = await supabase
      .from('chauffeurs')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('password_hash', password)
      .single();

    if (error) throw error;

    if (data) {
      // Stocker session localement
      localStorage.setItem('chauffeur_session', JSON.stringify({
        id: data.id,
        employeeId: data.employee_id,
        prenom: data.prenom,
        nom: data.nom,
        loginTime: new Date().toISOString()
      }));
      localStorage.setItem('chauffeur_logged_in', 'true');
      return { success: true, chauffeur: data };
    }

    return { success: false, error: 'Identifiants incorrects' };
  } catch (error) {
    console.error('[Auth] Erreur connexion:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Déconnexion chauffeur
 */
function logoutChauffeur() {
  localStorage.removeItem('chauffeur_session');
  localStorage.removeItem('chauffeur_logged_in');
  window.location.href = '/connexion.html';
}

/**
 * Vérifier session active
 * @returns {Object|null} Session chauffeur ou null
 */
function getSession() {
  const session = localStorage.getItem('chauffeur_session');
  if (session) {
    try {
      return JSON.parse(session);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Vérifier si connecté
 * @returns {boolean}
 */
function isLoggedIn() {
  return localStorage.getItem('chauffeur_logged_in') === 'true';
}

/**
 * Récupérer trajets du jour
 * @param {string} chauffeurId - ID du chauffeur
 * @returns {Promise} Liste des trajets
 */
async function getTrajetsJour(chauffeurId) {
  if (!supabase) return { success: false, data: [] };

  try {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('trajets')
      .select('*')
      .eq('chauffeur_id', chauffeurId)
      .eq('date', today)
      .order('heure_depart', { ascending: true });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('[Trajets] Erreur récupération:', error);
    return { success: false, data: [], error: error.message };
  }
}

/**
 * Récupérer liste passagers d'un trajet
 * @param {string} trajetId - ID du trajet
 * @returns {Promise} Liste des passagers
 */
async function getPassagers(trajetId) {
  if (!supabase) return { success: false, data: [] };

  try {
    const { data, error } = await supabase
      .from('reservations')
      .select(`
        *,
        passager:passagers(nom, prenom, telephone)
      `)
      .eq('trajet_id', trajetId)
      .order('siege', { ascending: true });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('[Passagers] Erreur récupération:', error);
    return { success: false, data: [], error: error.message };
  }
}

/**
 * Mettre à jour statut embarquement passager
 * @param {string} reservationId - ID réservation
 * @param {string} statut - embarque / absent / attente
 * @returns {Promise} Résultat mise à jour
 */
async function updateEmbarquement(reservationId, statut) {
  if (!supabase) return { success: false };

  try {
    const { data, error } = await supabase
      .from('reservations')
      .update({ 
        statut_embarquement: statut,
        heure_embarquement: statut === 'embarque' ? new Date().toISOString() : null
      })
      .eq('id', reservationId);

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('[Embarquement] Erreur mise à jour:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Signaler un incident
 * @param {Object} incident - Données incident
 * @returns {Promise} Résultat envoi
 */
async function signalerIncident(incident) {
  if (!supabase) return { success: false };

  try {
    const session = getSession();
    const { data, error } = await supabase
      .from('incidents')
      .insert({
        chauffeur_id: session?.id,
        type: incident.type,
        description: incident.description,
        photo_url: incident.photoUrl || null,
        trajet_id: incident.trajetId || null,
        localisation: incident.localisation || null,
        date_signalement: new Date().toISOString(),
        statut: 'nouveau'
      });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('[Incident] Erreur signalement:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Récupérer planning hebdomadaire
 * @param {string} chauffeurId - ID du chauffeur
 * @returns {Promise} Planning de la semaine
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
      .from('trajets')
      .select(`
        *,
        bus:bus(immatriculation, type),
        ligne:lignes(nom, depart, destination)
      `)
      .eq('chauffeur_id', chauffeurId)
      .gte('date', startOfWeek.toISOString().split('T')[0])
      .lte('date', endOfWeek.toISOString().split('T')[0])
      .order('date', { ascending: true })
      .order('heure_depart', { ascending: true });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('[Planning] Erreur récupération:', error);
    return { success: false, data: [], error: error.message };
  }
}

/**
 * Récupérer informations bus assigné
 * @param {string} busId - ID du bus
 * @returns {Promise} Infos bus
 */
async function getInfoBus(busId) {
  if (!supabase) return { success: false, data: null };

  try {
    const { data, error } = await supabase
      .from('bus')
      .select('*')
      .eq('id', busId)
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('[Bus] Erreur récupération:', error);
    return { success: false, data: null, error: error.message };
  }
}

/**
 * Récupérer notifications chauffeur
 * @param {string} chauffeurId - ID du chauffeur
 * @returns {Promise} Liste notifications
 */
async function getNotifications(chauffeurId) {
  if (!supabase) return { success: false, data: [] };

  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('chauffeur_id', chauffeurId)
      .order('date_creation', { ascending: false })
      .limit(50);

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('[Notifications] Erreur récupération:', error);
    return { success: false, data: [], error: error.message };
  }
}

/**
 * Marquer notification comme lue
 * @param {string} notificationId - ID notification
 * @returns {Promise} Résultat
 */
async function markNotificationRead(notificationId) {
  if (!supabase) return { success: false };

  try {
    const { error } = await supabase
      .from('notifications')
      .update({ lue: true, date_lecture: new Date().toISOString() })
      .eq('id', notificationId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('[Notification] Erreur marquage:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Récupérer profil chauffeur
 * @param {string} chauffeurId - ID du chauffeur
 * @returns {Promise} Profil complet
 */
async function getProfilChauffeur(chauffeurId) {
  if (!supabase) return { success: false, data: null };

  try {
    const { data, error } = await supabase
      .from('chauffeurs')
      .select(`
        *,
        statistiques:chauffeur_stats(note_moyenne, trajets_effectues)
      `)
      .eq('id', chauffeurId)
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('[Profil] Erreur récupération:', error);
    return { success: false, data: null, error: error.message };
  }
}

// Export pour utilisation dans l'app
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
  getProfilChauffeur
};
