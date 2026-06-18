/**
 * SmartBuild Estimator - JavaScript Application Controller
 * Handles Routing, Cost Estimation logic, Form Submissions, and WhatsApp redirect
 */

// Global state variables
let currentEstimate = null;
let isAuthChecked = false;
let auth, db;

document.addEventListener('DOMContentLoaded', () => {
  initRouter();
  initMobileMenu();
  initEstimator();
  initQuotesForm();
  initContactForm();
  initNewsletter();
  initAuth(); // Initialize auth system
});

// ==========================================
// 0. Firebase Initialization & Configuration
// ==========================================

// TODO: Replace this configuration object with your actual Firebase Web App config from Firebase Console:
// Go to Project Settings -> General -> Scroll down to 'Your apps' -> Select Config option.
const firebaseConfig = {
  apiKey: "AIzaSyChumgmpzb7T9kXo3C6HaqopKrbsmc-IKo",
  authDomain: "smartbuild-estimator-33aeb.firebaseapp.com",
  projectId: "smartbuild-estimator-33aeb",
  storageBucket: "smartbuild-estimator-33aeb.firebasestorage.app",
  messagingSenderId: "48516029568",
  appId: "1:48516029568:web:a9d2f11b3cf1c6ee0f1a65"
};

try {
  firebase.initializeApp(firebaseConfig);
  auth = firebase.auth();
  db = firebase.firestore();
} catch (error) {
  console.error("Firebase initialization failed. Make sure your firebaseConfig contains valid keys.", error);
}

// ==========================================
// 1. Client-Side SPA Routing
// ==========================================

const routes = {
  '': 'page-home',
  '/': 'page-home',
  '/estimator': 'page-estimator',
  '/quotes': 'page-quotes',
  '/about': 'page-about',
  '/contact': 'page-contact',
  '/privacy': 'page-privacy',
  '/terms': 'page-terms',
  '/login': 'page-login',
  '/signup': 'page-signup',
  '/forgot-password': 'page-forgot-password',
  '/dashboard': 'page-dashboard'
};

let runRouter = () => {};

function initRouter() {
  const handleRoute = () => {
    const hash = window.location.hash || '#/';
    const routePath = hash.replace(/^#/, '');
    
    // Protect Dashboard: Only authenticated & verified users can access dashboard
    if (routePath === '/dashboard') {
      if (isAuthChecked) {
        const user = auth.currentUser;
        if (!user || !user.emailVerified) {
          window.location.hash = '#/login';
          showToast('Please log in and verify your email to access the dashboard.');
          return;
        }
      } else {
        return; // Wait for auth state check
      }
    }
    
    // Redirect if logged in & verified and trying to go to login/signup/forgot
    if (isAuthChecked && auth.currentUser && auth.currentUser.emailVerified) {
      if (routePath === '/login' || routePath === '/signup' || routePath === '/forgot-password') {
        window.location.hash = '#/dashboard';
        return;
      }
    }
    
    // Find matching page section
    const targetPageId = routes[routePath] || 'page-home';
    
    // Toggle active section
    document.querySelectorAll('.page-section').forEach(section => {
      if (section.id === targetPageId) {
        section.classList.remove('hidden');
      } else {
        section.classList.add('hidden');
      }
    });

    // Update active nav links
    document.querySelectorAll('nav a').forEach(link => {
      const href = link.getAttribute('href');
      if (href === hash || (hash === '#/' && href === '#/')) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  runRouter = handleRoute;

  // Listen to hash changes and initial load
  window.addEventListener('hashchange', handleRoute);
  window.addEventListener('load', handleRoute);
}

// ==========================================
// 2. Mobile Menu Interactions
// ==========================================

function initMobileMenu() {
  const menuToggle = document.getElementById('menu-toggle-btn');
  const navMenu = document.getElementById('nav-menu');
  const navLinks = document.querySelectorAll('nav a');

  menuToggle.addEventListener('click', () => {
    navMenu.classList.toggle('active');
    const icon = menuToggle.querySelector('i');
    if (navMenu.classList.contains('active')) {
      icon.className = 'fa-solid fa-xmark';
    } else {
      icon.className = 'fa-solid fa-bars';
    }
  });

  // Close menu when clicking nav link
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      navMenu.classList.remove('active');
      menuToggle.querySelector('i').className = 'fa-solid fa-bars';
    });
  });
}

