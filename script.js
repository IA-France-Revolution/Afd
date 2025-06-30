// Global variables
let allData = [];
let filteredData = [];
let chartInstances = {};
let currentPage = 1;
let itemsPerPage = 10; // Can be adjusted, e.g., based on screen size or user preference
let activeFilters = {
  search: '',
  state: 'all',
  country: 'all',
  sector: 'all'
};

const DATA_URL = 'https://www.data.gouv.fr/fr/datasets/r/4baea878-d5ff-4fb5-bcb9-3ce325c1c050';

// Initialize animations and load data when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  // Initialize AOS
  if (typeof AOS !== 'undefined') {
    AOS.init({ 
      once: true,
      disable: 'phone', // Disable on small screens for potentially better performance
      duration: 800
    });
  } else {
    console.warn('AOS library is not loaded. Animations will be disabled.');
  }

  // GSAP Hero Animations
  const isMobile = window.innerWidth < 768;
  if (typeof gsap !== 'undefined') {
    gsap.to('.hero-title', { opacity: 1, y: 0, duration: isMobile ? 0.7 : 1, delay: isMobile ? 0.3 : 0.5 });
    gsap.to('.hero-subtitle', { opacity: 1, y: 0, duration: isMobile ? 0.7 : 1, delay: isMobile ? 0.5 : 0.8 });
    gsap.to('.scroll-down', { opacity: 1, duration: isMobile ? 0.7 : 1, delay: isMobile ? 0.7 : 1.2 });
  } else {
    // Fallback CSS animations if GSAP is not loaded
    document.querySelector('.hero-title').style.opacity = '1';
    document.querySelector('.hero-title').style.transform = 'translateY(0)';
    document.querySelector('.hero-subtitle').style.opacity = '1';
    document.querySelector('.hero-subtitle').style.transform = 'translateY(0)';
    document.querySelector('.scroll-down').style.opacity = '1';
  }

  // Scroll to top button
  const scrollToTopBtn = document.createElement('div');
  scrollToTopBtn.className = 'scroll-to-top';
  scrollToTopBtn.innerHTML = '<i class="fas fa-chevron-up"></i>';
  document.body.appendChild(scrollToTopBtn);

  window.addEventListener('scroll', function() {
    const navbar = document.getElementById('navbar');
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
      scrollToTopBtn.classList.add('active');
    } else {
      navbar.classList.remove('scrolled');
      scrollToTopBtn.classList.remove('active');
    }
  });

  scrollToTopBtn.addEventListener('click', function() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Mobile menu toggle
  const burger = document.querySelector('.burger');
  const nav = document.querySelector('.nav-links');
  const navLinks = document.querySelectorAll('.nav-links li');

  burger.addEventListener('click', () => {
    nav.classList.toggle('active');
    burger.classList.toggle('active');
    navLinks.forEach((link, index) => {
      if (nav.classList.contains('active')) {
        link.style.opacity = '0'; // Reset for animation
        link.classList.add('fade-in'); // Use this class for CSS animation if preferred
        link.style.animation = `navLinkFade 0.5s ease forwards ${index / 7 + 0.3}s`;
      } else {
        link.classList.remove('fade-in');
        link.style.animation = '';
      }
    });
  });
  
  // Close mobile menu when clicking outside
  document.addEventListener('click', function(event) {
    if (nav.classList.contains('active') && !nav.contains(event.target) && !burger.contains(event.target)) {
      nav.classList.remove('active');
      burger.classList.remove('active');
    }
  });

  // Handle window resize events
  window.addEventListener('resize', function() {
    if (window.innerWidth > 768 && nav.classList.contains('active')) {
      nav.classList.remove('active');
      burger.classList.remove('active');
    }
    if (typeof AOS !== 'undefined') AOS.refresh();
    // Charts are generally responsive with Chart.js, but a full redraw might be needed for drastic changes.
    // Consider calling update functions for charts if complex responsive logic is required beyond Chart.js defaults.
  });

  // Smooth scrolling for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      if (nav.classList.contains('active')) { // Close mobile nav if open
        nav.classList.remove('active');
        burger.classList.remove('active');
      }
      const targetId = this.getAttribute('href');
      if (targetId === '#') return; // Avoid scrolling for "#" href
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        const offset = window.innerWidth < 768 ? 60 : 70; // Navbar height offset
        window.scrollTo({ top: targetElement.offsetTop - offset, behavior: 'smooth' });
        // Update active state in navbar
        document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
        this.classList.add('active');
      }
    });
  });

  // Initialize share button
  initializeShareButton();

  // Initialize PWA features
  initializePWA();

  setupEventListeners();
  loadDataFromURL(); // Load data automatically instead of file input
});

// Share functionality
function initializeShareButton() {
  const shareButton = document.getElementById('shareButton');
  if (!shareButton) return;

  shareButton.addEventListener('click', async function() {
    const shareData = {
      title: 'Infographic – Projets AFD | Dashboard des Financements de l\'Agence Française de Développement',
      text: 'Découvrez l\'analyse interactive des projets de l\'AFD : financements, localisations, secteurs et chronologie des projets de développement français dans le monde.',
      url: window.location.href
    };

    try {
      // Try using the Web Share API first (for mobile devices)
      if (navigator.share) {
        await navigator.share(shareData);
        console.log('Content shared successfully');
      } else {
        // Fallback: show share modal with different options
        showShareModal(shareData);
      }
    } catch (error) {
      console.error('Error sharing:', error);
      // Fallback: copy to clipboard
      fallbackShare(shareData);
    }
  });
}

// Show share modal for desktop browsers
function showShareModal(shareData) {
  // Create modal
  const modal = document.createElement('div');
  modal.className = 'share-modal';
  modal.innerHTML = `
    <div class="share-modal-content">
      <div class="share-modal-header">
        <h3><i class="fas fa-share-alt"></i> Partager cette page</h3>
        <button class="share-modal-close">&times;</button>
      </div>
      <div class="share-modal-body">
        <div class="share-options">
          <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(shareData.text)}&url=${encodeURIComponent(shareData.url)}&via=AIFR_AI" target="_blank" class="share-option twitter">
            <i class="fab fa-twitter"></i> Twitter
          </a>
          <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareData.url)}" target="_blank" class="share-option facebook">
            <i class="fab fa-facebook-f"></i> Facebook
          </a>
          <a href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareData.url)}" target="_blank" class="share-option linkedin">
            <i class="fab fa-linkedin-in"></i> LinkedIn
          </a>
          <a href="mailto:?subject=${encodeURIComponent(shareData.title)}&body=${encodeURIComponent(shareData.text + ' ' + shareData.url)}" class="share-option email">
            <i class="fas fa-envelope"></i> Email
          </a>
          <button class="share-option copy-url" data-url="${shareData.url}">
            <i class="fas fa-copy"></i> Copier le lien
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Close modal functionality
  const closeBtn = modal.querySelector('.share-modal-close');
  closeBtn.addEventListener('click', () => {
    document.body.removeChild(modal);
  });

  // Close modal when clicking outside
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  });

  // Copy URL functionality
  const copyBtn = modal.querySelector('.copy-url');
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(shareData.url);
      copyBtn.innerHTML = '<i class="fas fa-check"></i> Copié !';
      copyBtn.style.background = 'var(--completed-color)';
      setTimeout(() => {
        copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copier le lien';
        copyBtn.style.background = '';
      }, 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
      fallbackCopyToClipboard(shareData.url);
    }
  });

  // Animate modal appearance
  if (typeof gsap !== 'undefined') {
    gsap.fromTo(modal, { opacity: 0 }, { opacity: 1, duration: 0.3 });
    gsap.fromTo(modal.querySelector('.share-modal-content'), 
      { scale: 0.8, y: 50 }, 
      { scale: 1, y: 0, duration: 0.3, delay: 0.1 }
    );
  }
}

// Fallback share method
function fallbackShare(shareData) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(shareData.url).then(() => {
      showNotification('Lien copié dans le presse-papiers !', 'success');
    }).catch(() => {
      fallbackCopyToClipboard(shareData.url);
    });
  } else {
    fallbackCopyToClipboard(shareData.url);
  }
}

// Fallback copy to clipboard for older browsers
function fallbackCopyToClipboard(text) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.top = '0';
  textArea.style.left = '0';
  textArea.style.position = 'fixed';
  textArea.style.opacity = '0';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  
  try {
    document.execCommand('copy');
    showNotification('Lien copié dans le presse-papiers !', 'success');
  } catch (err) {
    console.error('Fallback: Oops, unable to copy', err);
    showNotification('Impossible de copier le lien automatiquement. Veuillez copier l\'URL manuellement.', 'error');
  }
  
  document.body.removeChild(textArea);
}

// Show notification
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
    <span>${message}</span>
  `;
  
  document.body.appendChild(notification);
  
  // Animate in
  if (typeof gsap !== 'undefined') {
    gsap.fromTo(notification, 
      { opacity: 0, y: -50, scale: 0.8 }, 
      { opacity: 1, y: 0, scale: 1, duration: 0.3 }
    );
  }
  
  // Remove after 3 seconds
  setTimeout(() => {
    if (typeof gsap !== 'undefined') {
      gsap.to(notification, { 
        opacity: 0, 
        y: -30, 
        duration: 0.3, 
        onComplete: () => {
          if (document.body.contains(notification)) {
            document.body.removeChild(notification);
          }
        }
      });
    } else {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }
  }, 3000);
}

