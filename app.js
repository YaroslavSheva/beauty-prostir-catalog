const FALLBACK_CATALOG_DATA = window.CATALOG_DATA || {
  products: [],
  sheetNames: [],
  stats: [],
};
let data = FALLBACK_CATALOG_DATA;

const CATALOG_API_URL =
  "https://script.google.com/macros/s/AKfycbwpB6Diw0bzeecz8Dg5RkDuRq2CNefVv-hkeTTsUFgcy-sz9f_1fwAvPuHhLf4Y46w/exec";
const state = {
  search: "",
  brand: "all",
  category: "all",
  country: "all",
  page: 1,
};

const PAGE_SIZE = 12;
const TELEGRAM_URL = "https://t.me/hairshop_as";
const CART_STORAGE_KEY = "beautyProstirCart";
const ORDER_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbxZCTh6kCd--FDCowZk992kEP9g0bicEkcXXjXH5qPW8RqDSl2UNLw_Xk7wBlAV8sA/exec";
const SHEET_ID = "176k_669MlPOKsGjVsIdUHTcxq2vtj0xzHDO3_y2wJPM";
const PRODUCT_CARD_THUMB_SIZE = 600;
const PRODUCT_HERO_THUMB_SIZE = 1000;

const els = {
  grid: document.querySelector("#product-grid"),
  search: document.querySelector("#search"),
  brand: document.querySelector("#brand-filter"),
  category: document.querySelector("#category-filter"),
  country: document.querySelector("#country-filter"),
  reset: document.querySelector("#reset-filters"),
  count: document.querySelector("#result-count"),
  metricProducts: document.querySelector("#metric-products"),
  metricBrands: document.querySelector("#metric-brands"),
  metricCategories: document.querySelector("#metric-categories"),
  prev: document.querySelector("#prev-page"),
  next: document.querySelector("#next-page"),
  pageStatus: document.querySelector("#page-status"),
  cartCount: document.querySelector("#cart-count"),
  cartItems: document.querySelector("#cart-items"),
  cartEmpty: document.querySelector("#cart-empty"),
  cartSubtotal: document.querySelector("#cart-subtotal"),
  cartDiscountLabel: document.querySelector("#cart-discount-label"),
  cartDiscount: document.querySelector("#cart-discount"),
  cartDelivery: document.querySelector("#cart-delivery"),
  cartTotal: document.querySelector("#cart-total"),
  discountNote: document.querySelector("#discount-note"),
  checkoutForm: document.querySelector("#checkout-form"),
  checkoutNote: document.querySelector("#checkout-note"),
  checkoutSuccess: document.querySelector("#checkout-success"),
  checkoutSuccessMessage: document.querySelector("#checkout-success-message"),
  checkoutSuccessOrder: document.querySelector("#checkout-success-order"),
  checkoutSuccessReset: document.querySelector("#checkout-success-reset"),
  consultationForm: document.querySelector("#consultation-form"),
  consultationNote: document.querySelector("#consultation-note"),
  heroProductName: document.querySelector("#hero-product-name"),
  heroProductMeta: document.querySelector("#hero-product-meta"),
  heroProductPrice: document.querySelector("#hero-product-price"),
  heroProductBrand: document.querySelector("#hero-product-brand"),
  heroProductCart: document.querySelector("#hero-product-cart"),
  heroProductPhoto: document.querySelector("#hero-product-photo"),
  imageLightbox: document.querySelector("#image-lightbox"),
  imageLightboxPhoto: document.querySelector("#image-lightbox-photo"),
  imageLightboxClose: document.querySelector("#image-lightbox-close"),
  siteToast: document.querySelector("#site-toast"),
  siteToastTitle: document.querySelector("#site-toast-title"),
  siteToastMessage: document.querySelector("#site-toast-message"),
  successModal: document.querySelector("#success-modal"),
  successModalClose: document.querySelector("#success-modal-close"),
  successModalCatalog: document.querySelector("#success-modal-catalog"),
};

let toastTimeoutId = 0;
let photoSyncTimeoutId = 0;

const clean = (value) => String(value ?? "").trim();
const getFormField = (form, name) => clean(form?.elements[name]?.value);
const getCheckedField = (form, name) =>
  clean(form?.querySelector(`[name="${name}"]:checked`)?.value);
const onlyDigits = (value) => clean(value).replace(/\D/g, "");
const escapeHtml = (value) =>
  clean(value).replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[char],
  );

function resolvePhotoUrl(value) {
  return resolvePhotoUrlForSize(value, PRODUCT_CARD_THUMB_SIZE);
}

