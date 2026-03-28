/*
 * Configuration FineoPay - Navette Express
 * Intégration paiement Mobile Money et CB
 * W2K-Digital 2025
 * 
 * PLACEHOLDER : Les clés API seront fournies ultérieurement
 */

const FINEOPAY_CONFIG = {
  /* Clés API FineoPay - À REMPLACER */
  publicKey: 'VOTRE_CLE_PUBLIQUE_FINEOPAY',
  merchantId: 'VOTRE_MERCHANT_ID',
  
  /* Environnement */
  environment: 'sandbox', /* 'sandbox' ou 'production' */
  
  /* URLs de callback */
  callbackUrl: 'https://passagers.jaebets-holding.com/paiement-callback',
  returnUrl: 'https://passagers.jaebets-holding.com/paiement-succes',
  cancelUrl: 'https://passagers.jaebets-holding.com/paiement-annule',
  
  /* Devise */
  currency: 'XOF', /* Franc CFA UEMOA */
  
  /* Méthodes de paiement disponibles */
  paymentMethods: {
    orangeMoney: {
      enabled: true,
      code: 'ORANGE_MONEY_CI',
      name: 'Orange Money',
      icon: 'orange-money'
    },
    mtnMoney: {
      enabled: true,
      code: 'MTN_MONEY_CI',
      name: 'MTN Mobile Money',
      icon: 'mtn-money'
    },
    moovMoney: {
      enabled: true,
      code: 'MOOV_MONEY_CI',
      name: 'Moov Money',
      icon: 'moov-money'
    },
    card: {
      enabled: true,
      code: 'CARD',
      name: 'Carte Bancaire',
      icon: 'card'
    }
  }
};

/* État du paiement en cours */
let currentPayment = {
  transactionId: null,
  amount: 0,
  method: null,
  status: 'pending'
};

/* Initialisation de FineoPay */
function initFineoPay() {
  console.log('[FineoPay] Initialisation...');
  /* Placeholder - Charger le SDK FineoPay */
  return true;
}