// PWA functionality
function initializePWA() {
  // Register service worker if available
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then((registration) => {
        console.log('SW registered: ', registration);
      }).catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
    });
  }

  // Handle install prompt
  let deferredPrompt;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // Show install button or notification
    showInstallPrompt();
  });

  // Handle app installed
  window.addEventListener('appinstalled', (evt) => {
    console.log('App was installed.');
    showNotification('Application installée avec succès !', 'success');
  });
}

// Show install prompt
function showInstallPrompt() {
  const installBanner = document.createElement('div');
  installBanner.className = 'install-banner';
  installBanner.innerHTML = `
    <div class="install-banner-content">
      <i class="fas fa-download"></i>
      <span>Installer l'application AFD Dashboard pour un accès hors ligne</span>
      <button id="installBtn">Installer</button>
      <button id="dismissBtn">&times;</button>
    </div>
  `;
  
  document.body.appendChild(installBanner);
  
  // Install button click
  document.getElementById('installBtn').addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to the install prompt: ${outcome}`);
      deferredPrompt = null;
    }
    document.body.removeChild(installBanner);
  });
  
  // Dismiss button click
  document.getElementById('dismissBtn').addEventListener('click', () => {
    document.body.removeChild(installBanner);
  });
  
  // Auto-dismiss after 10 seconds
  setTimeout(() => {
    if (document.body.contains(installBanner)) {
      document.body.removeChild(installBanner);
    }
  }, 10000);
}

// Load data from the specified URL
function loadDataFromURL() {
  const loadingDiv = document.getElementById('loading');
  const dashboardContentDiv = document.getElementById('dashboard-content');
  
  loadingDiv.style.display = 'block'; // Show loading indicator
  dashboardContentDiv.style.display = 'none'; // Hide dashboard

  Papa.parse(DATA_URL, {
    download: true, // Crucial for fetching from URL
    delimiter: ';',
    header: true,
    encoding: "UTF-8",
    skipEmptyLines: true,
    complete: function(results) {
      if (results.errors.length > 0) {
        console.error('Parsing errors:', results.errors);
        loadingDiv.innerHTML = `
          <div class="error-message animate__animated animate__shakeX">
            <i class="fas fa-exclamation-triangle fa-3x" style="color: var(--secondary-color); margin-bottom: 15px;"></i>
            <h3>Erreur lors de la lecture des données</h3>
            <p>Impossible de traiter les données depuis la source. (${results.errors[0].message})</p>
            <p><small>Veuillez vérifier la console pour plus de détails.</small></p>
          </div>`;
        return;
      }

      allData = processData(results.data);
      filteredData = [...allData]; // Initialize filteredData with all data
      
      // GSAP animation for smooth transition
      if (typeof gsap !== 'undefined') {
          gsap.to(loadingDiv, {
            opacity: 0,
            duration: 0.5,
            onComplete: () => {
              loadingDiv.style.display = 'none';
              dashboardContentDiv.style.display = 'block';
              if (typeof AOS !== 'undefined') AOS.refresh(); // Refresh AOS animations
              
              initializeDashboard(); // Populate dashboard with data
              // Smooth scroll to the stats section after loading
              const statsSection = document.querySelector('#stats');
              if (statsSection) window.scrollTo({ top: statsSection.offsetTop - 100, behavior: 'smooth' });
            }
          });
      } else { // Fallback if GSAP is not loaded
          loadingDiv.style.display = 'none';
          dashboardContentDiv.style.display = 'block';
          if (typeof AOS !== 'undefined') AOS.refresh();
          initializeDashboard();
          const statsSection = document.querySelector('#stats');
          if (statsSection) window.scrollTo({ top: statsSection.offsetTop - 100, behavior: 'smooth' });
      }
    },
    error: function(error) {
      console.error('Error fetching or parsing CSV:', error);
      loadingDiv.innerHTML = `
        <div class="error-message animate__animated animate__shakeX">
          <i class="fas fa-exclamation-triangle fa-3x" style="color: var(--secondary-color); margin-bottom: 15px;"></i>
          <h3>Erreur de chargement des données</h3>
          <p>Impossible de récupérer les données depuis ${DATA_URL}.</p>
          <p><small>Veuillez vérifier votre connexion internet ou réessayer plus tard.</small></p>
        </div>
      `;
    }
  });
}

// Initialize all dashboard components after data is loaded
function initializeDashboard() {
  updateDashboard();      // Basic and Advanced Stats
  updateAllCharts();      // All Chart.js graphs
  sortData();             // Applies default sort and populates the main table
  populateBudgetByCountryTable(); // Budget by Country table
}

function updateAllCharts() {
    updateBarChart();
    updatePieChart();
    updateLineChart();
    updateRegionChart();
    updateSectorChart();
    updateTimelineChart();
}


// Helper functions
function convertToMillions(value) {
  if (typeof value === 'string') {
    value = value.replace(',', '.'); // Handle French decimal format
  }
  const num = parseFloat(value);
  if (isNaN(num)) return 0; // Default to 0 if not a valid number
  return num / 1000000;
}

function formatNumber(num, fractionDigits = 2) {
  if (typeof num !== 'number' || isNaN(num)) return 'N/A'; // Handle non-numeric or NaN inputs
  return num.toLocaleString('fr-FR', { 
    minimumFractionDigits: fractionDigits, 
    maximumFractionDigits: fractionDigits 
  });
}

function getStatusTag(status) {
  if (!status) return '<span class="tag">Non spécifié</span>';
  let className = '';
  const lowerStatus = status.toLowerCase();
  if (lowerStatus.includes('exécution') || lowerStatus.includes('execution')) className = 'execution';
  else if (lowerStatus.includes('achevé') || lowerStatus.includes('acheve') || lowerStatus.includes('clôturé') || lowerStatus.includes('cloture')) className = 'completed';
  else if (lowerStatus.includes('préparation') || lowerStatus.includes('preparation')) className = 'planning';
  else if (lowerStatus.includes('abandon')) className = 'cancelled';
  // Add more states as needed
  
  return `<span class="tag ${className}">${status}</span>`;
}

// Process CSV data: robustly handles missing fields and parses values
function processData(data) {
  return data.filter(row => row && (row["Titre du projet"] || row["title"])) // Ensure row and title exist
    .map((row, index) => {
      const budgetStr = row["Budget"] || row["budget"] || "0";
      const budgetNum = parseFloat(String(budgetStr).replace(',', '.'));
      const dateOctroiStr = row["Date d'octroi"];
      let year = null;
      if (dateOctroiStr) {
          const parsedDate = new Date(dateOctroiStr);
          if (!isNaN(parsedDate.getTime())) {
              year = parsedDate.getFullYear();
          }
      }

      return {
        id: row["Id. Projet"] || row["Id. Concours"] || `generated-${index}-${Date.now()}`, // Unique fallback ID
        title: (row["Titre du projet"] || "Sans titre").trim(),
        description: row["Description du projet"] || "",
        state: (row["Etat du projet"] || "Non spécifié").trim(),
        country: (row["Pays de réalisation"] || "Non spécifié").trim(),
        region: (row["Région"] || "Non spécifié").trim(),
        sector: row["Libellé secteur économique  (CAD-5)"] || row["Libellé CICID"] || "Non spécifié",
        cicid: row["Libellé CICID"] || "",
        budget: isNaN(budgetNum) ? 0 : budgetNum,
        budgetMillions: convertToMillions(budgetNum), // Already handles NaN by returning 0
        dateOctroi: dateOctroiStr || "",
        dateAchevement: row["Date d'achèvement opérationnel du projet"] || "",
        date1erVersement: row["Date de 1er versement (concours)"] || "",
        year: year,
        lien: row["Lien_Fiche_Projet"] || "",
        cofinanced: String(row["Cofinanciers (O/N)"] || "").toLowerCase() === "oui",
        cofinancier: row["Cofinancier"] || "",
        beneficiary: row["Libellé bénéficiaire primaire"] || "",
        agency: row["Libellé agence"] || "",
        dateMaj: row["Date mise à jour données projet"] || "",
        datePublication: row["Date de la dernière publication"] || "",
        division: row["Division Technique"] || "",
        aidType: row["Libellé indicateur APD"] || "",
        productGroup: row["Groupe de produit"] || "",
        responsibleCountry: row["Responsable pays"] || ""
      };
  });
}

// Animated counter using requestAnimationFrame for smoothness
function animateCounter(element, target, duration = 1500, prefix = '', suffix = '') {
  if (!element) {
    // console.warn("animateCounter: Element not found.");
    return;
  }
  // Attempt to parse start value from current content, default to 0
  const startText = element.textContent || '';
  const start = parseFloat(startText.replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;
  const startTime = performance.now();

  function updateCounter(currentTime) {
    const elapsedTime = currentTime - startTime;
    const progress = Math.min(elapsedTime / duration, 1);
    const easeOutQuad = t => t * (2 - t); // Easing function: 1 - (1 - t)^2
    const easedProgress = easeOutQuad(progress);
    const currentValue = start + (target - start) * easedProgress;
    
    let fractionDigits = 0; // Default for integers
    if (target < 10 && target !== Math.floor(target)) fractionDigits = 1; // For small floats like avg duration
    if (suffix.includes('M€') && target < 100) fractionDigits = 2; // For budget values

    element.innerHTML = `${prefix}<strong>${formatNumber(currentValue, fractionDigits)}</strong>${suffix}`;
    
    if (progress < 1) {
      requestAnimationFrame(updateCounter);
    } else {
      // Ensure final value is exactly the target
      element.innerHTML = `${prefix}<strong>${formatNumber(target, fractionDigits)}</strong>${suffix}`;
    }
  }
  requestAnimationFrame(updateCounter);
}

// Update Dashboard Stats (Basic and Advanced)
function updateDashboard() {
  const totalBudget = allData.reduce((acc, row) => acc + (row.budgetMillions || 0), 0);
  const projectCount = allData.length;
  const avgBudget = projectCount > 0 ? totalBudget / projectCount : 0;
  const uniqueCountries = new Set(allData.map(row => row.country.toLowerCase())).size; // Case-insensitive count

  animateCounter(document.getElementById('totalBudget'), totalBudget, 1500, '', ' M€');
  animateCounter(document.getElementById('projectCount'), projectCount, 1500);
  animateCounter(document.getElementById('avgBudget'), avgBudget, 1500, '', ' M€');
  animateCounter(document.getElementById('countryCount'), uniqueCountries, 1500);
  
  // Advanced Stats
  const projectsInExecution = allData.filter(row => (row.state.toLowerCase().includes('exécution') || row.state.toLowerCase().includes('execution'))).length;
  const projectsCompleted = allData.filter(row => (row.state.toLowerCase().includes('achevé') || row.state.toLowerCase().includes('acheve') || row.state.toLowerCase().includes('clôturé') || row.state.toLowerCase().includes('cloture'))).length;
  const cofinancedProjects = allData.filter(row => row.cofinanced).length;
  
  let totalDurationYears = 0;
  let projectsWithDuration = 0;
  allData.forEach(row => {
    if (row.dateOctroi && row.dateAchevement) {
      const startDate = new Date(row.dateOctroi);
      const endDate = new Date(row.dateAchevement);
      // Ensure dates are valid and end date is after start date
      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime()) && endDate > startDate) {
        const durationMs = endDate.getTime() - startDate.getTime();
        totalDurationYears += durationMs / (1000 * 60 * 60 * 24 * 365.25); // Account for leap years
        projectsWithDuration++;
      }
    }
  });
  const avgProjectDuration = projectsWithDuration > 0 ? totalDurationYears / projectsWithDuration : 0;
  
  const publicKeywords = ['republique', 'état', 'etat', 'ministere', 'gouvernement', 'collectivite', 'ville de', 'mairie', 'commune', 'public', 'nationale'];
  const publicEntities = allData.filter(row => 
    row.beneficiary && publicKeywords.some(keyword => row.beneficiary.toLowerCase().includes(keyword))
  ).length;
  const privateEntities = projectCount - publicEntities; // Approximation
  
  animateCounter(document.getElementById('projectsInExecution'), projectsInExecution);
  animateCounter(document.getElementById('projectsCompleted'), projectsCompleted);
  animateCounter(document.getElementById('cofinancedProjects'), cofinancedProjects);
  animateCounter(document.getElementById('avgProjectDuration'), avgProjectDuration, 1500, '', ''); // avgDuration usually has 1 decimal
  animateCounter(document.getElementById('publicEntities'), publicEntities);
  animateCounter(document.getElementById('privateEntities'), privateEntities);
  
  updateFilterOptions(); // Populate filter dropdowns
}

// Update filter dropdown options based on allData
function updateFilterOptions() {
  const populateSelect = (selectId, dataKey, defaultText) => {
    const uniqueValues = [...new Set(allData.map(item => item[dataKey]))]
      .filter(Boolean) // Remove null/undefined/empty strings
      .sort((a, b) => String(a).localeCompare(String(b), 'fr', { sensitivity: 'base' })); // Locale-sensitive sort
    
    const filterElement = document.getElementById(selectId);
    if (!filterElement) return;
    filterElement.innerHTML = `<option value="all">${defaultText}</option>`; // Reset options
    uniqueValues.forEach(value => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      filterElement.appendChild(option);
    });
  };

  populateSelect('stateFilter', 'state', 'Tous les états');
  populateSelect('countryFilter', 'country', 'Tous les pays');
  populateSelect('sectorFilter', 'sector', 'Tous les secteurs');
}

// Sort data based on selected field and refresh the main table and sort metrics
function sortData() {
  const sortValue = document.getElementById('sortField').value;
  let fieldName, direction;

  // Determine field and direction from sortValue
  switch(sortValue) {
    case 'budget-desc': fieldName = 'budgetMillions'; direction = 'desc'; break;
    case 'budget-asc': fieldName = 'budgetMillions'; direction = 'asc'; break;
    case 'title-asc': fieldName = 'title'; direction = 'asc'; break;
    case 'title-desc': fieldName = 'title'; direction = 'desc'; break;
    case 'date-desc': fieldName = 'dateOctroi'; direction = 'desc'; break;
    case 'date-asc': fieldName = 'dateOctroi'; direction = 'asc'; break;
    default: fieldName = 'budgetMillions'; direction = 'desc'; // Sensible default
  }

  const originalFirstItem = filteredData.length > 0 ? {...filteredData[0]} : null; // For comparison in displaySortMetrics

  // Perform the sort on filteredData
  filteredData.sort((a, b) => {
    let valA = a[fieldName];
    let valB = b[fieldName];

    if (fieldName === 'title') {
      const strA = String(valA || "").toLowerCase();
      const strB = String(valB || "").toLowerCase();
      const compareResult = strA.localeCompare(strB, 'fr', { sensitivity: 'base' });
      return direction === 'asc' ? compareResult : -compareResult;
    } else if (fieldName === 'dateOctroi') {
      const dateA = valA ? new Date(valA).getTime() : 0; // Treat missing dates as earliest
      const dateB = valB ? new Date(valB).getTime() : 0;
      // Handle NaN dates robustly (e.g., sort them to one end)
      if (isNaN(dateA) && isNaN(dateB)) return 0;
      if (isNaN(dateA)) return direction === 'asc' ? 1 : -1; // NaNs last for asc, first for desc
      if (isNaN(dateB)) return direction === 'asc' ? -1 : 1;
      return direction === 'asc' ? dateA - dateB : dateB - dateA;
    } else { // Numeric sort (e.g., budgetMillions)
      valA = typeof valA === 'number' && !isNaN(valA) ? valA : 0; // Default non-numbers/NaN to 0
      valB = typeof valB === 'number' && !isNaN(valB) ? valB : 0;
      return direction === 'asc' ? valA - valB : valB - valA;
    }
  });
  
  displaySortMetrics(fieldName, direction, originalFirstItem); // Update sort metrics display
  currentPage = 1; // Reset to first page after sorting
  populateTable(); // Refresh the table display
}

// Display metrics about the current sort criteria
function displaySortMetrics(field, direction, originalFirstItem) {
  let sortMetricsElement = document.getElementById('sort-metrics');
  if (!sortMetricsElement) { // Create if doesn't exist
    sortMetricsElement = document.createElement('div');
    sortMetricsElement.id = 'sort-metrics';
    sortMetricsElement.className = 'sort-metrics'; // Ensure CSS class is applied for styling
    
    // Insert it after active-filter-pills and before filter-metrics or table
    const activePillsContainer = document.querySelector('.active-filters');
    const existingFilterMetrics = document.getElementById('filter-metrics');
    if (activePillsContainer && activePillsContainer.parentNode) {
        activePillsContainer.parentNode.insertBefore(sortMetricsElement, existingFilterMetrics || activePillsContainer.nextSibling);
    } else { // Fallback: try to insert before table-responsive
        const tableResponsive = document.querySelector('.table-responsive');
        if (tableResponsive && tableResponsive.parentNode) {
            tableResponsive.parentNode.insertBefore(sortMetricsElement, tableResponsive);
        } else {
            // console.warn("Could not find a suitable place to insert sort-metrics.");
        }
    }
  }
  
  if (filteredData.length === 0) {
    sortMetricsElement.style.display = 'none'; // Hide if no data to sort
    return;
  }
  
  let content = '';
  let icon = 'fa-sort';
  let fieldDisplay = '';
  
  const firstItem = filteredData[0]; // Item at the top after sort
  const lastItem = filteredData[filteredData.length - 1]; // Item at the bottom
  
  if (field === 'budgetMillions') {
    icon = direction === 'desc' ? 'fa-sort-amount-down-alt' : 'fa-sort-amount-up-alt';
    fieldDisplay = 'budget';
    const valFirst = firstItem?.budgetMillions || 0;
    const valLast = lastItem?.budgetMillions || 0;

    const [minBudVal, maxBudVal] = [valFirst, valLast].sort((a,b) => a - b);
    
    content = `<span class="sort-info">De ${formatNumber(minBudVal)} M€ à ${formatNumber(maxBudVal)} M€</span>`;
    content += `<span class="sort-range">Étendue: ${formatNumber(maxBudVal - minBudVal)} M€</span>`;
    
    const avgBudget = filteredData.reduce((sum, item) => sum + (item.budgetMillions || 0), 0) / filteredData.length;
    content += `<span class="sort-avg">Moyenne: ${formatNumber(avgBudget)} M€</span>`;
    
  } else if (field === 'title') {
    icon = direction === 'asc' ? 'fa-sort-alpha-down' : 'fa-sort-alpha-up-alt';
    fieldDisplay = 'titre';
    
    const firstLetter = firstItem?.title?.charAt(0).toUpperCase() || 'N/A';
    const lastLetter = lastItem?.title?.charAt(0).toUpperCase() || 'N/A';
    
    content = `<span class="sort-info">De '${firstLetter}' à '${lastLetter}'</span>`;
    
    const letterCounts = {};
    filteredData.forEach(item => {
      if (item.title) {
        const letter = item.title.charAt(0).toUpperCase();
        if (letter.match(/[A-Z]/i)) letterCounts[letter] = (letterCounts[letter] || 0) + 1;
      }
    });
    
    let mostCommonLetter = '';
    let maxCount = 0;
    Object.entries(letterCounts).forEach(([letter, count]) => {
      if (count > maxCount) {
        mostCommonLetter = letter;
        maxCount = count;
      }
    });
    if (mostCommonLetter) {
      content += `<span class="sort-common">Lettre la + fréquente: ${mostCommonLetter} (${maxCount} projets)</span>`;
    }
    
  } else if (field === 'dateOctroi') {
    icon = direction === 'desc' ? 'fa-calendar-day' : 'fa-calendar-check';
    fieldDisplay = 'date d\'octroi';
    
    const formatDate = (dateStr) => {
      if (!dateStr) return 'N/A';
      const date = new Date(dateStr);
      return !isNaN(date.getTime()) ? date.toLocaleDateString('fr-FR', {year: 'numeric', month: 'short', day: 'numeric'}) : 'Date invalide';
    };
    
    const [earliestDateStr, latestDateStr] = [firstItem?.dateOctroi, lastItem?.dateOctroi].sort((a,b) => (new Date(a).getTime() || 0) - (new Date(b).getTime() || 0));

    content = `<span class="sort-info">De ${formatDate(earliestDateStr)} à ${formatDate(latestDateStr)}</span>`;
    
    const yearCounts = {};
    filteredData.forEach(item => {
      if (item.dateOctroi) {
        const year = new Date(item.dateOctroi).getFullYear();
        if (!isNaN(year)) yearCounts[year] = (yearCounts[year] || 0) + 1;
      }
    });
    
    let peakYear = '';
    let peakCount = 0;
    Object.entries(yearCounts).forEach(([year, count]) => {
      if (count > peakCount) {
        peakYear = year;
        peakCount = count;
      }
    });
    
    if (peakYear) {
      content += `<span class="sort-peak">Année pic: ${peakYear} (${peakCount} projets)</span>`;
    }
  }
  
  sortMetricsElement.innerHTML = `
    <div class="sort-title">
      <i class="fas ${icon}"></i>
      Tri par ${fieldDisplay} ${direction === 'asc' ? '(croissant)' : '(décroissant)'}
    </div>
    <div class="sort-details">${content}</div>
  `;
  sortMetricsElement.style.display = 'flex'; // Ensure it's visible and uses flex layout
}


// Populate table with current page of filteredData
function populateTable() {
  const tbody = document.querySelector('#dataTable tbody');
  if (!tbody) return; // Safety check

  const totalItems = filteredData.length;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  
  // Update pagination controls and info
  document.getElementById('prevPage').disabled = currentPage === 1;
  document.getElementById('nextPage').disabled = endIndex >= totalItems;
  document.getElementById('startIndex').textContent = totalItems === 0 ? 0 : startIndex + 1;
  document.getElementById('endIndex').textContent = endIndex;
  document.getElementById('totalItems').textContent = totalItems;
  
  updateTableFooterMetrics(); // Update summary metrics for the filtered data
  
  const pageData = filteredData.slice(startIndex, endIndex);

  // GSAP animation for table update
  if (typeof gsap !== 'undefined') {
    gsap.to(tbody, {
      opacity: 0, 
      y: 15, // Slight downward movement before new rows appear
      duration: 0.2,
      onComplete: () => {
          populateTableRows(tbody, pageData); // Populate with new data
          gsap.to(tbody, { opacity: 1, y: 0, duration: 0.25, delay: 0.05 }); // Fade in new rows
      }
    });
  } else { // Fallback without GSAP
    tbody.style.opacity = '0';
    populateTableRows(tbody, pageData);
    setTimeout(() => { 
        tbody.style.opacity = '1';
        tbody.style.transform = 'translateY(0)';
    }, 50); // Short delay for visual effect
  }
}

// Helper function to populate table rows (receives already paged data)
function populateTableRows(tbody, pageData) {
  tbody.innerHTML = ''; // Clear existing rows

  if (pageData.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="7" style="text-align:center; padding: 20px; font-style: italic;">Aucun projet ne correspond aux critères de recherche actuels.</td>`;
    tbody.appendChild(tr);
    return;
  }
  
  pageData.forEach((row, index) => {
    const tr = document.createElement('tr');
    // tr.className = 'table-row-animation'; // GSAP handles this now
    
    let formattedDate = row.dateOctroi || '-';
    if (formattedDate !== '-' && row.dateOctroi) {
      const date = new Date(row.dateOctroi);
      if (!isNaN(date.getTime())) {
        formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      } else {
        formattedDate = 'Date invalide'; // Handle invalid date strings
      }
    }
    
    tr.innerHTML = `
      <td>
        <button id="btn-${row.id}" class="show-details-btn" onclick="toggleDetails('${row.id}')" aria-label="Afficher les détails pour ${row.title}" aria-expanded="false">
          <i class="fas fa-plus-circle"></i>
        </button>
      </td>
      <td class="expandable-cell" title="${row.title || ''}">
        ${row.lien ? `<a href="${row.lien}" target="_blank" rel="noopener noreferrer">${row.title}</a>` : row.title}
      </td>
      <td class="number-cell">${row.budgetMillions != null ? formatNumber(row.budgetMillions) + ' M€' : '-'}</td>
      <td>${getStatusTag(row.state)}</td>
      <td>${row.country}</td>
      <td class="expandable-cell" title="${row.sector || ''}">${row.sector}</td>
      <td>${formattedDate}</td>
    `;
    tbody.appendChild(tr);
    
    // Create and append detail row (initially hidden)
    const detailTr = document.createElement('tr');
    detailTr.id = `details-${row.id}`;
    detailTr.className = 'detail-row'; // style.display = 'none' is handled by CSS or initial state
    
    let detailHtml = '<td colspan="7"><div class="detail-grid">';
    const addDetailItem = (label, value) => {
        const displayValue = (value === true ? 'Oui' : value === false ? 'Non' : value);
        if (displayValue || displayValue === 0) { // Show if value exists (including 0 or false)
            detailHtml += `<div class="detail-item"><strong>${label}</strong><div>${displayValue}</div></div>`;
        }
    };
    
    // Populate detail items, formatting dates as needed
    const formatDateForDetail = (dateStr) => dateStr ? (new Date(dateStr).toLocaleDateString('fr-FR', {day:'2-digit', month:'2-digit', year:'numeric'}) || '-') : '-';

    addDetailItem('Description', row.description);
    addDetailItem('ID du Projet', row.id);
    addDetailItem('Région', row.region);
    addDetailItem('Date d\'octroi', formatDateForDetail(row.dateOctroi));
    addDetailItem('Date de 1er versement', formatDateForDetail(row.date1erVersement));
    addDetailItem('Date d\'achèvement', formatDateForDetail(row.dateAchevement));
    addDetailItem('Agence', row.agency);
    addDetailItem('Cofinancé', row.cofinanced); // Will show Oui/Non
    addDetailItem('Cofinancier(s)', row.cofinancier);
    addDetailItem('Bénéficiaire primaire', row.beneficiary);
    addDetailItem('Division Technique', row.division);
    addDetailItem('Type d\'aide (Indicateur APD)', row.aidType);
    addDetailItem('Groupe de produit', row.productGroup);
    addDetailItem('Responsable pays', row.responsibleCountry);
    addDetailItem('Date de mise à jour des données', formatDateForDetail(row.dateMaj));
    addDetailItem('Date de dernière publication', formatDateForDetail(row.datePublication));
    
    detailHtml += '</div></td>';
    detailTr.innerHTML = detailHtml;
    tbody.appendChild(detailTr);

    // GSAP entrance animation for each row (if GSAP loaded)
    if (typeof gsap !== 'undefined') {
      gsap.fromTo(tr, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3, delay: index * 0.025 });
    } else {
      tr.style.opacity = '1'; // Fallback: just make visible
      tr.style.transform = 'translateY(0)';
    }
  });
}