function resolvePhotoUrlForSize(value, size = PRODUCT_CARD_THUMB_SIZE) {
  const raw = clean(value);
  if (!raw) {
    return "";
  }

  const driveMatch =
    raw.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
    raw.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (driveMatch) {
    return `https://drive.google.com/thumbnail?id=${driveMatch[1]}&sz=w${size}`;
  }

  return raw;
}

function openImageLightbox(src, alt) {
  if (!els.imageLightbox || !els.imageLightboxPhoto || !src) {
    return;
  }
  els.imageLightboxPhoto.src = src;
  els.imageLightboxPhoto.alt = alt || "Фото товару";
  els.imageLightbox.hidden = false;
  els.imageLightbox.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeImageLightbox() {
  if (!els.imageLightbox || !els.imageLightboxPhoto) {
    return;
  }
  els.imageLightbox.hidden = true;
  els.imageLightbox.setAttribute("aria-hidden", "true");
  els.imageLightboxPhoto.src = "";
  els.imageLightboxPhoto.alt = "";
  document.body.style.overflow = "";
}

function openSuccessModal() {
  if (!els.successModal) {
    return;
  }
  els.successModal.hidden = false;
  els.successModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeSuccessModal() {
  if (!els.successModal) {
    return;
  }
  els.successModal.hidden = true;
  els.successModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function goToCatalogFromSuccessModal(event) {
  event?.preventDefault();
  closeSuccessModal();
  document
    .querySelector("#catalog")
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function preventGestureZoom() {
  document.addEventListener("gesturestart", (event) => {
    event.preventDefault();
  });
  document.addEventListener("gesturechange", (event) => {
    event.preventDefault();
  });
  document.addEventListener("gestureend", (event) => {
    event.preventDefault();
  });
  document.addEventListener(
    "touchmove",
    (event) => {
      if (event.touches.length > 1) {
        event.preventDefault();
      }
    },
    { passive: false },
  );
}

function showCheckoutSuccess(order) {
  if (!els.checkoutForm || !els.checkoutSuccess) {
    return;
  }
  if (els.checkoutSuccessMessage) {
    els.checkoutSuccessMessage.textContent =
      "Менеджер Beauty Prostir зв'яжеться з вами для уточнення деталей замовлення, підтвердження наявності та доставки.";
  }
  if (els.checkoutSuccessOrder) {
    els.checkoutSuccessOrder.textContent = `Номер замовлення: ${order.order_id}`;
  }
  els.checkoutForm.hidden = true;
  els.checkoutSuccess.hidden = false;
  els.checkoutSuccess.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetCheckoutSuccess() {
  if (!els.checkoutForm || !els.checkoutSuccess) {
    return;
  }
  els.checkoutSuccess.hidden = true;
  els.checkoutForm.hidden = false;
}

function showToast({ title, message, tone = "success", duration = 4200 }) {
  if (!els.siteToast || !els.siteToastTitle || !els.siteToastMessage) {
    return;
  }

  window.clearTimeout(toastTimeoutId);
  els.siteToast.hidden = false;
  els.siteToast.dataset.tone = tone;
  els.siteToastTitle.textContent = title;
  els.siteToastMessage.textContent = message;
  requestAnimationFrame(() => {
    els.siteToast.classList.add("is-visible");
  });

  toastTimeoutId = window.setTimeout(() => {
    els.siteToast.classList.remove("is-visible");
    window.setTimeout(() => {
      els.siteToast.hidden = true;
    }, 180);
  }, duration);
}

function setCatalogLoadingState(isLoading) {
  const loadingText = "Завантажуємо актуальні ціни з таблиці...";

  [
    els.search,
    els.brand,
    els.category,
    els.country,
    els.reset,
    els.prev,
    els.next,
    els.heroProductCart,
  ].forEach((element) => {
    if (element) {
      element.disabled = isLoading;
    }
  });

  if (els.grid && isLoading) {
    els.grid.innerHTML = `<div class="empty-state">${loadingText}</div>`;
  }

  if (isLoading) {
    if (els.count) {
      els.count.textContent = "Завантаження...";
    }
    if (els.pageStatus) {
      els.pageStatus.textContent = "Синхронізація з таблицею...";
    }
    if (els.metricProducts) {
      els.metricProducts.textContent = "—";
    }
    if (els.metricBrands) {
      els.metricBrands.textContent = "—";
    }
    if (els.metricCategories) {
      els.metricCategories.textContent = "—";
    }
  }
}

function handleProductPhotoLoad(event) {
  const img = event.target;
  if (!img || !img.classList?.contains("product-photo-image")) {
    return;
  }

  img.classList.add("is-loaded");
}

function handleProductPhotoError(event) {
  const img = event.target;
  if (!img || !img.classList?.contains("product-photo-image")) {
    return;
  }

  const wrapper = img.closest(".product-photo");
  if (!wrapper) {
    return;
  }

  img.remove();
  wrapper.classList.add("product-photo--placeholder");
}

function loadGvizSheet(sheetName) {
  return new Promise((resolve, reject) => {
    const callbackName = `bpSheetSync_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement("script");
    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error(`Sheet timeout: ${sheetName}`));
    }, 12000);

    function cleanup() {
      window.clearTimeout(timeoutId);
      delete window[callbackName];
      script.remove();
    }

    window[callbackName] = (response) => {
      cleanup();
      resolve(response);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error(`Sheet load failed: ${sheetName}`));
    };

    script.src = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?sheet=${encodeURIComponent(sheetName)}&tqx=out:json;responseHandler:${callbackName}`;
    document.head.append(script);
  });
}

function extractPhotoMapFromGviz(response) {
  const table = response?.table;
  const cols = table?.cols || [];
  const rows = table?.rows || [];
  const skuIndex = cols.findIndex(
    (col) => clean(col?.label).toLowerCase() === "sku",
  );
  const photoIndex = cols.findIndex(
    (col) => clean(col?.label).toLowerCase() === "photo url",
  );

  if (skuIndex < 0 || photoIndex < 0) {
    return new Map();
  }

  const photoMap = new Map();
  rows.forEach((row) => {
    const cells = row?.c || [];
    const sku = clean(cells[skuIndex]?.v);
    const photoUrl = resolvePhotoUrl(cells[photoIndex]?.v);
    if (sku && photoUrl) {
      photoMap.set(sku, photoUrl);
    }
  });
  return photoMap;
}

async function syncRemotePhotos() {
  const sheetEntries =
    Array.isArray(data.sheetNames) && data.sheetNames.length
      ? data.sheetNames
      : (data.stats || []).map((entry) => entry?.sheet);
  const sheets = sheetEntries.map(clean).filter((sheet) => sheet.endsWith("_CLEAN"));

  if (!sheets.length) {
    return;
  }

  const results = await Promise.allSettled(sheets.map(loadGvizSheet));
  const mergedPhotoMap = new Map();

  results.forEach((result) => {
    if (result.status !== "fulfilled") {
      return;
    }
    extractPhotoMapFromGviz(result.value).forEach((photoUrl, sku) => {
      mergedPhotoMap.set(sku, photoUrl);
    });
  });

  if (!mergedPhotoMap.size) {
    return;
  }

  let updated = false;
  products.forEach((product) => {
    const remotePhoto = mergedPhotoMap.get(product.sku);
    if (remotePhoto && remotePhoto !== product.photoUrl) {
      product.photoUrl = remotePhoto;
      updated = true;
    }
  });

  if (updated) {
    renderProducts();
    renderHeroSpotlight();
  }
}

function schedulePhotoSync() {
  window.clearTimeout(photoSyncTimeoutId);
  photoSyncTimeoutId = window.setTimeout(() => {
    syncRemotePhotos().catch(() => {});
  }, 3500);
}

let products = [];
let productsBySku = new Map();
let featuredProduct = null;
let cart = loadCart();

function buildProducts(catalogData) {
  return (catalogData.products || [])
    .filter((product) => clean(product.selected).toLowerCase() === "yes")
    .map((product) => ({
      ...product,
      sku: clean(product.sku),
      brand: clean(product.brand),
      country: clean(product.country),
      category: clean(product.category),
      name: clean(product.name || product.product).replace(/\s+/g, " "),
      volume: clean(product.volume),
      supplier: clean(product.supplier),
      price: Number(product.my_retail || product.retail_price || 0),
      photoUrl: resolvePhotoUrl(product.photo_url || product.photoUrl),
    }))
    .filter((product) => product.sku && product.name);
}

function optionExists(select, value) {
  return [...select.options].some((option) => option.value === value);
}

function applyCatalog(catalogData) {
  data = catalogData || FALLBACK_CATALOG_DATA;
  products = buildProducts(data);
  productsBySku = new Map(products.map((product) => [product.sku, product]));
  featuredProduct = products[0] || null;

  fillSelect(els.brand, uniqueValues("brand"), "Усі бренди");
  fillSelect(els.category, uniqueValues("category"), "Усі категорії");
  fillSelect(els.country, uniqueValues("country"), "Усі країни");

  if (optionExists(els.brand, state.brand)) {
    els.brand.value = state.brand;
  } else {
    state.brand = "all";
    els.brand.value = "all";
  }

  if (optionExists(els.category, state.category)) {
    els.category.value = state.category;
  } else {
    state.category = "all";
    els.category.value = "all";
  }

  if (optionExists(els.country, state.country)) {
    els.country.value = state.country;
  } else {
    state.country = "all";
    els.country.value = "all";
  }

  renderMetrics();
  renderProducts();
  renderCart();
  renderHeroSpotlight();
}

function loadCatalogFromApi() {
  return new Promise((resolve, reject) => {
    if (!CATALOG_API_URL || CATALOG_API_URL.includes("ТУТ_ВСТАВ")) {
      reject(new Error("Catalog API URL is missing"));
      return;
    }

    const callbackName = `bpCatalog_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement("script");
    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error("Catalog API timeout"));
    }, 15000);

    function cleanup() {
      window.clearTimeout(timeoutId);
      delete window[callbackName];
      script.remove();
    }

    window[callbackName] = (payload) => {
      cleanup();

      if (!payload || !Array.isArray(payload.products)) {
        reject(new Error("Invalid catalog payload"));
        return;
      }

      resolve(payload);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("Catalog API load failed"));
    };

    const separator = CATALOG_API_URL.includes("?") ? "&" : "?";
    script.src = `${CATALOG_API_URL}${separator}callback=${callbackName}&_=${Date.now()}`;
    document.head.append(script);
  });
}

async function refreshCatalog({ initial = false, silent = true } = {}) {
  try {
    const remoteCatalog = await loadCatalogFromApi();
    applyCatalog(remoteCatalog);
    schedulePhotoSync();

    if (!silent) {
      showToast({
        title: "Каталог оновлено",
        message: "Дані підтягнуті з Google Таблиці.",
        tone: "success",
      });
    }
  } catch (error) {
    if (!silent || initial) {
      showToast({
        title: "Каталог не оновився",
        message:
          "Показуємо резервні дані. Перевірте Apps Script або доступ до таблиці.",
        tone: "warning",
      });
    }
  }
}

function uniqueValues(key) {
  return [
    ...new Set(products.map((product) => clean(product[key])).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b, "uk"));
}

function fillSelect(select, values, label) {
  select.innerHTML = "";
  const all = document.createElement("option");
  all.value = "all";
  all.textContent = label;
  select.append(all);
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.append(option);
  });
}

function formatPrice(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return "ціну уточнити";
  }
  return new Intl.NumberFormat("uk-UA", {
    style: "currency",
    currency: "UAH",
    maximumFractionDigits: 0,
  }).format(value);
}

function makeOrderId() {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `BP-${datePart}-${randomPart}`;
}

function getCheckoutPhone() {
  const digits = onlyDigits(getFormField(els.checkoutForm, "phone"));
  return digits ? `+380${digits.slice(0, 9)}` : "";
}

function getFormattedUaPhone(form) {
  const digits = onlyDigits(getFormField(form, "phone"));
  return digits ? `+380${digits.slice(0, 9)}` : "";
}

function loadCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || "{}");
    return Object.fromEntries(
      Object.entries(saved)
        .map(([sku, quantity]) => [clean(sku), Number(quantity)])
        .filter(
          ([sku, quantity]) => sku && Number.isFinite(quantity) && quantity > 0,
        ),
    );
  } catch (_error) {
    return {};
  }
}

function saveCart() {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
}

function getCartItems() {
  return Object.entries(cart)
    .map(([sku, quantity]) => ({
      product: productsBySku.get(sku),
      quantity,
    }))
    .filter((item) => item.product);
}

function getCartTotal() {
  return getCartItems().reduce(
    (total, item) => total + item.product.price * item.quantity,
    0,
  );
}

function getDiscountRate(subtotal) {
  if (subtotal >= 2000) {
    return 0.05;
  }
  if (subtotal >= 1500) {
    return 0.04;
  }
  if (subtotal >= 1000) {
    return 0.03;
  }
  return 0;
}

function getOrderSummary() {
  const subtotal = getCartTotal();
  const discountRate = getDiscountRate(subtotal);
  const discountAmount = Math.round(subtotal * discountRate);
  const finalTotal = Math.max(0, subtotal - discountAmount);
  const freeDelivery = subtotal >= 2000;

  return {
    subtotal,
    discountRate,
    discountPercent: Math.round(discountRate * 100),
    discountAmount,
    finalTotal,
    freeDelivery,
  };
}

function getCartCount() {
  return getCartItems().reduce((total, item) => total + item.quantity, 0);
}

function changeCartItem(sku, quantity) {
  if (!productsBySku.has(sku)) {
    return;
  }
  if (quantity <= 0) {
    delete cart[sku];
  } else {
    cart[sku] = quantity;
  }
  saveCart();
  renderCart();
  renderProducts();
}

function addToCart(sku) {
  changeCartItem(sku, (cart[sku] || 0) + 1);
}

function productMatches(product) {
  const haystack = [
    product.sku,
    product.brand,
    product.name,
    product.category,
    product.country,
    product.supplier,
  ]
    .join(" ")
    .toLowerCase();

  return (
    (!state.search || haystack.includes(state.search.toLowerCase())) &&
    (state.brand === "all" || product.brand === state.brand) &&
    (state.category === "all" || product.category === state.category) &&
    (state.country === "all" || product.country === state.country)
  );
}

function renderProducts() {
  const filtered = products.filter(productMatches);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  state.page = Math.min(state.page, pageCount);
  const start = (state.page - 1) * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);

  els.count.textContent = `${filtered.length} позицій`;
  els.pageStatus.textContent = `Сторінка ${state.page} з ${pageCount}`;
  els.prev.disabled = state.page <= 1;
  els.next.disabled = state.page >= pageCount;

  if (!filtered.length) {
    els.grid.innerHTML =
      '<div class="empty-state">Нічого не знайдено. Спробуйте інший бренд, категорію або пошуковий запит.</div>';
    els.pageStatus.textContent = "Немає результатів";
    return;
  }

  els.grid.innerHTML = visible
    .map((product) => {
      const tags = [product.category, product.volume, product.country].filter(
        Boolean,
      );
      const isInCart = Boolean(cart[product.sku]);
      return `
        <article class="product-card">
          <div class="product-photo${product.photoUrl ? "" : " product-photo--placeholder"}">
            <span class="product-photo-placeholder">${escapeHtml(product.brand || "Beauty Prostir")}</span>
            ${
              product.photoUrl
                ? `<img class="product-photo-image" src="${escapeHtml(product.photoUrl)}" alt="${escapeHtml(product.name)}" loading="lazy" decoding="async" width="600" height="600" data-photo-preview="true" />`
                : ""
            }
          </div>
          <div class="product-top">
            <button class="brand-chip brand-chip-button" type="button" data-brand-filter="${escapeHtml(product.brand)}" title="Показати всі товари бренду ${escapeHtml(product.brand)}">${escapeHtml(product.brand || "Brand")}</button>
          </div>
          <div>
            <h3 class="product-name">${escapeHtml(product.name)}</h3>
            <div class="meta">
              ${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
            </div>
          </div>
          <div class="price-row">
            <span class="price">${formatPrice(product.price)}</span>
            <button class="order-link add-to-cart${isInCart ? " in-cart" : ""}" type="button" data-sku="${escapeHtml(product.sku)}" ${isInCart ? "disabled" : ""}>${isInCart ? "У кошику" : "Додати в кошик"}</button>
            <a class="consult-link" href="#consultation">Потрібна консультація</a>
          </div>
        </article>
      `;
    })
    .join("");
}

function applyBrandFilter(brand) {
  if (!brand) {
    return;
  }
  state.search = "";
  state.brand = brand;
  state.category = "all";
  state.country = "all";
  state.page = 1;
  els.search.value = "";
  els.brand.value = brand;
  els.category.value = "all";
  els.country.value = "all";
  renderProducts();
  document
    .querySelector("#catalog")
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderMetrics() {
  if (!els.metricProducts || !els.metricBrands || !els.metricCategories) {
    return;
  }
  const brands = uniqueValues("brand").length;
  const categories = uniqueValues("category").length;
  els.metricProducts.textContent = products.length;
  els.metricBrands.textContent = brands;
  els.metricCategories.textContent = categories;
}

function renderHeroSpotlight() {
  if (!featuredProduct || !els.heroProductName) {
    return;
  }

  const meta = [
    featuredProduct.category,
    featuredProduct.volume,
    featuredProduct.country,
  ]
    .filter(Boolean)
    .join(" · ");
  const isInCart = Boolean(cart[featuredProduct.sku]);

  els.heroProductName.textContent = featuredProduct.name;
  els.heroProductMeta.textContent = meta || "Підібрано з актуального каталогу";
  els.heroProductPrice.textContent = formatPrice(featuredProduct.price);
  els.heroProductBrand.textContent = featuredProduct.brand || "Beauty Prostir";
  els.heroProductCart.dataset.sku = featuredProduct.sku;
  els.heroProductCart.textContent = isInCart ? "У кошику" : "Додати в кошик";
  els.heroProductCart.disabled = isInCart;
  if (els.heroProductPhoto && featuredProduct.photoUrl) {
    els.heroProductPhoto.src = resolvePhotoUrlForSize(
      featuredProduct.photoUrl,
      PRODUCT_HERO_THUMB_SIZE,
    );
    els.heroProductPhoto.alt = featuredProduct.name;
  }
}

function renderCart() {
  const items = getCartItems();
  const summary = getOrderSummary();
  els.cartCount.textContent = getCartCount();
  els.cartSubtotal.textContent =
    summary.subtotal > 0 ? formatPrice(summary.subtotal) : "0 грн";
  els.cartDiscountLabel.textContent = summary.discountPercent
    ? `Знижка ${summary.discountPercent}%`
    : "Знижка";
  els.cartDiscount.textContent =
    summary.discountAmount > 0
      ? `-${formatPrice(summary.discountAmount)}`
      : "0 грн";
  els.cartDelivery.textContent = summary.freeDelivery
    ? "безкоштовно на відділення Нової пошти по Україні"
    : "за тарифами Нової пошти";
  els.cartTotal.textContent =
    summary.finalTotal > 0 ? formatPrice(summary.finalTotal) : "0 грн";
  els.discountNote.textContent = summary.freeDelivery
    ? "Застосовано знижку 5% і безкоштовну доставку на відділення Нової пошти по Україні."
    : "Знижка 3% від 1000 грн, 4% від 1500 грн, 5% і безкоштовна доставка від 2000 грн.";
  els.cartEmpty.hidden = items.length > 0;

  els.cartItems.innerHTML = items
    .map(({ product, quantity }) => {
      const lineTotal = product.price * quantity;
      return `
        <article class="cart-item">
          <div class="cart-item-main">
            <h3>${escapeHtml(product.name)}</h3>
            <p>${escapeHtml([product.brand, product.volume, product.country].filter(Boolean).join(" · "))}</p>
          </div>
          <div class="cart-item-side">
            <span class="cart-line-price">${formatPrice(lineTotal)}</span>
            <div class="quantity-control" aria-label="Кількість">
              <button type="button" data-cart-action="decrease" data-sku="${escapeHtml(product.sku)}">-</button>
              <span>${quantity}</span>
              <button type="button" data-cart-action="increase" data-sku="${escapeHtml(product.sku)}">+</button>
            </div>
            <button class="remove-item" type="button" data-cart-action="remove" data-sku="${escapeHtml(product.sku)}">Прибрати</button>
          </div>
        </article>
      `;
    })
    .join("");

  renderHeroSpotlight();
}

async function copyMessage(message) {
  if (!navigator.clipboard) {
    return false;
  }
  try {
    await navigator.clipboard.writeText(message);
    return true;
  } catch (_error) {
    return false;
  }
}

function buildConsultationMessage() {
  const name = getFormField(els.consultationForm, "name") || "Не вказано";
  const phone = getFormattedUaPhone(els.consultationForm) || "Не вказано";
  const request =
    getFormField(els.consultationForm, "request") ||
    "Потрібна консультація з підбору догляду.";

  return [
    "Запит на консультацію Beauty Prostir",
    `Ім'я: ${name}`,
    `Телефон: ${phone}`,
    `Запит: ${request}`,
  ].join("\n");
}

function buildOrderMessage(order = buildOrderPayload()) {
  const itemLines = order.items.map(
    (item, index) =>
      `${index + 1}. ${item.sku} — ${item.name} | ${item.quantity} шт. | ${formatPrice(item.line_total)}`,
  );

  return [
    "Замовлення Beauty Prostir",
    `Номер: ${order.order_id}`,
    "",
    ...itemLines,
    "",
    `Сума товарів: ${formatPrice(order.summary.subtotal)}`,
    `Знижка: ${order.summary.discount_percent ? `${order.summary.discount_percent}% (${formatPrice(order.summary.discount_amount)})` : "немає"}`,
    `До сплати: ${formatPrice(order.summary.total)}`,
    `Доставка: ${order.summary.free_delivery ? "безкоштовно на відділення Нової пошти по Україні" : "за тарифами Нової пошти"}`,
    "",
    `Ім'я: ${order.customer.name}`,
    `Телефон: ${order.customer.phone}`,
    `Email: ${order.customer.email || "не вказано"}`,
    `Спосіб доставки: ${order.delivery.method}`,
    `Місто: ${order.delivery.city}`,
    `Відділення/адреса: ${order.delivery.warehouse}`,
    `Оплата: ${order.payment.method}`,
    `Коментар: ${order.comment || "без коментаря"}`,
  ].join("\n");
}

function buildOrderPayload() {
  const summary = getOrderSummary();
  const items = getCartItems().map(({ product, quantity }) => ({
    sku: product.sku,
    brand: product.brand,
    name: product.name,
    category: product.category,
    volume: product.volume,
    country: product.country,
    price: product.price,
    quantity,
    line_total: product.price * quantity,
  }));

  return {
    order_id: makeOrderId(),
    created_at: new Date().toISOString(),
    status: "new",
    source: "beauty-prostir-mini-site",
    customer: {
      name: getFormField(els.checkoutForm, "name"),
      phone: getCheckoutPhone(),
      email: getFormField(els.checkoutForm, "email"),
    },
    delivery: {
      method:
        getCheckedField(els.checkoutForm, "deliveryMethod") ||
        "Нова пошта: відділення",
      city: getFormField(els.checkoutForm, "city"),
      warehouse: getFormField(els.checkoutForm, "warehouse"),
    },
    payment: {
      method:
        getCheckedField(els.checkoutForm, "paymentMethod") ||
        "Оплата при отриманні",
    },
    comment: getFormField(els.checkoutForm, "comment"),
    summary: {
      subtotal: summary.subtotal,
      discount_percent: summary.discountPercent,
      discount_amount: summary.discountAmount,
      total: summary.finalTotal,
      free_delivery: summary.freeDelivery,
      items_count: items.reduce((total, item) => total + item.quantity, 0),
    },
    items,
    order_text: "",
    client: {
      user_agent: navigator.userAgent,
      page: window.location.href,
      utm: window.location.search,
    },
  };
}

function validateCheckout() {
  if (!getCartItems().length) {
    return "Додайте товари в кошик перед оформленням.";
  }
  if (!els.checkoutForm.checkValidity()) {
    els.checkoutForm.reportValidity();
    return "Заповніть обов'язкові поля для оформлення.";
  }
  return "";
}

async function submitOrder(order) {
  if (!ORDER_ENDPOINT) {
    return { sent: false, reason: "endpoint_missing" };
  }

  const response = await fetch(ORDER_ENDPOINT, {
    method: "POST",
    mode: "cors",
    redirect: "follow",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify(order),
  });

  if (!response.ok) {
    return { sent: false, reason: `http_${response.status}` };
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch (_error) {
    return { sent: false, reason: "invalid_json" };
  }

  return {
    sent: Boolean(payload?.ok),
    reason: payload?.ok ? "" : payload?.error || "script_error",
  };
}

function init() {
  preventGestureZoom();

  applyCatalog(FALLBACK_CATALOG_DATA);

  els.grid.addEventListener("click", (event) => {
    const brandButton = event.target.closest("[data-brand-filter]");
    if (brandButton) {
      applyBrandFilter(brandButton.dataset.brandFilter);
      return;
    }
    const previewImage = event.target.closest("[data-photo-preview]");
    if (previewImage) {
      openImageLightbox(
        previewImage.currentSrc || previewImage.src,
        previewImage.alt,
      );
      return;
    }
    const button = event.target.closest(".add-to-cart");
    if (!button) {
      return;
    }
    if (cart[button.dataset.sku]) {
      return;
    }
    addToCart(button.dataset.sku);
  });
  els.grid.addEventListener("load", handleProductPhotoLoad, true);
  els.grid.addEventListener("error", handleProductPhotoError, true);

  els.heroProductCart?.addEventListener("click", () => {
    const sku = els.heroProductCart.dataset.sku;
    if (!sku || cart[sku]) {
      return;
    }
    addToCart(sku);
  });

  els.heroProductPhoto?.addEventListener("click", () => {
    openImageLightbox(
      els.heroProductPhoto.currentSrc || els.heroProductPhoto.src,
      els.heroProductPhoto.alt,
    );
  });

  els.imageLightboxClose?.addEventListener("click", closeImageLightbox);
  els.imageLightbox?.addEventListener("click", (event) => {
    if (event.target === els.imageLightbox) {
      closeImageLightbox();
    }
  });
  els.successModalClose?.addEventListener("click", closeSuccessModal);
  els.successModalCatalog?.addEventListener(
    "click",
    goToCatalogFromSuccessModal,
  );
  els.successModal?.addEventListener("click", (event) => {
    if (
      event.target === els.successModal ||
      event.target.classList.contains("success-modal-backdrop")
    ) {
      closeSuccessModal();
    }
  });
  els.checkoutSuccessReset?.addEventListener("click", () => {
    resetCheckoutSuccess();
    document
      .querySelector("#catalog")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      els.imageLightbox &&
      !els.imageLightbox.hidden
    ) {
      closeImageLightbox();
      return;
    }
    if (
      event.key === "Escape" &&
      els.successModal &&
      !els.successModal.hidden
    ) {
      closeSuccessModal();
    }
  });

  els.cartItems.addEventListener("click", (event) => {
    const button = event.target.closest("[data-cart-action]");
    if (!button) {
      return;
    }
    const sku = button.dataset.sku;
    const currentQuantity = cart[sku] || 0;

    if (button.dataset.cartAction === "increase") {
      changeCartItem(sku, currentQuantity + 1);
    }
    if (button.dataset.cartAction === "decrease") {
      changeCartItem(sku, Math.max(1, currentQuantity - 1));
    }
    if (button.dataset.cartAction === "remove") {
      changeCartItem(sku, 0);
    }
  });

  els.checkoutForm.elements.phone.addEventListener("input", (event) => {
    event.target.value = onlyDigits(event.target.value).slice(0, 9);
  });

  els.consultationForm.elements.phone.addEventListener("input", (event) => {
    event.target.value = onlyDigits(event.target.value).slice(0, 9);
  });

  els.search.addEventListener("input", (event) => {
    state.search = event.target.value.trim();
    state.page = 1;
    renderProducts();
  });

  els.brand.addEventListener("change", (event) => {
    state.brand = event.target.value;
    state.page = 1;
    renderProducts();
  });

  els.category.addEventListener("change", (event) => {
    state.category = event.target.value;
    state.page = 1;
    renderProducts();
  });

  els.country.addEventListener("change", (event) => {
    state.country = event.target.value;
    state.page = 1;
    renderProducts();
  });

  els.reset.addEventListener("click", () => {
    state.search = "";
    state.brand = "all";
    state.category = "all";
    state.country = "all";
    state.page = 1;
    els.search.value = "";
    els.brand.value = "all";
    els.category.value = "all";
    els.country.value = "all";
    renderProducts();
  });

  els.prev.addEventListener("click", () => {
    state.page = Math.max(1, state.page - 1);
    renderProducts();
    document.querySelector("#catalog").scrollIntoView({ block: "start" });
  });

  els.next.addEventListener("click", () => {
    state.page += 1;
    renderProducts();
    document.querySelector("#catalog").scrollIntoView({ block: "start" });
  });

  els.consultationForm.addEventListener("click", async (event) => {
    if (event.target.tagName !== "BUTTON") {
      return;
    }
    const message = buildConsultationMessage();
    const copied = await copyMessage(message);
    els.consultationNote.textContent = copied
      ? "Текст заявки скопійовано. Відкриваємо Telegram, вставте повідомлення в чат @hairshop_as."
      : "Відкриваємо Telegram. Якщо текст не скопіювався автоматично, напишіть коротко запит у чат @hairshop_as.";
    window.open(TELEGRAM_URL, "_blank", "noopener");
  });

  els.checkoutForm.addEventListener("click", async (event) => {
    if (event.target.tagName !== "BUTTON") {
      return;
    }
    const validationMessage = validateCheckout();
    if (validationMessage) {
      els.checkoutNote.textContent = validationMessage;
      showToast({
        title: "Перевірте замовлення",
        message: validationMessage,
        tone: "warning",
      });
      return;
    }
    const order = buildOrderPayload();
    order.order_text = buildOrderMessage(order);
    els.checkoutNote.textContent = "Надсилаємо замовлення...";
    showToast({
      title: "Надсилаємо замовлення",
      message: "Заявка обробляється. Це займе кілька секунд.",
      tone: "warning",
      duration: 2400,
    });

    let sentToManager = false;
    try {
      const result = await submitOrder(order);
      sentToManager = result.sent;
    } catch (_error) {
      sentToManager = false;
    }

    if (sentToManager) {
      cart = {};
      saveCart();
      renderCart();
      els.checkoutForm.reset();
      els.checkoutNote.textContent =
        "Замовлення оформлене. Менеджер зв'яжеться з вами для уточнення деталей.";
      showCheckoutSuccess(order);
      showToast({
        title: "Замовлення прийнято",
        message: "Дякуємо. Менеджер зв'яжеться з вами для уточнення деталей.",
        tone: "success",
      });
      return;
    }

    els.checkoutNote.textContent =
      "Відправку в Google Sheets ще не підключено. Потрібно вставити Web App URL у ORDER_ENDPOINT.";
    showToast({
      title: "Замовлення не відправлено",
      message:
        "Зараз заявка не дійшла до менеджера. Потрібно перевірити підключення Web App.",
      tone: "error",
      duration: 5200,
    });
  });
}

init();
