const SPREADSHEET_ID = "1lk1V1gXH9F9-4mpiN8clobGoZ-RIQV96Gx1t23sw7UA";
const ORDERS_SHEET_NAME = "Orders";
const MANAGER_EMAIL = "econova.bm@gmail.com";

function doPost(e) {
  try {
    const order = JSON.parse(e.postData.contents || "{}");
    order.order_text = order.order_text || buildOrderText(order);

    appendOrder(order);
    sendManagerEmail(order);

    return jsonResponse({ ok: true, order_id: order.order_id });
  } catch (error) {
    return jsonResponse({ ok: false, error: String(error) });
  }
}

function appendOrder(order) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(ORDERS_SHEET_NAME);

  if (!sheet) {
    throw new Error(`Sheet ${ORDERS_SHEET_NAME} not found`);
  }

  sheet.appendRow([
    JSON.stringify(order.items || []),
    order.order_text || "",
    order.order_id || "",
    order.created_at || new Date().toISOString(),
    order.status || "new",
    order.customer?.name || "",
    formatTextForSheet(order.customer?.phone || ""),
    order.customer?.email || "",
    order.delivery?.method || "",
    order.delivery?.city || "",
    order.delivery?.warehouse || "",
    order.payment?.method || "",
    order.summary?.subtotal || 0,
    order.summary?.discount_percent || 0,
    order.summary?.discount_amount || 0,
    order.summary?.total || 0,
    order.summary?.free_delivery ? "yes" : "no",
    order.comment || "",
    order.summary?.items_count || 0,
    order.source || "beauty-prostir-mini-site",
    isManagerEmailConfigured() ? "yes" : "no",
    "",
    order.client?.user_agent || "",
    order.client?.page || "",
    order.client?.utm || "",
    "",
  ]);
}

function sendManagerEmail(order) {
  if (!isManagerEmailConfigured()) {
    return;
  }

  MailApp.sendEmail({
    to: MANAGER_EMAIL,
    subject: `Нове замовлення Beauty Prostir ${order.order_id || ""}`,
    body: order.order_text || buildOrderText(order),
  });
}

function isManagerEmailConfigured() {
  return Boolean(MANAGER_EMAIL && MANAGER_EMAIL !== "manager@example.com");
}

function formatTextForSheet(value) {
  const text = String(value || "");
  return text ? `'${text}` : "";
}

function buildOrderText(order) {
  const items = (order.items || [])
    .map((item, index) => `${index + 1}. ${item.sku} — ${item.name} | ${item.quantity} шт. | ${item.line_total} грн`)
    .join("\n");

  return [
    "Замовлення Beauty Prostir",
    `Номер: ${order.order_id || ""}`,
    "",
    items,
    "",
    `Сума товарів: ${order.summary?.subtotal || 0} грн`,
    `Знижка: ${order.summary?.discount_percent || 0}% (${order.summary?.discount_amount || 0} грн)`,
    `До сплати: ${order.summary?.total || 0} грн`,
    `Доставка: ${order.summary?.free_delivery ? "безкоштовно на відділення Нової пошти по Україні" : "за тарифами Нової пошти"}`,
    "",
    `Ім'я: ${order.customer?.name || ""}`,
    `Телефон: ${order.customer?.phone || ""}`,
    `Email: ${order.customer?.email || ""}`,
    `Спосіб доставки: ${order.delivery?.method || ""}`,
    `Місто: ${order.delivery?.city || ""}`,
    `Відділення/адреса: ${order.delivery?.warehouse || ""}`,
    `Оплата: ${order.payment?.method || ""}`,
    `Коментар: ${order.comment || ""}`,
  ].join("\n");
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