// Toggle display of row details with GSAP animation
function toggleDetails(rowId) {
  const detailRow = document.getElementById(`details-${rowId}`);
  const button = document.getElementById(`btn-${rowId}`);
  if (!detailRow || !button) return;

  const isVisible = detailRow.style.display === 'table-row';
  
  if (typeof gsap !== 'undefined') {
    // Ensure the inner div for animation exists or wrap content
    let detailContentWrapper = detailRow.cells[0].querySelector('.detail-content-wrapper');
    if(!detailContentWrapper) {
        const originalContent = detailRow.cells[0].innerHTML;
        detailRow.cells[0].innerHTML = `<div class="detail-content-wrapper" style="overflow:hidden;">${originalContent}</div>`;
        detailContentWrapper = detailRow.cells[0].querySelector('.detail-content-wrapper');
    }

    if (isVisible) {
      gsap.to(detailContentWrapper, { 
        height: 0, 
        opacity: 0, 
        paddingTop: 0, // Animate padding as well
        paddingBottom: 0,
        duration: 0.3, 
        ease: 'power1.inOut',
        onComplete: () => { detailRow.style.display = 'none'; } 
      });
      button.innerHTML = '<i class="fas fa-plus-circle"></i>';
      button.setAttribute('aria-expanded', 'false');
    } else {
      detailRow.style.display = 'table-row'; // Make it part of layout to measure height
      gsap.set(detailContentWrapper, { height: 'auto', opacity: 1, paddingTop: '15px', paddingBottom: '15px'}); // Set to auto to get natural height
      gsap.from(detailContentWrapper, { 
          height: 0, 
          opacity: 0, 
          paddingTop: 0,
          paddingBottom: 0,
          duration: 0.4, 
          ease: 'power1.inOut' 
      });
      button.innerHTML = '<i class="fas fa-minus-circle"></i>';
      button.setAttribute('aria-expanded', 'true');
    }
  } else { // Fallback if GSAP is not loaded
    detailRow.style.display = isVisible ? 'none' : 'table-row';
    button.innerHTML = isVisible ? '<i class="fas fa-plus-circle"></i>' : '<i class="fas fa-minus-circle"></i>';
    button.setAttribute('aria-expanded', String(!isVisible));
  }
}
window.toggleDetails = toggleDetails; // Expose to global scope for inline onclick handlers