// ==========================================
// 3. Construction Budget Estimator Logic
// ==========================================

function initEstimator() {
  const form = document.getElementById('estimator-form');
  const specCards = document.querySelectorAll('.spec-selector-card');
  const toQuotesBtn = document.getElementById('btn-results-to-quotes');
  
  if (!form) return;

  // Interactivity: Spec Card Clicking
  specCards.forEach(card => {
    card.addEventListener('click', (e) => {
      // Prevent double trigger if clicking label/input directly
      if (e.target.type === 'radio') return;
      
      const radio = card.querySelector('input[type="radio"]');
      if (radio) {
        radio.checked = true;
        
        // Trigger active visual state
        specCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        
        // Recalculate cost automatically on selection change
        calculateBudget();
      }
    });
  });

  // Calculate automatically when typing/selecting inputs
  const inputsToTrigger = ['est-state', 'est-district', 'est-plot-size', 'est-construction-area', 'est-floors'];
  inputsToTrigger.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', calculateBudget);
      el.addEventListener('change', calculateBudget);
    }
  });

  // Monitor Radio checks directly
  document.querySelectorAll('input[name="construction-type"]').forEach(radio => {
    radio.addEventListener('change', () => {
      specCards.forEach(c => c.classList.remove('active'));
      const activeCard = document.getElementById(`card-${radio.value.toLowerCase()}`);
      if (activeCard) activeCard.classList.add('active');
      calculateBudget();
    });
  });

  // Form submit (performs final calculation and scroll review)
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    calculateBudget();
    
    // Smooth scroll to results box on mobile screens
    const resultsBox = document.getElementById('estimator-results-box');
    if (window.innerWidth < 1024 && resultsBox) {
      resultsBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    showToast('Estimate updated successfully!');
  });

  // Redirect to Quotes and pre-fill data
  if (toQuotesBtn) {
    toQuotesBtn.addEventListener('click', () => {
      const state = document.getElementById('est-state').value;
      const district = document.getElementById('est-district').value;
      const plotSize = document.getElementById('est-plot-size').value;
      const constArea = document.getElementById('est-construction-area').value;
      const floors = document.getElementById('est-floors').value;
      const activeRadio = document.querySelector('input[name="construction-type"]:checked');
      const specType = activeRadio ? activeRadio.value : 'Standard';

      // Pre-fill fields on the Quotes form
      document.getElementById('quote-district').value = district;
      document.getElementById('quote-plot-size').value = plotSize;
      document.getElementById('quote-location').value = `${district}, ${state}`;
      
      // Select budget range on quotes page based on calculated standard cost
      const calcResult = performCalculation(constArea, floors, specType);
      const avgLakhs = (calcResult.min + calcResult.max) / 200000;
      
      const budgetSelect = document.getElementById('quote-budget');
      if (budgetSelect) {
        if (avgLakhs < 20) {
          budgetSelect.value = 'Under ₹20L';
        } else if (avgLakhs >= 20 && avgLakhs <= 30) {
          budgetSelect.value = '₹20L – ₹30L';
        } else if (avgLakhs > 30 && avgLakhs <= 50) {
          budgetSelect.value = '₹30L – ₹50L';
        } else {
          budgetSelect.value = '₹50L+';
        }
      }

      // Add default specifications description
      const reqText = document.getElementById('quote-requirements');
      if (reqText) {
        reqText.value = `I want to construct a ${floors} floor residential house with a total area of ${constArea} sq.ft using ${specType} quality specifications. Please connect me with verified builders.`;
      }

      // Navigate to Quotes
      window.location.hash = '#/quotes';
    });
  }

  // Set initial default calculation
  calculateBudget();
}

