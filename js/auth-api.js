/**
 * NAVETTE EXPRESS — Auth Bridge API
 * PWA Chauffeur — Remplace la simulation par l'API backend
 * JAEBETS HOLDING
 */
(function () {
  'use strict';

  const API_BASE = 'https://api.jaebets-holding.com';
  const SESSION_KEY = 'chauffeur_session';
  const TOKEN_KEY = 'navette_chauffeur_token';

  function saveSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      id: user.id,
      employeeId: user.email,
      prenom: user.full_name ? user.full_name.split(' ')[0] : '',
      nom: user.full_name ? user.full_name.split(' ').slice(1).join(' ') : '',
      email: user.email,
      role: user.role,
      loginTime: new Date().toISOString()
    }));
    localStorage.setItem('navette_chauffeur_user', JSON.stringify(user));
  }

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem('navette_chauffeur_user');
  }

  function checkAuth() {
    const page = window.location.pathname.split('/').pop() || 'index.html';
    const publicPages = ['connexion.html', 'index.html', 'erreur.html', ''];
    if (publicPages.includes(page)) return;
    if (!getToken()) window.location.href = 'connexion.html';
  }

  function showToast(msg, type = 'error') {
    if (window.showToast) { window.showToast(msg, type); return; }
    alert(msg);
  }

  function hookLoginForm() {
    const form = document.querySelector('.form-connexion');
    if (!form) return;

    // Remplacer le label "ID employé" par "Email"
    const idLabel = document.querySelector('label[for="employee-id"]');
    const idInput = document.getElementById('employee-id');
    if (idLabel) {
      idLabel.innerHTML = idLabel.innerHTML.replace('ID employé', 'Email');
    }
    if (idInput) {
      idInput.type = 'email';
      idInput.placeholder = 'Votre adresse email';
      idInput.name = 'email';
      idInput.inputMode = 'email';
      idInput.autocomplete = 'email';
    }

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      e.stopImmediatePropagation();

      const emailVal = idInput ? idInput.value.trim() : '';
      const passwordInput = document.getElementById('password');
      const password = passwordInput ? passwordInput.value : '';
      const btn = form.querySelector('button[type="submit"], .btn-connexion');

      if (!emailVal || !password) {
        showToast('Veuillez remplir tous les champs.', 'error');
        return;
      }

      if (btn) { btn.classList.add('loading'); btn.disabled = true; }

      try {
        const res = await fetch(API_BASE + '/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailVal, password })
        });
        const data = await res.json();

        if (!data.success) {
          showToast(data.error?.message || 'Identifiants invalides', 'error');
          return;
        }

        const user = data.data.user;
        if (!['driver', 'super_admin', 'admin'].includes(user.role)) {
          showToast('Accès réservé aux chauffeurs.', 'error');
          return;
        }

        saveSession(data.data.token, user);
        showToast('Connexion réussie !', 'success');
        setTimeout(() => { window.location.href = 'accueil.html'; }, 600);

      } catch (err) {
        showToast('Impossible de contacter le serveur.', 'error');
      } finally {
        if (btn) { btn.classList.remove('loading'); btn.disabled = false; }
      }

    }, true);
  }

  window.NavetteAuth = {
    getToken,
    getUser() {
      try { return JSON.parse(localStorage.getItem('navette_chauffeur_user')); } catch(e) { return null; }
    },
    isLoggedIn: () => !!getToken(),
    logout() { clearSession(); window.location.href = 'connexion.html'; },
    async apiFetch(path, options = {}) {
      const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
      const t = getToken();
      if (t) headers['Authorization'] = 'Bearer ' + t;
      const res = await fetch(API_BASE + path, { ...options, headers });
      if (res.status === 401) { this.logout(); return null; }
      return res.json();
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    checkAuth();
    hookLoginForm();
  });

})();