// Apply current filters to allData and update display
function applyFilters() {
  currentPage = 1; // Reset to first page when filters change
  const searchTerm = activeFilters.search.toLowerCase().trim();
  
  filteredData = allData.filter(item => {
    const matchesSearch = !searchTerm || 
      (item.title && item.title.toLowerCase().includes(searchTerm)) ||
      (item.country && item.country.toLowerCase().includes(searchTerm)) ||
      (item.sector && item.sector.toLowerCase().includes(searchTerm)) ||
      (item.description && item.description.toLowerCase().includes(searchTerm));
      
    const matchesState = activeFilters.state === 'all' || item.state === activeFilters.state;
    const matchesCountry = activeFilters.country === 'all' || item.country === activeFilters.country;
    const matchesSector = activeFilters.sector === 'all' || item.sector === activeFilters.sector;
    
    return matchesSearch && matchesState && matchesCountry && matchesSector;
  });
  
  updateFilterMetrics(); // Update metrics display above the table
  updateFilterPills();   // Update active filter pills
  sortData();            // Re-sort and repopulate the table with new filteredData
}

// Update filter metrics displayed above the table
function updateFilterMetrics() {
  const metricsEl = document.getElementById('filter-metrics');
  if (!metricsEl) return;

  const noFiltersApplied = activeFilters.search === '' && 
                           activeFilters.state === 'all' && 
                           activeFilters.country === 'all' && 
                           activeFilters.sector === 'all';
  // Hide if no filters are applied OR if filtered data is same as all data (meaning filters had no effect)
  if (noFiltersApplied || (filteredData.length === allData.length && allData.length > 0) ) {
    metricsEl.style.display = 'none';
    metricsEl.innerHTML = ''; // Clear content when hidden
    updateTableFooterMetrics(); // Still update footer if data exists
    return;
  }
  if (allData.length === 0) { // If there's no data at all
    metricsEl.style.display = 'none';
    metricsEl.innerHTML = '';
    return;
  }


  const totalProjectsAll = allData.length;
  const filteredProjectsCount = filteredData.length;
  const filterPercentage = totalProjectsAll > 0 ? Math.round((filteredProjectsCount / totalProjectsAll) * 100) : 0;
  
  const totalBudgetAll = allData.reduce((sum, row) => sum + (row.budgetMillions || 0), 0);
  const filteredBudgetSum = filteredData.reduce((sum, row) => sum + (row.budgetMillions || 0), 0);
  const budgetPercentage = totalBudgetAll > 0 ? Math.round((filteredBudgetSum / totalBudgetAll) * 100) : 0;
  
  const avgBudgetFiltered = filteredProjectsCount > 0 ? filteredBudgetSum / filteredProjectsCount : 0;
  
  metricsEl.style.display = 'flex'; // Use flex as per CSS styling
  
  let headerText = '';
  // Construct a more descriptive header based on active filters
  const activeFilterDescriptions = [];
  if (activeFilters.country !== 'all') activeFilterDescriptions.push(`Pays: ${activeFilters.country}`);
  if (activeFilters.state !== 'all') activeFilterDescriptions.push(`État: ${activeFilters.state}`);
  if (activeFilters.sector !== 'all') activeFilterDescriptions.push(`Secteur: ${activeFilters.sector}`);
  if (activeFilters.search) activeFilterDescriptions.push(`Recherche: "${activeFilters.search}"`);

  if (activeFilterDescriptions.length > 0) {
    headerText = `<div class="filter-header">Résultats pour ${activeFilterDescriptions.join(', ')}</div>`;
  }

  metricsEl.innerHTML = `
    ${headerText}
    <div class="metric-item">
        <div class="metric-number">${filteredProjectsCount} projets</div>
        <div class="metric-label">${filterPercentage}% des projets totaux</div>
    </div>
    <div class="metric-item">
        <div class="metric-number">${formatNumber(filteredBudgetSum)} M€</div>
        <div class="metric-label">${budgetPercentage}% du budget total</div>
    </div>
    <div class="metric-item">
        <div class="metric-number">${formatNumber(avgBudgetFiltered)} M€</div>
        <div class="metric-label">Budget moyen (sélection)</div>
    </div>
  `;
  
  updateTableFooterMetrics(); // Ensure footer is also updated based on new filteredData
}