/**
 * Perform math calculations for budget ranges
 */
function performCalculation(area, floors, selectedType) {
  // Multipliers based on number of floors (Foundation + structural sharing indexes)
  let floorFactor = 1.0;
  if (parseInt(floors) === 1) floorFactor = 0.95;
  if (parseInt(floors) === 2) floorFactor = 1.00; // Default G+1 Benchmark
  if (parseInt(floors) === 3) floorFactor = 1.08;
  if (parseInt(floors) === 4) floorFactor = 1.15;

  // Rate parameters per sqft
  const rates = {
    Basic: { min: 1200, max: 1466.67 },
    Standard: { min: 1466.67, max: 1866.67 },
    Premium: { min: 1866.67, max: 2666.67 }
  };

  // Base Calculation
  const basicMin = area * rates.Basic.min * floorFactor;
  const basicMax = area * rates.Basic.max * floorFactor;
  
  const standardMin = area * rates.Standard.min * floorFactor;
  const standardMax = area * rates.Standard.max * floorFactor;
  
  const premiumMin = area * rates.Premium.min * floorFactor;
  const premiumMax = area * rates.Premium.max * floorFactor;

  return {
    Basic: { min: basicMin, max: basicMax },
    Standard: { min: standardMin, max: standardMax },
    Premium: { min: premiumMin, max: premiumMax },
    
    // Quick reference for selected active tier
    min: rates[selectedType].min * area * floorFactor,
    max: rates[selectedType].max * area * floorFactor
  };
}

/**
 * Update DOM results and diagrams
 */
