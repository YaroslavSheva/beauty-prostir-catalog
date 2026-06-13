# Підключення оформлення замовлень до Google Sheets

1. Відкрий Google Sheets:
   https://docs.google.com/spreadsheets/d/1lk1V1gXH9F9-4mpiN8clobGoZ-RIQV96Gx1t23sw7UA/edit

2. Перевір, що є вкладка `Orders`.

3. У Google Sheets відкрий `Розширення` -> `Apps Script`.

4. Створи файл скрипта і встав код з:
   `google-apps-script-order-webhook.gs`

5. У скрипті заміни:
   `manager@example.com`
   на email менеджера, який має отримувати замовлення.

6. Натисни `Deploy` -> `New deployment`.

7. Тип deployment: `Web app`.

8. Execute as: `Me`.

9. Who has access: `Anyone`.

10. Скопіюй Web App URL.

11. У файлі `app.js` заміни:
   `const ORDER_ENDPOINT = "";`
   на:
   `const ORDER_ENDPOINT = "ТУТ_WEB_APP_URL";`

Після цього сайт буде записувати замовлення у вкладку `Orders` і надсилати email менеджеру.