// Update table footer metrics (summarizing currently filtered data set)
function updateTableFooterMetrics() {
  const footerMetrics = document.getElementById('table-footer-metrics');
  if (!footerMetrics) return;

  const currentData = filteredData; // Metrics based on all filtered data

  if (currentData.length === 0 && allData.length === 0) { // No data loaded at all
     footerMetrics.style.display = 'none';
     return;
  }
  // If filters result in no data, but there is data overall, show a specific message
  if (currentData.length === 0 && allData.length > 0) {
    footerMetrics.innerHTML = `<div class="metric-label" style="text-align:center; width:100%; padding: 10px;">Aucun projet ne correspond aux filtres actifs. Total projets disponibles: ${allData.length}.</div>`;
    footerMetrics.style.display = 'flex';
    return;
  }
  
  const projectsCount = currentData.length;
  const budgetSum = currentData.reduce((sum, row) => sum + (row.budgetMillions || 0), 0);
  const avgBudget = projectsCount > 0 ? budgetSum / projectsCount : 0;
  
  const executionCount = currentData.filter(item => (item.state.toLowerCase().includes('exécution') || item.state.toLowerCase().includes('execution'))).length;
  const completedCount = currentData.filter(item => (item.state.toLowerCase().includes('achevé') || item.state.toLowerCase().includes('acheve') || item.state.toLowerCase().includes('clôturé') || item.state.toLowerCase().includes('cloture'))).length;
  
  const uniqueCountriesInFiltered = new Set(currentData.map(item => item.country.toLowerCase())).size;
  const totalUniqueCountriesAll = new Set(allData.map(item => item.country.toLowerCase())).size;
  const countryPercentage = totalUniqueCountriesAll > 0 ? Math.round((uniqueCountriesInFiltered / totalUniqueCountriesAll) * 100) : 0;
  
  footerMetrics.innerHTML = `
    <div class="metric-item">
        <div class="metric-number">${formatNumber(budgetSum)} M€</div>
        <div class="metric-label">Budget total (sélection)</div>
    </div>
    <div class="metric-item">
        <div class="metric-number">${projectsCount}</div>
        <div class="metric-label">Projets (sélection)</div>
    </div>
    <div class="metric-item">
        <div class="metric-number">${formatNumber(avgBudget)} M€</div>
        <div class="metric-label">Budget moyen (sélection)</div>
    </div>
    <div class="metric-item">
        <div class="metric-number">${executionCount} / ${completedCount}</div>
        <div class="metric-label">Exécution / Achevés (sélection)</div>
    </div>
    <div class="metric-item">
        <div class="metric-number">${uniqueCountriesInFiltered}</div>
        <div class="metric-label">Pays couverts (sélection, ${countryPercentage}% du total)</div>
    </div>
  `;
  footerMetrics.style.display = 'flex'; // Ensure it's visible
}