function calculateBudget() {
  const areaInput = document.getElementById('est-construction-area');
  const floorsInput = document.getElementById('est-floors');
  const districtInput = document.getElementById('est-district');
  const stateInput = document.getElementById('est-state');
  
  if (!areaInput) return;

  const area = parseFloat(areaInput.value) || 1500;
  const floors = parseInt(floorsInput.value) || 2;
  const district = districtInput.value || 'Chennai';
  const state = stateInput.value || 'Tamil Nadu';
  
  const activeRadio = document.querySelector('input[name="construction-type"]:checked');
  const selectedType = activeRadio ? activeRadio.value : 'Standard';

  const results = performCalculation(area, floors, selectedType);

  // Helper formatting (Formats numbers in Lakhs)
  const formatLakhsStr = (val) => {
    const lakhs = val / 100000;
    return `₹${lakhs.toFixed(1)}L`;
  };

  // Update Summary Card Headers
  document.getElementById('res-disp-area').innerText = Number(area).toLocaleString('en-IN');
  document.getElementById('res-disp-loc').innerText = `${district}, ${state}`;

  // Update Tiers Display Texts
  const basicStr = `${formatLakhsStr(results.Basic.min)} – ${formatLakhsStr(results.Basic.max)}`;
  const standardStr = `${formatLakhsStr(results.Standard.min)} – ${formatLakhsStr(results.Standard.max)}`;
  const premiumStr = `${formatLakhsStr(results.Premium.min)} – ${formatLakhsStr(results.Premium.max)}`;

  document.getElementById('res-val-basic').innerText = basicStr;
  document.getElementById('res-val-standard').innerText = standardStr;
  document.getElementById('res-val-premium').innerText = premiumStr;

  // Sync Highlight Visual states on result cards
  const cardBasic = document.getElementById('res-tier-basic');
  const cardStandard = document.getElementById('res-tier-standard');
  const cardPremium = document.getElementById('res-tier-premium');
  
  cardBasic.classList.remove('highlight');
  cardStandard.classList.remove('highlight');
  cardPremium.classList.remove('highlight');

  // Change primary tag colors
  document.getElementById('res-val-basic').style.color = '';
  document.getElementById('res-val-standard').style.color = '';
  document.getElementById('res-val-premium').style.color = '';
  
  let targetMin, targetMax;

  if (selectedType === 'Basic') {
    cardBasic.classList.add('highlight');
    document.getElementById('res-val-basic').style.color = 'var(--accent)';
    targetMin = results.Basic.min;
    targetMax = results.Basic.max;
  } else if (selectedType === 'Standard') {
    cardStandard.classList.add('highlight');
    document.getElementById('res-val-standard').style.color = 'var(--accent)';
    targetMin = results.Standard.min;
    targetMax = results.Standard.max;
  } else {
    cardPremium.classList.add('highlight');
    document.getElementById('res-val-premium').style.color = 'var(--accent)';
    targetMin = results.Premium.min;
    targetMax = results.Premium.max;
  }

  // Update current active estimate for saving
  currentEstimate = {
    state,
    district,
    area,
    floors,
    quality: selectedType,
    minCost: targetMin,
    maxCost: targetMax,
    timestamp: Date.now()
  };

  // Update Breakdown calculations (Materials: 50%, Labor: 25%, Design: 12%, Approvals: 13%)
  const breakdownVals = {
    materials: { min: targetMin * 0.50, max: targetMax * 0.50 },
    labor: { min: targetMin * 0.25, max: targetMax * 0.25 },
    design: { min: targetMin * 0.12, max: targetMax * 0.12 },
    approvals: { min: targetMin * 0.13, max: targetMax * 0.13 }
  };

  document.getElementById('breakdown-val-materials').innerText = `${formatLakhsStr(breakdownVals.materials.min)} - ${formatLakhsStr(breakdownVals.materials.max)}`;
  document.getElementById('breakdown-val-labor').innerText = `${formatLakhsStr(breakdownVals.labor.min)} - ${formatLakhsStr(breakdownVals.labor.max)}`;
  document.getElementById('breakdown-val-design').innerText = `${formatLakhsStr(breakdownVals.design.min)} - ${formatLakhsStr(breakdownVals.design.max)}`;
  document.getElementById('breakdown-val-approvals').innerText = `${formatLakhsStr(breakdownVals.approvals.min)} - ${formatLakhsStr(breakdownVals.approvals.max)}`;

  // Also sync the Home Hero graphic dynamically
  const heroCostDisplay = document.getElementById('hero-dynamic-cost');
  if (heroCostDisplay) {
    heroCostDisplay.innerText = standardStr;
  }
}

// ==========================================
// 4. Request Builder Quotes Form Submission
// ==========================================

function initQuotesForm() {
  const form = document.getElementById('quotes-form');
  const modal = document.getElementById('success-modal');
  const closeModalBtn = document.getElementById('btn-close-modal');
  const summaryBox = document.getElementById('modal-summary-box');

  if (!form || !modal) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    // Fetch form input values
    const name = document.getElementById('quote-name').value;
    const mobile = document.getElementById('quote-mobile').value;
    const email = document.getElementById('quote-email').value;
    const district = document.getElementById('quote-district').value;
    const location = document.getElementById('quote-location').value;
    const budget = document.getElementById('quote-budget').value;
    const plotSize = document.getElementById('quote-plot-size').value;
    const requirements = document.getElementById('quote-requirements').value;
    const consentChecked = document.getElementById('quote-consent').checked;

    if (!consentChecked) {
      alert("Please accept the terms before proceeding.");
      return;
    }

    // Populate Modal Details Box
    if (summaryBox) {
      summaryBox.innerHTML = `
        <div class="confirm-row">
          <span class="confirm-label">Name:</span>
          <span class="confirm-val">${name}</span>
        </div>
        <div class="confirm-row">
          <span class="confirm-label">Mobile:</span>
          <span class="confirm-val">${mobile}</span>
        </div>
        <div class="confirm-row">
          <span class="confirm-label">District:</span>
          <span class="confirm-val">${district}</span>
        </div>
        <div class="confirm-row">
          <span class="confirm-label">Target Budget:</span>
          <span class="confirm-val">${budget}</span>
        </div>
        <div class="confirm-row">
          <span class="confirm-label">Plot Size:</span>
          <span class="confirm-val">${plotSize} sq.ft</span>
        </div>
      `;
    }

    // Show Success Modal
    modal.classList.add('active');

    // Reset Form
    form.reset();
  });

  // Close Modal Handler
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
      modal.classList.remove('active');
    });
  }

  // Close modal clicking backdrop
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('active');
    }
  });
}

