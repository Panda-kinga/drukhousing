// Populate location selects from the page's server-rendered data first.
// This avoids leaving the dropdowns empty if the API request is blocked or fails.
(async function () {
  const forms = document.querySelectorAll("[data-location-form], [data-location-search]");
  if (!forms.length) return;

  let locations = null;
  for (const form of forms) {
    if (!form.dataset.locations) continue;
    try {
      locations = JSON.parse(form.dataset.locations);
      if (locations && typeof locations === "object" && Object.keys(locations).length) break;
      locations = null;
    } catch (error) {
      locations = null;
    }
  }

  if (!locations) {
    try {
      const response = await fetch("/api/locations", { cache: "no-store" });
      if (!response.ok) throw new Error("Location request failed");
      locations = await response.json();
    } catch (error) {
      document.querySelectorAll("[data-location-error]").forEach((item) => {
        item.textContent = "Location choices could not load. Please refresh the page and try again.";
      });
      return;
    }
  }

  for (const form of forms) {
    const dzongkhagSelect = form.querySelector("[data-dzongkhag]");
    const gewogSelect = form.querySelector("[data-gewog]");
    if (!dzongkhagSelect || !gewogSelect) continue;

    const savedDzongkhag = form.dataset.dzongkhagValue || "";
    let savedGewog = form.dataset.gewogValue || "";
    for (const name of Object.keys(locations)) {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      dzongkhagSelect.appendChild(option);
    }
    if (savedDzongkhag) dzongkhagSelect.value = savedDzongkhag;

    function refillGewogs() {
      gewogSelect.replaceChildren();
      const first = document.createElement("option");
      first.value = "";
      first.textContent = form.matches("[data-location-search]") ? "All Gewogs" : "Choose Gewog";
      gewogSelect.appendChild(first);
      const list = locations[dzongkhagSelect.value] || [];
      for (const name of list) {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        gewogSelect.appendChild(option);
      }
      gewogSelect.disabled = !dzongkhagSelect.value;
      if (savedGewog && list.includes(savedGewog)) gewogSelect.value = savedGewog;
    }

    dzongkhagSelect.addEventListener("change", () => {
      savedGewog = "";
      refillGewogs();
    });
    refillGewogs();
  }
})();