// Update active filter pills display
function updateFilterPills() {
  const pillsContainer = document.getElementById('active-filter-pills');
  const filterLabelSpan = document.querySelector('.active-filters > span'); // The "Filtres actifs:" span
  if (!pillsContainer || !filterLabelSpan) return;

  pillsContainer.innerHTML = ''; // Clear existing pills
  
  const activeFilterEntries = Object.entries(activeFilters).filter(([key, value]) => 
    (key === 'search' && value !== '') || (key !== 'search' && value !== 'all')
  );

  filterLabelSpan.style.display = activeFilterEntries.length > 0 ? 'inline-block' : 'none';
  if (activeFilterEntries.length === 0) return; // No active filters, nothing more to do

  activeFilterEntries.forEach(([type, value]) => {
    const pill = document.createElement('div');
    pill.className = 'filter-pill';
    let labelPrefix = '';
    switch(type) { // More descriptive prefixes
        case 'search': labelPrefix = 'Recherche'; break;
        case 'state': labelPrefix = 'État du projet'; break;
        case 'country': labelPrefix = 'Pays'; break;
        case 'sector': labelPrefix = 'Secteur'; break;
    }
    pill.innerHTML = `
      <span>${labelPrefix}: <strong>${value}</strong></span>
      <button data-filter="${type}" aria-label="Retirer le filtre ${labelPrefix}: ${value}"><i class="fas fa-times"></i></button>
    `;
    pillsContainer.appendChild(pill);
  });
  
  // Add event listeners to new pill buttons
  document.querySelectorAll('.filter-pill button').forEach(button => {
    button.addEventListener('click', function() {
      const filterType = this.dataset.filter;
      if (filterType === 'search') {
        activeFilters.search = '';
        document.getElementById('searchInput').value = ''; // Clear input field
      } else {
        activeFilters[filterType] = 'all'; // Reset select to 'all'
        const selectElement = document.getElementById(`${filterType}Filter`);
        if (selectElement) selectElement.value = 'all';
      }
      applyFilters(); // Re-apply filters and update display
    });
  });
}

