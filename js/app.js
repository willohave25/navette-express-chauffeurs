/**
 * Application Navette Express - Espace Chauffeur
 * Navigation, interactions et transitions
 * W2K-Digital 2025
 */

(function() {
  'use strict';

  // Configuration de l'application
  const APP_CONFIG = {
    urgencePhone: '+22507032853 59',
    urgencePhoneClean: 'tel:+2250703285359',
    transitionDuration: 300,
    toastDuration: 3000,
    splashDuration: 2500
  };

  // État de l'application
  const appState = {
    currentPage: '',
    isOnline: navigator.onLine,
    swRegistration: null
  };

  /**
   * Initialisation de l'application
   */
  function initApp() {
    // Déterminer la page actuelle
    appState.currentPage = getCurrentPage();

    // Enregistrer le Service Worker
    registerServiceWorker();

    // Initialiser la navigation
    initNavigation();

    // Initialiser le bouton urgence
    initUrgenceButton();

    // Gérer le statut réseau
    initNetworkStatus();

    // Initialiser les interactions spécifiques à la page
    initPageInteractions();

    // Gérer le retour arrière navigateur
    initBackButton();

    console.log('[App] Initialisée - Page:', appState.currentPage);
  }

  /**
   * Récupérer le nom de la page actuelle
   */
  function getCurrentPage() {
    const path = window.location.pathname;
    const filename = path.substring(path.lastIndexOf('/') + 1);
    return filename.replace('.html', '') || 'splash';
  }

  /**
   * Enregistrement du Service Worker
   */
  async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        appState.swRegistration = registration;
        console.log('[SW] Enregistré avec succès');

        // Vérifier les mises à jour
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              showToast('Mise à jour disponible. Actualiser pour appliquer.', 'info');
            }
          });
        });
      } catch (error) {
        console.error('[SW] Erreur enregistrement:', error);
      }
    }
  }

  /**
   * Initialisation de la navigation bottom
   */
  function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const currentPage = appState.currentPage;

    navItems.forEach(item => {
      // Marquer l'élément actif
      const href = item.getAttribute('href');
      if (href && href.includes(currentPage)) {
        item.classList.add('active');
      }

      // Ajouter effet ripple au clic
      item.addEventListener('click', function(e) {
        // Effet visuel
        createRipple(this, e);
        
        // Retirer classe active des autres
        navItems.forEach(nav => nav.classList.remove('active'));
        this.classList.add('active');
      });
    });
  }

  /**
   * Créer effet ripple sur élément
   */
  function createRipple(element, event) {
    const ripple = document.createElement('span');
    ripple.classList.add('ripple-effect');
    
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (event.clientX - rect.left - size / 2) + 'px';
    ripple.style.top = (event.clientY - rect.top - size / 2) + 'px';
    
    element.appendChild(ripple);
    
    setTimeout(() => ripple.remove(), 600);
  }

  /**
   * Initialiser le bouton d'urgence flottant
   */
  function initUrgenceButton() {
    const urgenceBtn = document.querySelector('.btn-urgence-float');
    
    if (urgenceBtn) {
      urgenceBtn.addEventListener('click', function(e) {
        e.preventDefault();
        
        // Confirmation avant appel
        if (confirm('Appeler le numéro d\'urgence ?\n' + APP_CONFIG.urgencePhone)) {
          window.location.href = APP_CONFIG.urgencePhoneClean;
        }
      });
    }
  }

  /**
   * Gérer le statut réseau online/offline
   */
  function initNetworkStatus() {
    function updateOnlineStatus() {
      appState.isOnline = navigator.onLine;
      document.body.classList.toggle('offline', !appState.isOnline);
      
      if (!appState.isOnline) {
        showToast('Connexion perdue. Mode hors ligne activé.', 'warning');
      } else {
        showToast('Connexion rétablie.', 'success');
      }
    }

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // État initial
    if (!navigator.onLine) {
      document.body.classList.add('offline');
    }
  }

  /**
   * Initialiser le bouton retour
   */
  function initBackButton() {
    const backBtns = document.querySelectorAll('.btn-back, [data-back]');
    
    backBtns.forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        
        const target = this.getAttribute('data-back');
        if (target) {
          navigateTo(target);
        } else {
          window.history.back();
        }
      });
    });
  }

  /**
   * Navigation avec transition
   */
  function navigateTo(url) {
    document.body.classList.add('page-exit');
    
    setTimeout(() => {
      window.location.href = url;
    }, APP_CONFIG.transitionDuration);
  }

  /**
   * Initialiser les interactions spécifiques à chaque page
   */
  function initPageInteractions() {
    switch (appState.currentPage) {
      case 'splash':
        initSplashPage();
        break;
      case 'connexion':
        initConnexionPage();
        break;
      case 'accueil':
        initAccueilPage();
        break;
      case 'itineraire':
        initItinerairePage();
        break;
      case 'passagers':
        initPassagersPage();
        break;
      case 'embarquement':
        initEmbarquementPage();
        break;
      case 'incident':
        initIncidentPage();
        break;
      case 'planning':
        initPlanningPage();
        break;
      case 'info-bus':
        initInfoBusPage();
        break;
      case 'notifications':
        initNotificationsPage();
        break;
      case 'profil':
        initProfilPage();
        break;
    }
  }

  /**
   * Page Splash - Redirection automatique
   */
  function initSplashPage() {
    setTimeout(() => {
      // Vérifier si session existe
      const session = localStorage.getItem('chauffeur_session');
      const destination = session ? '/accueil.html' : '/connexion.html';
      navigateTo(destination);
    }, APP_CONFIG.splashDuration);
  }

  /**
   * Page Connexion - Formulaire login
   */
  function initConnexionPage() {
    const form = document.querySelector('.form-connexion');
    const btnSubmit = document.querySelector('.btn-connexion');
    const inputId = document.querySelector('#employee-id');
    const inputPassword = document.querySelector('#password');
    const togglePassword = document.querySelector('.toggle-password');

    // Toggle visibilité mot de passe
    if (togglePassword) {
      togglePassword.addEventListener('click', function() {
        const type = inputPassword.type === 'password' ? 'text' : 'password';
        inputPassword.type = type;
        this.classList.toggle('visible');
      });
    }

    // Soumission formulaire
    if (form) {
      form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const employeeId = inputId.value.trim();
        const password = inputPassword.value;

        if (!employeeId || !password) {
          showToast('Veuillez remplir tous les champs.', 'error');
          return;
        }

        // Afficher loader
        btnSubmit.classList.add('loading');
        btnSubmit.disabled = true;

        // Simulation connexion (remplacer par appel API)
        setTimeout(() => {
          // Simuler session
          localStorage.setItem('chauffeur_session', JSON.stringify({
            id: '1',
            employeeId: employeeId,
            prenom: 'Kouassi',
            nom: 'Jean',
            loginTime: new Date().toISOString()
          }));

          showToast('Connexion réussie !', 'success');
          
          setTimeout(() => {
            navigateTo('/accueil.html');
          }, 500);
        }, 1500);
      });
    }
  }

  /**
   * Page Accueil - Dashboard
   */
  function initAccueilPage() {
    const btnDemarrer = document.querySelector('.btn-demarrer-trajet');
    
    // Charger nom chauffeur
    const session = JSON.parse(localStorage.getItem('chauffeur_session') || '{}');
    const welcomeElement = document.querySelector('.welcome-name');
    if (welcomeElement && session.prenom) {
      welcomeElement.textContent = session.prenom;
    }

    // Bouton démarrer trajet
    if (btnDemarrer) {
      btnDemarrer.addEventListener('click', function() {
        // Animation feedback
        this.classList.add('pressed');
        
        setTimeout(() => {
          navigateTo('/itineraire.html');
        }, 200);
      });
    }

    // Rafraîchir données (pull to refresh simulé)
    initPullToRefresh(() => {
      showToast('Données actualisées', 'success');
    });
  }

  /**
   * Page Itinéraire - Navigation trajet
   */
  function initItinerairePage() {
    const arrets = document.querySelectorAll('.arret-item');
    
    arrets.forEach((arret, index) => {
      arret.addEventListener('click', function() {
        // Marquer comme passé
        this.classList.toggle('passed');
        
        // Mettre à jour progression
        updateProgressBar(index + 1, arrets.length);
      });
    });
  }

  /**
   * Page Passagers - Liste et actions
   */
  function initPassagersPage() {
    const searchInput = document.querySelector('.search-passager');
    const passagersList = document.querySelectorAll('.passager-item');
    const btnConfirmerTous = document.querySelector('.btn-confirmer-tous');

    // Recherche passager
    if (searchInput) {
      searchInput.addEventListener('input', function() {
        const query = this.value.toLowerCase();
        
        passagersList.forEach(item => {
          const nom = item.querySelector('.passager-nom').textContent.toLowerCase();
          item.style.display = nom.includes(query) ? 'flex' : 'none';
        });
      });
    }

    // Confirmer tous les passagers
    if (btnConfirmerTous) {
      btnConfirmerTous.addEventListener('click', function() {
        if (confirm('Confirmer l\'embarquement de tous les passagers ?')) {
          passagersList.forEach(item => {
            item.classList.remove('attente', 'absent');
            item.classList.add('embarque');
          });
          showToast('Tous les passagers confirmés !', 'success');
        }
      });
    }

    // Clic sur passager individuel
    passagersList.forEach(item => {
      item.addEventListener('click', function() {
        const passagerId = this.dataset.id;
        navigateTo('/embarquement.html?id=' + passagerId);
      });
    });
  }

  /**
   * Page Embarquement - Confirmation individuelle
   */
  function initEmbarquementPage() {
    const btnConfirmer = document.querySelector('.btn-confirmer');
    const btnScanner = document.querySelector('.btn-scanner');
    const btnAbsent = document.querySelector('.btn-absent');

    if (btnConfirmer) {
      btnConfirmer.addEventListener('click', function() {
        this.classList.add('loading');
        
        setTimeout(() => {
          showToast('Embarquement confirmé !', 'success');
          setTimeout(() => navigateTo('/passagers.html'), 500);
        }, 800);
      });
    }

    if (btnScanner) {
      btnScanner.addEventListener('click', function() {
        // Ouvrir scanner QR (à implémenter avec bibliothèque)
        showToast('Scanner QR en développement', 'info');
      });
    }

    if (btnAbsent) {
      btnAbsent.addEventListener('click', function() {
        if (confirm('Marquer ce passager comme absent ?')) {
          showToast('Passager marqué absent', 'warning');
          setTimeout(() => navigateTo('/passagers.html'), 500);
        }
      });
    }
  }

  /**
   * Page Incident - Signalement
   */
  function initIncidentPage() {
    const typeButtons = document.querySelectorAll('.incident-type-btn');
    const form = document.querySelector('.form-incident');
    const photoInput = document.querySelector('.photo-input');
    const photoPreview = document.querySelector('.photo-preview');
    let selectedType = null;

    // Sélection type incident
    typeButtons.forEach(btn => {
      btn.addEventListener('click', function() {
        typeButtons.forEach(b => b.classList.remove('selected'));
        this.classList.add('selected');
        selectedType = this.dataset.type;
      });
    });

    // Prévisualisation photo
    if (photoInput) {
      photoInput.addEventListener('change', function() {
        const file = this.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = function(e) {
            photoPreview.innerHTML = `<img src="${e.target.result}" alt="Photo incident">`;
            photoPreview.classList.add('has-image');
          };
          reader.readAsDataURL(file);
        }
      });
    }

    // Soumission formulaire
    if (form) {
      form.addEventListener('submit', function(e) {
        e.preventDefault();

        if (!selectedType) {
          showToast('Veuillez sélectionner un type d\'incident', 'error');
          return;
        }

        const description = document.querySelector('.incident-description').value;
        const btnSubmit = form.querySelector('.btn-envoyer');
        
        btnSubmit.classList.add('loading');
        btnSubmit.disabled = true;

        // Simulation envoi
        setTimeout(() => {
          showToast('Signalement envoyé avec succès !', 'success');
          setTimeout(() => navigateTo('/accueil.html'), 1000);
        }, 1500);
      });
    }
  }

  /**
   * Page Planning - Vue hebdomadaire
   */
  function initPlanningPage() {
    const jourItems = document.querySelectorAll('.jour-planning');
    const btnSwap = document.querySelector('.btn-demande-swap');

    // Sélection jour
    jourItems.forEach(item => {
      item.addEventListener('click', function() {
        jourItems.forEach(j => j.classList.remove('selected'));
        this.classList.add('selected');
      });
    });

    // Demande de swap
    if (btnSwap) {
      btnSwap.addEventListener('click', function() {
        showToast('Demande de swap envoyée à l\'administrateur', 'info');
      });
    }
  }

  /**
   * Page Info Bus - Détails véhicule
   */
  function initInfoBusPage() {
    const btnSignaler = document.querySelector('.btn-signaler-probleme');

    if (btnSignaler) {
      btnSignaler.addEventListener('click', function() {
        navigateTo('/incident.html?type=bus');
      });
    }
  }

  /**
   * Page Notifications - Liste
   */
  function initNotificationsPage() {
    const notifItems = document.querySelectorAll('.notification-item');

    notifItems.forEach(item => {
      item.addEventListener('click', function() {
        // Marquer comme lue
        this.classList.add('read');
        
        // Action selon type
        const type = this.dataset.type;
        switch(type) {
          case 'assignation':
            navigateTo('/planning.html');
            break;
          case 'passager':
            navigateTo('/passagers.html');
            break;
          case 'maintenance':
            navigateTo('/info-bus.html');
            break;
        }
      });
    });
  }

  /**
   * Page Profil - Informations chauffeur
   */
  function initProfilPage() {
    const btnDeconnexion = document.querySelector('.btn-deconnexion');
    const btnContact = document.querySelector('.btn-contact-admin');

    // Charger données profil
    const session = JSON.parse(localStorage.getItem('chauffeur_session') || '{}');
    if (session.prenom && session.nom) {
      const nomElement = document.querySelector('.profil-nom');
      if (nomElement) {
        nomElement.textContent = session.prenom + ' ' + session.nom;
      }
    }

    // Déconnexion
    if (btnDeconnexion) {
      btnDeconnexion.addEventListener('click', function() {
        if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
          localStorage.removeItem('chauffeur_session');
          showToast('Déconnexion réussie', 'success');
          setTimeout(() => navigateTo('/connexion.html'), 500);
        }
      });
    }

    // Contact admin
    if (btnContact) {
      btnContact.addEventListener('click', function() {
        window.location.href = APP_CONFIG.urgencePhoneClean;
      });
    }
  }

  /**
   * Afficher un toast notification
   */
  function showToast(message, type = 'info') {
    // Supprimer toast existant
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
      existingToast.remove();
    }

    // Créer nouveau toast
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span class="toast-message">${message}</span>
      <button class="toast-close" aria-label="Fermer">×</button>
    `;

    document.body.appendChild(toast);

    // Animation entrée
    setTimeout(() => toast.classList.add('show'), 10);

    // Fermeture automatique
    const autoClose = setTimeout(() => {
      closeToast(toast);
    }, APP_CONFIG.toastDuration);

    // Fermeture manuelle
    toast.querySelector('.toast-close').addEventListener('click', () => {
      clearTimeout(autoClose);
      closeToast(toast);
    });
  }

  /**
   * Fermer un toast
   */
  function closeToast(toast) {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }

  /**
   * Mettre à jour la barre de progression
   */
  function updateProgressBar(current, total) {
    const progressBar = document.querySelector('.progress-fill');
    if (progressBar) {
      const percentage = (current / total) * 100;
      progressBar.style.width = percentage + '%';
    }
  }

  /**
   * Pull to refresh (simulation)
   */
  function initPullToRefresh(callback) {
    let startY = 0;
    let pulling = false;

    document.addEventListener('touchstart', (e) => {
      if (window.scrollY === 0) {
        startY = e.touches[0].pageY;
        pulling = true;
      }
    });

    document.addEventListener('touchmove', (e) => {
      if (!pulling) return;
      
      const y = e.touches[0].pageY;
      const diff = y - startY;
      
      if (diff > 100) {
        document.body.classList.add('refreshing');
      }
    });

    document.addEventListener('touchend', () => {
      if (document.body.classList.contains('refreshing')) {
        document.body.classList.remove('refreshing');
        if (callback) callback();
      }
      pulling = false;
    });
  }

  /**
   * Format heure (HH:MM)
   */
  function formatTime(date) {
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Format date (JJ/MM/AAAA)
   */
  function formatDate(date) {
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  // Exposer fonctions utilitaires
  window.NavetteApp = {
    showToast,
    navigateTo,
    formatTime,
    formatDate,
    getSession: () => JSON.parse(localStorage.getItem('chauffeur_session') || 'null')
  };

  // Initialiser au chargement DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

})();
