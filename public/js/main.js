// The server still validates every action. This only helps the user avoid a misclick.
const forms = document.querySelectorAll("form[data-confirm]");
for (const form of forms) {
  form.addEventListener("submit", function (event) {
    if (!window.confirm(form.dataset.confirm)) event.preventDefault();
  });
}

for (const button of document.querySelectorAll("[data-password-toggle]")) {
  button.addEventListener("click", () => {
    const input = document.getElementById(button.getAttribute("aria-controls"));
    if (!input) return;
    const visible = input.type === "text";
    input.type = visible ? "password" : "text";
    button.textContent = visible ? "Show" : "Hide";
    button.setAttribute("aria-label", visible ? "Show password" : "Hide password");
  });
}

for (const image of document.querySelectorAll("[data-image-fallback]")) {
  image.addEventListener("error", () => {
    image.onerror = null;
    image.src = "/images/bhutan-home.png";
    image.alt = "DrukHousing home placeholder";
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

const liveSearch = document.querySelector("form[data-live-search]");
const listingGrid = document.querySelector(".listing-grid");
if (liveSearch && listingGrid) {
  liveSearch.addEventListener("submit", async (event) => {
    event.preventDefault();
    const query = new URLSearchParams(new FormData(liveSearch));
    try {
      const response = await fetch("/api/properties?" + query.toString());
      if (!response.ok) throw new Error("Search failed");
      const listings = await response.json();
      listingGrid.replaceChildren();
      for (const listing of listings) {
        const card = document.createElement("article");
        card.className = "listing-card";
        const link = document.createElement("a");
        link.className = "card-image";
        link.href = "/listings/" + listing.id;
        if (listing.photo_id) {
          const image = document.createElement("img");
          image.src = "/photos/" + listing.photo_id;
          image.alt = "Photo of " + listing.title;
          image.loading = "lazy";
          image.addEventListener("error", () => {
            image.onerror = null;
            image.src = "/images/bhutan-home.png";
            image.alt = "DrukHousing home placeholder";
          });
          link.appendChild(image);
        } else {
          const empty = document.createElement("div");
          empty.className = "no-photo";
          empty.textContent = "No photo available";
          link.appendChild(empty);
        }
        const tag = document.createElement("span");
        tag.className = "type-tag";
        tag.textContent = listing.type;
        link.appendChild(tag);
        card.appendChild(link);
        const body = document.createElement("div");
        body.className = "card-body";
        const area = document.createElement("p");
        area.className = "location";
        area.textContent = [listing.gewog, listing.dzongkhag].filter(Boolean).join(", ");
        body.appendChild(area);
        const heading = document.createElement("h3");
        const titleLink = document.createElement("a");
        titleLink.href = "/listings/" + listing.id;
        titleLink.textContent = listing.title;
        heading.appendChild(titleLink);
        body.appendChild(heading);
        const homeName = document.createElement("p");
        homeName.textContent = listing.location;
        body.appendChild(homeName);
        card.appendChild(body);
        listingGrid.appendChild(card);
      }
    } catch (error) {
      liveSearch.submit();
    }
  });
}
