// Gemsistem JS
document.addEventListener('DOMContentLoaded', () => {
  // Auto-hide flash messages after 4s
  document.querySelectorAll('.flash').forEach(el => {
    setTimeout(() => el.style.opacity = '0', 4000);
    setTimeout(() => el.remove(), 4400);
  });
});