// ==========================================
// 5. Contact Form & WhatsApp Integration
// ==========================================

function initContactForm() {
  const form = document.getElementById('contact-form');
  
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = document.getElementById('contact-name').value;
    const email = document.getElementById('contact-email').value;
    const message = document.getElementById('contact-message').value;

    // Format WhatsApp Text
    const textMsg = `Hello SmartBuild Estimator,

Name: ${name}

Email: ${email}

Message: ${message}

I would like more information regarding construction budget planning and builder consultation.`;

    // Target API Url
    const whatsappNum = '918838694603'; // India prefix +91
    const targetUrl = `https://wa.me/${whatsappNum}?text=${encodeURIComponent(textMsg)}`;

    // Open WhatsApp in a new tab (no iframe, strictly wa.me redirect)
    window.open(targetUrl, '_blank');

    showToast('Redirecting to WhatsApp...');
    form.reset();
  });
}

// ==========================================
// 6. Footer Newsletter
// ==========================================

function initNewsletter() {
  const form = document.getElementById('newsletter-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    showToast('Subscribed successfully! Thank you.');
    form.reset();
  });
}

// ==========================================
// 7. Toast Alerts System
// ==========================================

function showToast(message) {
  const toast = document.getElementById('app-toast');
  const toastMsg = document.getElementById('toast-message');

  if (!toast || !toastMsg) return;

  toastMsg.innerText = message;
  toast.classList.add('active');

  // Hide toast after 3 seconds
  setTimeout(() => {
    toast.classList.remove('active');
  }, 3000);
}

// ==========================================
// 8. Firebase Auth & Dashboard Integrations
// ==========================================

function initAuth() {
  initPasswordToggles();
  initAuthForms();
  initLogoutButtons();
  initSaveEstimateBtn();
  
  // Set up Auth state observer
  auth.onAuthStateChanged((user) => {
    isAuthChecked = true;
    updateAuthUI(user);
    
    // Redirect if authenticated and verified
    const hash = window.location.hash || '#/';
    const routePath = hash.replace(/^#/, '');
    
   if (routePath === '/dashboard') {
  if (!user || !user.emailVerified) {
    window.location.hash = '#/login';
    showToast('Please log in and verify your email to access the dashboard.');
  } else {
    runRouter();
  }
} else if (!user) {
  window.location.hash = '#/login';
} else if (user && user.emailVerified && (routePath === '/login' || routePath === '/signup' || routePath === '/forgot-password')) {
  window.location.hash = '#/dashboard';
} else {
  runRouter();
}
});
}
function initPasswordToggles() {
  const togglePass = (btnId, inputId) => {
    const btn = document.getElementById(btnId);
    const input = document.getElementById(inputId);
    if (!btn || !input) return;
    
    btn.addEventListener('click', () => {
      const icon = btn.querySelector('i');
      if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fa-regular fa-eye-slash';
      } else {
        input.type = 'password';
        icon.className = 'fa-regular fa-eye';
      }
    });
  };

  togglePass('toggle-login-pass', 'login-password');
  togglePass('toggle-signup-pass', 'signup-password');
  togglePass('toggle-signup-confirm', 'signup-confirm');
}