// Populate table: Budget par Pays
function populateBudgetByCountryTable() {
  const tableBody = document.querySelector('#budgetByCountryTable tbody');
  if (!tableBody) return;
  tableBody.innerHTML = ''; // Clear previous entries
  
  // Aggregate data by country
  const countryData = allData.reduce((acc, row) => {
    const country = row.country || 'Non spécifié';
    if (!acc[country]) acc[country] = { budget: 0, count: 0 };
    acc[country].budget += row.budgetMillions || 0;
    acc[country].count += 1;
    return acc;
  }, {});
  
  // Convert to array, sort by budget descending, then by project count
  const aggregatedData = Object.entries(countryData)
    .map(([country, data]) => ({ country, budget: data.budget, count: data.count }))
    .sort((a, b) => b.budget - a.budget || b.count - a.count); 
  
  aggregatedData.forEach(entry => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${entry.country}</td>
      <td class="number-cell">${formatNumber(entry.budget)} M€</td>
      <td class="number-cell">${entry.count}</td>
    `;
    tableBody.appendChild(tr);
  });
}

// Generic Chart Creation Function
function createChart(ctx, type, data, options, chartKey) {
  if (!ctx) {
    // console.error(`Canvas context not found for ${chartKey}`);
    return;
  }
  if (chartInstances[chartKey]) {
    chartInstances[chartKey].destroy(); // Destroy existing chart instance
  }
  try {
    chartInstances[chartKey] = new Chart(ctx, { type, data, options });
  } catch (error) {
    console.error(`Error creating chart "${chartKey}":`, error);
    // Optionally display an error message in the chart container
    if (ctx.canvas && ctx.canvas.parentElement) {
        ctx.canvas.parentElement.innerHTML = `<p style="text-align:center;color:var(--secondary-color);padding:20px;">Erreur lors de la création du graphique.</p>`;
    }
  }
}

// Charting Functions (with minor improvements for responsiveness and clarity)
function updateBarChart() { // Top Projects by Budget
  const canvas = document.getElementById('barChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  const validData = allData.filter(row => row.budgetMillions > 0);
  validData.sort((a, b) => (b.budgetMillions || 0) - (a.budgetMillions || 0));
  
  const isMobile = window.innerWidth < 768;
  const maxItems = isMobile ? 5 : 10; // Show fewer items on mobile
  const topData = validData.slice(0, maxItems);
  
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height); // Gradient relative to canvas height
  gradient.addColorStop(0, 'rgba(52,152,219,0.9)');
  gradient.addColorStop(1, 'rgba(52,152,219,0.3)');
  
  const titleMaxLength = isMobile ? 18 : 30; // Shorter titles on mobile
  
  createChart(ctx, 'bar', {
    labels: topData.map(row => row.title.length > titleMaxLength ? row.title.substring(0, titleMaxLength) + '…' : row.title),
    datasets: [{
      label: 'Budget (M€)',
      data: topData.map(row => row.budgetMillions),
      backgroundColor: gradient,
      borderColor: 'rgba(52,152,219,1)',
      borderWidth: 1,
      borderRadius: 5,
      barPercentage: isMobile ? 0.85 : 0.7 // Adjust bar thickness for mobile
    }]
  }, {
    responsive: true, maintainAspectRatio: false, indexAxis: 'y', // Horizontal bar chart
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(44,62,80,0.95)',
        titleFont: { size: isMobile ? 12 : 14 }, bodyFont: { size: isMobile ? 11 : 13 },
        callbacks: {
          label: context => `Budget: ${formatNumber(context.parsed.x)} M€`,
          title: context => topData[context[0].dataIndex].title // Full title in tooltip
        }
      }
    },
    scales: {
      x: {
        beginAtZero: true, grid: { color: 'rgba(200,200,200,0.15)' },
        title: { display: true, text: 'Budget (M€)', font: { size: isMobile ? 10 : 12 } },
        ticks: { font: { size: isMobile ? 9 : 11 } }
      },
      y: { 
        grid: { display: false }, ticks: { font: { size: isMobile ? 9 : 11 } }
      }
    },
    animation: { delay: (context) => context.dataIndex * (isMobile ? 60 : 80), duration: isMobile ? 700 : 900, easing: 'easeOutQuad' }
  }, 'barChart');
}

function updatePieChart() { // Projects by State
  const canvas = document.getElementById('pieChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  const stateCounts = allData.reduce((acc, row) => {
    const st = row.state || "Non spécifié";
    acc[st] = (acc[st] || 0) + 1;
    return acc;
  }, {});
  
  const labels = Object.keys(stateCounts);
  const dataValues = Object.values(stateCounts);
  
  const baseColors = [ // Consistent color palette
    'rgba(52, 152, 219, 0.8)', 'rgba(46, 204, 113, 0.8)', 'rgba(231, 76, 60, 0.8)',
    'rgba(241, 196, 15, 0.8)', 'rgba(155, 89, 182, 0.8)', 'rgba(52, 73, 94, 0.8)',
    'rgba(230, 126, 34, 0.8)', 'rgba(149, 165, 166, 0.8)', 'rgba(26, 188, 156, 0.8)'
  ];
  // Cycle through colors if more labels than defined colors
  const colors = Array.from({length: labels.length}, (_, i) => baseColors[i % baseColors.length]);

  createChart(ctx, 'doughnut', {
    labels: labels,
    datasets: [{
      data: dataValues,
      backgroundColor: colors,
      borderColor: colors.map(c => c.replace('0.8', '1')), // Slightly darker border
      borderWidth: 1.5
    }]
  }, {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { 
        position: window.innerWidth < 768 ? 'bottom' : 'right', // Adjust legend for mobile
        labels: { padding: 15, boxWidth: 12, font: { size: 11 } } 
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const value = context.parsed;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
            return `${context.label}: ${value} projets (${percentage}%)`;
          }
        }
      }
    }
  }, 'pieChart');
}

function updateLineChart() { // Project Evolution by Year
  const canvas = document.getElementById('lineChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  const yearlyData = allData.reduce((acc, row) => {
    if (row.year && !isNaN(parseInt(row.year))) {
      const year = parseInt(row.year);
      if (year < 1980 || year > new Date().getFullYear() + 5) return acc; // Basic sanity check for year
      if (!acc[year]) acc[year] = { count: 0, budget: 0 };
      acc[year].count++;
      acc[year].budget += row.budgetMillions || 0;
    }
    return acc;
  }, {});
  
  const years = Object.keys(yearlyData).map(Number).sort((a,b)=>a-b);
  const counts = years.map(y => yearlyData[y].count);
  const budgets = years.map(y => yearlyData[y].budget);
  
  createChart(ctx, 'line', {
    labels: years.map(String),
    datasets: [
      {
        label: 'Nombre de Projets', data: counts, tension: 0.3, yAxisID: 'y',
        borderColor: 'rgba(52,152,219,1)', backgroundColor: 'rgba(52,152,219,0.5)',
        pointRadius: 4, pointHoverRadius: 7, fill: true
      },
      {
        label: 'Budget Total (M€)', data: budgets, tension: 0.3, yAxisID: 'y1',
        borderColor: 'rgba(46,204,113,1)', backgroundColor: 'rgba(46,204,113,0.5)',
        pointRadius: 4, pointHoverRadius: 7, fill: true
      }
    ]
  }, {
    responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
    plugins: {
      tooltip: {
        callbacks: {
          label: context => {
            const val = formatNumber(context.parsed.y);
            return context.datasetIndex === 0 ? `${val} projets` : `Budget: ${val} M€`;
          },
          title: context => `Année ${context[0].label}` // Show year in tooltip title
        }
      }
    },
    scales: {
      y: { type: 'linear', display: true, position: 'left', title: { display: true, text: 'Nombre de Projets' }, grid: { drawOnChartArea: true, color: 'rgba(200,200,200,0.1)' } },
      y1: { type: 'linear', display: true, position: 'right', title: { display: true, text: 'Budget Total (M€)' }, grid: { drawOnChartArea: false } }, // Only one Y-axis grid
      x: { title: { display: true, text: 'Année' }, grid: { color: 'rgba(200,200,200,0.1)' } }
    }
  }, 'lineChart');
}

function updateRegionChart() { // Regional Distribution
    const canvas = document.getElementById('regionChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const regionAggData = allData.reduce((acc, row) => {
        if (row.region && row.region !== "Non spécifié") {
            const region = row.region;
            if (!acc[region]) acc[region] = { count: 0, budget: 0 };
            acc[region].count++;
            acc[region].budget += row.budgetMillions || 0;
        }
        return acc;
    }, {});

    // Sort by project count, take top 15, or all if fewer
    const sortedRegions = Object.entries(regionAggData)
        .sort(([,a], [,b]) => b.count - a.count) 
        .slice(0, 15); 

    const regions = sortedRegions.map(([region]) => region);
    const counts = sortedRegions.map(([,data]) => data.count);
    const budgets = sortedRegions.map(([,data]) => data.budget);
    const isMobile = window.innerWidth < 768;

    createChart(ctx, 'bar', {
        labels: regions,
        datasets: [
            { label: 'Nombre de Projets', data: counts, backgroundColor: 'rgba(52,152,219,0.8)', yAxisID: 'y' },
            { label: 'Budget Total (M€)', data: budgets, backgroundColor: 'rgba(46,204,113,0.8)', yAxisID: 'y1' }
        ]
    }, {
        responsive: true, maintainAspectRatio: false, 
        indexAxis: isMobile && regions.length > 5 ? 'y' : 'x', // Horizontal on mobile if many regions
        plugins: {
            tooltip: {
                callbacks: {
                    label: context => {
                        // Handle both vertical and horizontal bar charts
                        const val = formatNumber(context.parsed.y != null ? context.parsed.y : context.parsed.x);
                        return context.datasetIndex === 0 ? `${val} projets` : `Budget: ${val} M€`;
                    }
                }
            }
        },
        scales: {
            // For y-axis (or x-axis if horizontal)
            [isMobile && regions.length > 5 ? 'x' : 'y']: { type: 'linear', display: true, position: 'left', title: { display: true, text: 'Nombre de Projets' } },
            // For y1-axis (or x1-axis if horizontal)
            [isMobile && regions.length > 5 ? 'x1' : 'y1']: { type: 'linear', display: true, position: 'right', title: { display: true, text: 'Budget Total (M€)' }, grid: { drawOnChartArea: false } },
            // For x-axis (or y-axis if horizontal)
            [isMobile && regions.length > 5 ? 'y' : 'x']: { ticks: { autoSkip: false, maxRotation: regions.length > 8 && !isMobile ? 45 : 0, minRotation: regions.length > 8 && !isMobile ? 45 : 0 } }
        }
    }, 'regionChart');
}


function updateSectorChart() { // Sectoral Distribution (Polar Area)
    const canvas = document.getElementById('sectorChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const sectorAggData = allData.reduce((acc, row) => {
        if (row.sector && row.sector !== "Non spécifié") {
            const sector = row.sector;
            if (!acc[sector]) acc[sector] = { count: 0, budget: 0 };
            acc[sector].count++;
            acc[sector].budget += row.budgetMillions || 0;
        }
        return acc;
    }, {});
    
    // Sort by budget, take top 10
    const sortedSectors = Object.entries(sectorAggData)
      .sort(([,a], [,b]) => b.budget - a.budget) 
      .slice(0, 10); 

    const sectors = sortedSectors.map(([sector]) => sector);
    const budgets = sortedSectors.map(([,data]) => data.budget);
    const counts = sortedSectors.map(([,data]) => data.count); // For tooltip

    const baseColors = [
        'rgba(52, 152, 219, 0.8)','rgba(46, 204, 113, 0.8)','rgba(231, 76, 60, 0.8)', 
        'rgba(241, 196, 15, 0.8)','rgba(155, 89, 182, 0.8)','rgba(52, 73, 94, 0.8)',  
        'rgba(230, 126, 34, 0.8)','rgba(149, 165, 166, 0.8)','rgba(26, 188, 156, 0.8)', 
        'rgba(211, 84, 0, 0.8)'
      ];
    const chartColors = Array.from({length: sectors.length}, (_, i) => baseColors[i % baseColors.length]);

    createChart(ctx, 'polarArea', {
        labels: sectors,
        datasets: [{
            data: budgets, // Polar area size based on budget
            backgroundColor: chartColors,
            borderColor: chartColors.map(c => c.replace('0.8', '1')),
            borderWidth: 1
        }]
    }, {
        responsive: true, maintainAspectRatio: false,
        plugins: {
            legend: { 
                position: window.innerWidth < 768 ? 'bottom' : 'right', 
                labels: { font: { size: window.innerWidth < 480 ? 8 : 10 }, padding: 10, boxWidth:10 } 
            },
            tooltip: {
                callbacks: {
                    label: context => { // Show budget and project count
                        const index = context.dataIndex;
                        return [`Budget: ${formatNumber(budgets[index])} M€`, `Projets: ${counts[index]}`];
                    }
                }
            }
        },
        scales: { r: { ticks: { backdropPadding: 0 }, pointLabels: { font: {size: window.innerWidth < 480 ? 8 : 9}, centerPointLabels: true } } }
    }, 'sectorChart');
}


function updateTimelineChart() { // Timeline of Projects by State
    const canvas = document.getElementById('timelineChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const stateYearlyData = allData.reduce((acc, row) => {
        if (row.year && !isNaN(parseInt(row.year))) {
            const year = parseInt(row.year);
            if (year < 1980 || year > new Date().getFullYear() + 5) return acc; // Sanity check
            const state = row.state || "Non spécifié";
            if (!acc[state]) acc[state] = {};
            if (!acc[state][year]) acc[state][year] = 0;
            acc[state][year]++;
        }
        return acc;
    }, {});

    let allYearsSet = new Set();
    Object.values(stateYearlyData).forEach(yearObj => Object.keys(yearObj).forEach(y => allYearsSet.add(Number(y))));
    const allYearsSorted = Array.from(allYearsSet).sort((a,b)=>a-b);

    const states = Object.keys(stateYearlyData);
    const baseColors = [ // Use a distinct set of colors for lines
        'rgba(52, 152, 219, 0.9)','rgba(231, 76, 60, 0.9)','rgba(46, 204, 113, 0.9)', 
        'rgba(241, 196, 15, 0.9)','rgba(155, 89, 182, 0.9)','rgba(52, 73, 94, 0.9)'
    ];

    // Select top N states by total project count for clarity, or all if few
    const stateTotals = states.map(state => ({
        name: state,
        total: Object.values(stateYearlyData[state]).reduce((sum, count) => sum + count, 0)
    })).sort((a,b) => b.total - a.total);
    
    const topNStates = stateTotals.slice(0, 5).map(s => s.name); // Top 5 states

    const datasets = topNStates.map((state, index) => {
        const data = allYearsSorted.map(year => stateYearlyData[state][year] || 0);
        const color = baseColors[index % baseColors.length];
        return {
            label: state, data: data, tension: 0.3,
            borderColor: color, backgroundColor: color.replace('0.9','0.2'), // Lighter fill
            fill: false, // Set to true for area chart style, false for clean lines
            pointRadius: 3, pointHoverRadius: 6
        };
    });
    
    createChart(ctx, 'line', { 
        labels: allYearsSorted.map(String), 
        datasets: datasets 
    }, {
        responsive: true, maintainAspectRatio: false,
        plugins: { tooltip: { mode: 'index', intersect: false } },
        scales: {
            y: { stacked: false, title: { display: true, text: 'Nombre de Projets' }, grid: {color: 'rgba(200,200,200,0.1)'} },
            x: { title: { display: true, text: 'Année' }, grid: {color: 'rgba(200,200,200,0.1)'} }
        }
    }, 'timelineChart');
}


// Setup all event listeners for filters and controls
function setupEventListeners() {
  // Search input: 'input' event for immediate feedback
  document.getElementById('searchInput')?.addEventListener('input', function() {
    activeFilters.search = this.value.trim(); // Store trimmed search term
    applyFilters();
  });
  
  // Select filters (state, country, sector)
  ['stateFilter', 'countryFilter', 'sectorFilter'].forEach(filterId => {
    document.getElementById(filterId)?.addEventListener('change', function() {
      activeFilters[filterId.replace('Filter', '')] = this.value; // Update corresponding activeFilter
      applyFilters();
    });
  });
  
  // Sort field change
  document.getElementById('sortField')?.addEventListener('change', sortData); // Call sortData directly
  
  // Pagination controls
  document.getElementById('prevPage')?.addEventListener('click', () => {
    if (currentPage > 1) { currentPage--; populateTable(); }
  });
  
  document.getElementById('nextPage')?.addEventListener('click', () => {
    // Check if there are more items for the next page
    if ((currentPage * itemsPerPage) < filteredData.length) { currentPage++; populateTable(); }
  });
}