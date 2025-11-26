// Dashboard-specific JavaScript

document.addEventListener('DOMContentLoaded', () => {
  // Add click handlers for service cards
  const serviceCards = document.querySelectorAll('.service-card');

  serviceCards.forEach(card => {
    card.addEventListener('click', (e) => {
      // Don't trigger if clicking a button
      if (e.target.tagName === 'A' || e.target.closest('a')) {
        return;
      }

      const link = card.querySelector('a.btn');
      if (link) {
        window.location.href = link.href;
      }
    });

    // Add hover effect
    card.style.cursor = 'pointer';
  });

  // Animate subscription stats on load
  animateNumbers();

  // Add confirmation for unsubscribe actions
  const unsubscribeForms = document.querySelectorAll('form[action*="unsubscribe"]');
  unsubscribeForms.forEach(form => {
    form.addEventListener('submit', (e) => {
      if (!confirm('Are you sure you want to unsubscribe from this service?')) {
        e.preventDefault();
      }
    });
  });
});

// Animate numbers counting up
function animateNumbers() {
  const statNumbers = document.querySelectorAll('.stat-number');

  statNumbers.forEach(stat => {
    const text = stat.textContent;
    if (!isNaN(text)) {
      const target = parseInt(text);
      let current = 0;
      const increment = target / 30;
      const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
          stat.textContent = target;
          clearInterval(timer);
        } else {
          stat.textContent = Math.floor(current);
        }
      }, 30);
    }
  });
}

// Handle service subscription updates
async function updateServiceSubscription(serviceName, action) {
  try {
    const response = await fetch(`/dashboard/service/${serviceName}/${action}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      window.ACOService.showToast(
        action === 'subscribe' ? 'Successfully subscribed!' : 'Successfully unsubscribed!',
        'success'
      );
      setTimeout(() => window.location.reload(), 1500);
    } else {
      throw new Error('Request failed');
    }
  } catch (error) {
    window.ACOService.showToast('An error occurred. Please try again.', 'error');
  }
}

// Filter services by type
function filterServices(type) {
  const sections = document.querySelectorAll('.service-section');
  sections.forEach(section => {
    if (type === 'all') {
      section.style.display = 'block';
    } else {
      const title = section.querySelector('.section-title').textContent.toLowerCase();
      section.style.display = title.includes(type) ? 'block' : 'none';
    }
  });
}

// Export functions
window.DashboardService = {
  updateServiceSubscription,
  filterServices
};
