// Fill location selects from the server's trusted list.
(async function () {
  const forms = document.querySelectorAll("[data-location-form], [data-location-search]");
  if (!forms.length) return;
  let locations;
  try {
    const response = await fetch("/api/locations");
    if (!response.ok) throw new Error("Location request failed");
    locations = await response.json();
  } catch (error) {
    document.querySelectorAll("[data-location-error]").forEach((item) => {
      item.textContent = "Location choices are unavailable. You can still submit and the server will validate them.";
    });
    return;
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