function initAuthForms() {
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  const forgotForm = document.getElementById('forgot-form');

  // Login Form Submission
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;

      showAuthLoader('btn-login-submit', true);

      // Real Firebase Auth Signin
      auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
          const user = userCredential.user;
          if (!user.emailVerified) {
            auth.signOut();
            showAuthMsg('login-msg', 'Please verify your email.', 'error');
          } else {
            showToast('Logged in successfully!');
            window.location.hash = '#/dashboard';
            loginForm.reset();
          }
        })
        .catch((error) => {
          let msg = 'Invalid email or password.';
          if (error.code === 'auth/invalid-email') {
            msg = 'Invalid email address.';
          } else if (error.code === 'auth/user-disabled') {
            msg = 'This account has been disabled.';
          }
          showAuthMsg('login-msg', msg, 'error');
        })
        .finally(() => {
          showAuthLoader('btn-login-submit', false, 'Log In', 'fa-solid fa-arrow-right-to-bracket');
        });
    });
  }

  // Signup Form Submission
  if (signupForm) {
    signupForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('signup-name').value.trim();
      const email = document.getElementById('signup-email').value.trim();
      const password = document.getElementById('signup-password').value;
      const confirm = document.getElementById('signup-confirm').value;

      if (password !== confirm) {
        showAuthMsg('signup-msg', 'Passwords do not match.', 'error');
        return;
      }

      showAuthLoader('btn-signup-submit', true);

      // Real Firebase Auth Signup
      auth.createUserWithEmailAndPassword(email, password)
        .then(async (userCredential) => {
          const user = userCredential.user;
          await user.updateProfile({ displayName: name });
          await user.sendEmailVerification();
          await auth.signOut();
          showAuthMsg('signup-msg', 'Registration successful! A verification email has been sent automatically. Please verify your email before logging in.', 'success');
          signupForm.reset();
        })
        .catch((error) => {
          let msg = error.message;
          if (error.code === 'auth/email-already-in-use') {
            msg = 'This email address is already in use.';
          } else if (error.code === 'auth/invalid-email') {
            msg = 'Invalid email address.';
          } else if (error.code === 'auth/weak-password') {
            msg = 'The password is too weak (minimum 6 characters).';
          }
          showAuthMsg('signup-msg', msg, 'error');
        })
        .finally(() => {
          showAuthLoader('btn-signup-submit', false, 'Create Account', 'fa-solid fa-user-plus');
        });
    });
  }

  // Forgot Password Form Submission
  if (forgotForm) {
    forgotForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('forgot-email').value.trim();

      showAuthLoader('btn-forgot-submit', true);

      auth.sendPasswordResetEmail(email)
        .then(() => {
          showAuthMsg('forgot-msg', 'Password reset email sent! Please check your inbox.', 'success');
          forgotForm.reset();
        })
        .catch((error) => {
          let msg = error.message;
          if (error.code === 'auth/user-not-found') {
            msg = 'No user found with this email address.';
          }
          showAuthMsg('forgot-msg', msg, 'error');
        })
        .finally(() => {
          showAuthLoader('btn-forgot-submit', false, 'Send Reset Email', 'fa-solid fa-paper-plane');
        });
    });
  }

  // Social Auth mock links
  const socialGoogle = document.getElementById('btn-login-google');
  const socialApple = document.getElementById('btn-login-apple');
  if (socialGoogle) {
    socialGoogle.addEventListener('click', () => {
      showToast('Google login is not enabled. Please use Email/Password.');
    });
  }
  if (socialApple) {
    socialApple.addEventListener('click', () => {
      showToast('Apple login is not enabled. Please use Email/Password.');
    });
  }
}

function initLogoutButtons() {
  const performLogout = (e) => {
    e.preventDefault();
    auth.signOut().then(() => {
      showToast('Logged out successfully.');
      window.location.hash = '#/';
    }).catch(err => {
      showToast('Error signing out: ' + err.message);
    });
  };

  const btnDash = document.getElementById('btn-dash-logout');
  const btnNav = document.getElementById('nav-logout-btn');
  const btnMobile = document.getElementById('nav-logout-mobile-btn');

  if (btnDash) btnDash.addEventListener('click', performLogout);
  if (btnNav) btnNav.addEventListener('click', performLogout);
  if (btnMobile) btnMobile.addEventListener('click', performLogout);
}

