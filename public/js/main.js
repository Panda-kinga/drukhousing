// The server still validates every action. This only helps the user avoid a misclick.
const forms = document.querySelectorAll("form[data-confirm]");
for (const form of forms) {
  form.addEventListener("submit", function (event) {
    if (!window.confirm(form.dataset.confirm)) event.preventDefault();
  });
}

const animatedItems = document.querySelectorAll(
  ".page, .detail, .auth-layout, .form-panel, .message-panel, .site-footer, " +
    ".hero-copy, .hero-image, .homes-section, .listing-card, .stats > div, " +
    ".application-row, .review-card, .feedback-card, .photo-gallery, .detail-bottom",
);
animatedItems.forEach((item, index) => {
  item.classList.add("animate-in");
  item.style.setProperty("--animation-delay", `${Math.min(index * 45, 360)}ms`);
});