/* Module de paiement */
const FineoPay = {
  /* Initier un paiement */
  async initiatePayment(paymentData) {
    try {
      console.log('[FineoPay] Initiation paiement:', paymentData);
      
      /* Validation des données */
      if (!paymentData.amount || paymentData.amount < 100) {
        throw new Error('Montant invalide (minimum 100 FCFA)');
      }
      
      if (!paymentData.method) {
        throw new Error('Méthode de paiement requise');
      }
      
      /* Générer un ID de transaction unique */
      const transactionId = 'NE-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
      
      currentPayment = {
        transactionId: transactionId,
        amount: paymentData.amount,
        method: paymentData.method,
        description: paymentData.description || 'Paiement Navette Express',
        status: 'initiated'
      };
      
      /* Placeholder - Appel API FineoPay */
      /* 
      const response = await fetch('https://api.fineopay.com/v1/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${FINEOPAY_CONFIG.publicKey}`
        },
        body: JSON.stringify({
          merchant_id: FINEOPAY_CONFIG.merchantId,
          amount: paymentData.amount,
          currency: FINEOPAY_CONFIG.currency,
          payment_method: FINEOPAY_CONFIG.paymentMethods[paymentData.method].code,
          description: paymentData.description,
          callback_url: FINEOPAY_CONFIG.callbackUrl,
          return_url: FINEOPAY_CONFIG.returnUrl,
          cancel_url: FINEOPAY_CONFIG.cancelUrl,
          metadata: paymentData.metadata
        })
      });
      
      const result = await response.json();
      */
      
      /* Simulation pour le placeholder */
      const result = {
        success: true,
        transactionId: transactionId,
        paymentUrl: '#paiement-simulation',
        status: 'pending'
      };
      
      return {
        success: true,
        data: result
      };
      
    } catch (error) {
      console.error('[FineoPay] Erreur initiation:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  /* Vérifier le statut d'un paiement */
  async checkPaymentStatus(transactionId) {
    try {
      console.log('[FineoPay] Vérification statut:', transactionId);
      
      /* Placeholder - Appel API FineoPay */
      /*
      const response = await fetch(`https://api.fineopay.com/v1/payments/${transactionId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${FINEOPAY_CONFIG.publicKey}`
        }
      });
      
      const result = await response.json();
      */
      
      /* Simulation pour le placeholder */
      const result = {
        success: true,
        transactionId: transactionId,
        status: 'completed', /* pending, completed, failed, cancelled */
        amount: currentPayment.amount,
        paidAt: new Date().toISOString()
      };
      
      return {
        success: true,
        data: result
      };
      
    } catch (error) {
      console.error('[FineoPay] Erreur vérification:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  /* Afficher le modal de paiement */
  showPaymentModal(paymentMethod) {
    const modal = document.getElementById('payment-modal');
    const methodInfo = FINEOPAY_CONFIG.paymentMethods[paymentMethod];
    
    if (!modal || !methodInfo) {
      console.error('[FineoPay] Modal ou méthode non trouvée');
      return;
    }
    
    /* Mettre à jour le contenu du modal selon la méthode */
    const modalTitle = modal.querySelector('.modal-title');
    const modalContent = modal.querySelector('.modal-content');
    
    if (paymentMethod === 'orangeMoney' || paymentMethod === 'mtnMoney' || paymentMethod === 'moovMoney') {
      modalContent.innerHTML = `
        <div class="payment-method-info">
          <p>Vous allez recevoir une notification sur votre téléphone pour confirmer le paiement.</p>
          <div class="form-group">
            <label for="phone-number">Numéro de téléphone</label>
            <input type="tel" id="phone-number" placeholder="07 XX XX XX XX" class="form-input">
          </div>
          <button class="btn btn-primary btn-block" onclick="FineoPay.processPayment('${paymentMethod}')">
            Payer ${formatCurrency(currentPayment.amount)} FCFA
          </button>
        </div>
      `;
    } else if (paymentMethod === 'card') {
      modalContent.innerHTML = `
        <div class="payment-method-info">
          <p>Paiement sécurisé par carte bancaire via FineoPay.</p>
          <div class="form-group">
            <label for="card-number">Numéro de carte</label>
            <input type="text" id="card-number" placeholder="XXXX XXXX XXXX XXXX" class="form-input">
          </div>
          <div class="form-row">
            <div class="form-group half">
              <label for="card-expiry">Expiration</label>
              <input type="text" id="card-expiry" placeholder="MM/AA" class="form-input">
            </div>
            <div class="form-group half">
              <label for="card-cvv">CVV</label>
              <input type="text" id="card-cvv" placeholder="XXX" class="form-input">
            </div>
          </div>
          <button class="btn btn-primary btn-block" onclick="FineoPay.processPayment('${paymentMethod}')">
            Payer ${formatCurrency(currentPayment.amount)} FCFA
          </button>
        </div>
      `;
    }
    
    modal.classList.add('active');
  },
  
  /* Traiter le paiement */
  async processPayment(paymentMethod) {
    const submitBtn = document.querySelector('#payment-modal .btn-primary');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner"></span> Traitement...';
    }
    
    /* Simulation délai traitement */
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    /* Simuler un paiement réussi */
    currentPayment.status = 'completed';
    
    /* Fermer le modal */
    const modal = document.getElementById('payment-modal');
    if (modal) {
      modal.classList.remove('active');
    }
    
    /* Afficher confirmation */
    showPaymentSuccess();
    
    return {
      success: true,
      transactionId: currentPayment.transactionId
    };
  },
  
  /* Annuler un paiement */
  async cancelPayment(transactionId) {
    currentPayment.status = 'cancelled';
    console.log('[FineoPay] Paiement annulé:', transactionId);
    return { success: true };
  },
  
  /* Obtenir l'état actuel */
  getCurrentPayment() {
    return currentPayment;
  }
};

/* Formater le montant en FCFA */
function formatCurrency(amount) {
  return new Intl.NumberFormat('fr-FR').format(amount);
}

/* Afficher succès paiement */
function showPaymentSuccess() {
  const successDiv = document.createElement('div');
  successDiv.className = 'payment-success-overlay';
  successDiv.innerHTML = `
    <div class="payment-success-content">
      <svg class="success-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <path d="M8 12l3 3 5-6"/>
      </svg>
      <h3>Paiement reçu</h3>
      <p>Votre réservation est confirmée.</p>
      <p class="amount">${formatCurrency(currentPayment.amount)} FCFA</p>
      <button class="btn btn-primary" onclick="this.parentElement.parentElement.remove(); navigateTo('accueil.html');">
        Retour à l'accueil
      </button>
    </div>
  `;
  document.body.appendChild(successDiv);
}

/* Export pour utilisation globale */
window.FINEOPAY_CONFIG = FINEOPAY_CONFIG;
window.initFineoPay = initFineoPay;
window.FineoPay = FineoPay;
window.formatCurrency = formatCurrency;