function showAuthMsg(elementId, text, type) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.innerHTML = text;
  el.className = `auth-msg ${type}`;
  el.classList.remove('hidden');
}

function showAuthLoader(buttonId, isLoading, defaultText = 'Submit', iconClass = 'fa-arrow-right') {
  const btn = document.getElementById(buttonId);
  if (!btn) return;
  
  if (isLoading) {
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Processing...`;
  } else {
    btn.disabled = false;
    btn.innerHTML = `<span>${defaultText}</span> <i class="${iconClass}"></i>`;
  }
}

function updateAuthUI(user) {
  const navLoginBtn = document.getElementById('nav-login-btn');
  const navLogoutBtn = document.getElementById('nav-logout-btn');
  const navDashboardLink = document.getElementById('nav-dashboard-link');
  const navLoginMobileLi = document.getElementById('nav-login-mobile-li');
  const navLogoutMobileLi = document.getElementById('nav-logout-mobile-li');

  if (user && user.emailVerified) {
    if (navLoginBtn) navLoginBtn.style.display = 'none';
    if (navLogoutBtn) navLogoutBtn.style.display = 'inline-block';
    if (navDashboardLink) navDashboardLink.style.display = 'inline-block';
    if (navLoginMobileLi) navLoginMobileLi.style.display = 'none';
    if (navLogoutMobileLi) navLogoutMobileLi.style.display = 'inline-block';
    
    // Fill in dashboard details
    const dashUserName = document.getElementById('dash-user-name');
    const dashUserEmail = document.getElementById('dash-user-email');
    const dashAvatar = document.getElementById('dash-avatar');

    if (dashUserName) dashUserName.innerText = user.displayName || 'SmartBuild User';
    if (dashUserEmail) dashUserEmail.innerText = user.email;
    if (dashAvatar) {
      const name = user.displayName || 'SmartBuild User';
      dashAvatar.innerText = name.charAt(0).toUpperCase();
    }

    loadSavedEstimates(user);
  } else {
    if (navLoginBtn) navLoginBtn.style.display = 'inline-block';
    if (navLogoutBtn) navLogoutBtn.style.display = 'none';
    if (navDashboardLink) navDashboardLink.style.display = 'none';
    if (navLoginMobileLi) navLoginMobileLi.style.display = 'inline-block';
    if (navLogoutMobileLi) navLogoutMobileLi.style.display = 'none';
  }
}

// ==========================================
// 9. Saved Estimates Logic
// ==========================================

function initSaveEstimateBtn() {
  const saveBtn = document.getElementById('btn-save-estimate');
  if (!saveBtn) return;

  saveBtn.addEventListener('click', async () => {
    const user = auth.currentUser;
    if (!user || !user.emailVerified) {
      showToast('Please log in and verify your email to save estimates.');
      window.location.hash = '#/login';
      return;
    }

    if (!currentEstimate) {
      showToast('Please calculate an estimate first.');
      return;
    }

    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

    try {
      const estimateId = 'est_' + currentEstimate.timestamp;
      
      // Save to Firestore
      await db.collection('users').doc(user.uid).collection('estimates').doc(estimateId).set(currentEstimate);
      
      // Always save to LocalStorage as backup
      const key = 'estimates_' + user.uid;
      const saved = JSON.parse(localStorage.getItem(key) || '[]');
      if (!saved.some(e => e.timestamp === currentEstimate.timestamp)) {
        saved.push(currentEstimate);
        localStorage.setItem(key, JSON.stringify(saved));
      }

      showToast('Estimate saved successfully!');
      loadSavedEstimates(user);
      window.location.hash = '#/dashboard';
    } catch (err) {
      showToast('Failed to save estimate: ' + err.message);
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<i class="fa-solid fa-bookmark"></i> Save Estimate to Dashboard';
    }
  });
}

async function loadSavedEstimates(user) {
  const container = document.getElementById('saved-estimates-list');
  const countBadge = document.getElementById('saved-estimates-count');
  if (!container) return;

  container.innerHTML = '<div style="text-align:center; padding: 2rem;"><i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; color: var(--accent);"></i><p style="margin-top: 0.5rem; color: var(--text-muted);">Loading saved estimates...</p></div>';

  let estimates = [];
  const key = 'estimates_' + user.uid;

  try {
    const snap = await db.collection('users').doc(user.uid).collection('estimates').get();
    snap.forEach(doc => {
      estimates.push(doc.data());
    });
  } catch (err) {
    console.warn("Firestore load failed, loading from LocalStorage", err);
    estimates = JSON.parse(localStorage.getItem(key) || '[]');
  }

  // Sort by newest
  estimates.sort((a, b) => b.timestamp - a.timestamp);

  if (countBadge) {
    countBadge.innerText = `${estimates.length} Saved`;
  }

  if (estimates.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-calculator" style="font-size: 3rem; color: var(--text-light); margin-bottom: 1rem; display: block; text-align: center;"></i>
        <p style="text-align: center; color: var(--text-muted);">You haven't saved any estimates yet.</p>
        <div style="text-align: center; margin-top: 1.25rem;">
          <a href="#/estimator" class="btn btn-secondary btn-sm">Go to Estimator</a>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = '';
  estimates.forEach(est => {
    const formattedMin = (est.minCost / 100000).toFixed(1);
    const formattedMax = (est.maxCost / 100000).toFixed(1);
    const dateStr = new Date(est.timestamp).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

    const card = document.createElement('div');
    card.className = 'estimate-item-card';
    card.innerHTML = `
      <div class="estimate-item-header">
        <div class="estimate-item-title">
          <h4>${est.district}, ${est.state}</h4>
          <p>${est.quality} Quality Tier</p>
        </div>
        <div class="estimate-item-price">
          <h3>₹${formattedMin}L – ₹${formattedMax}L</h3>
          <p>Estimated Range</p>
        </div>
      </div>
      <div class="estimate-item-body">
        <div class="estimate-meta-col">
          <span>Area</span>
          <span>${est.area.toLocaleString('en-IN')} sq.ft</span>
        </div>
        <div class="estimate-meta-col">
          <span>Floors</span>
          <span>${est.floors} Floors</span>
        </div>
        <div class="estimate-meta-col">
          <span>Avg Rate</span>
          <span>₹${((est.minCost + est.maxCost) / (2 * est.area)).toFixed(0)}/sq.ft</span>
        </div>
      </div>
      <div class="estimate-item-footer">
        <span class="estimate-item-date"><i class="fa-solid fa-calendar-days"></i> ${dateStr}</span>
        <button class="btn-delete-estimate" data-timestamp="${est.timestamp}">
          <i class="fa-solid fa-trash-can"></i> Delete
        </button>
      </div>
    `;

    card.querySelector('.btn-delete-estimate').addEventListener('click', async (e) => {
      const timestamp = parseInt(e.currentTarget.getAttribute('data-timestamp'));
      if (confirm('Are you sure you want to delete this saved estimate?')) {
        await deleteEstimate(user, timestamp);
      }
    });

    container.appendChild(card);
  });
}

async function deleteEstimate(user, timestamp) {
  const key = 'estimates_' + user.uid;
  const estimateId = 'est_' + timestamp;

  try {
    await db.collection('users').doc(user.uid).collection('estimates').doc(estimateId).delete();
  } catch (err) {
    console.warn("Firestore delete failed", err);
  }

  let saved = JSON.parse(localStorage.getItem(key) || '[]');
  saved = saved.filter(e => e.timestamp !== timestamp);
  localStorage.setItem(key, JSON.stringify(saved));

  showToast('Estimate deleted successfully.');
  loadSavedEstimates(user);
}

