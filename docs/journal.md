# BuildPOS — Project Journal

## Loyiha haqida
- **Nomi:** BuildPOS — Qurilish Mollari Do'koni Boshqaruv Tizimi
- **Backend:** Java 17 + Spring Boot 3 + PostgreSQL 16 + Flyway
- **Frontend:** React.js + Vite + CSS Variables
- **TZ versiyasi:** v4.0

---

## Texnologiyalar

### Backend (pom.xml)
- Spring Boot 3.5.11 + Java 17
- Spring Security + JWT (jjwt 0.12.6)
- Spring Data JPA + Hibernate
- Flyway (flyway-core + flyway-database-postgresql)
- PostgreSQL driver
- Lombok 1.18.32
- springdoc-openapi 2.8.5 → Swagger `http://localhost:8080/swagger-ui.html`
- thumbnailator 0.4.20 — rasm o'lchamini kamaytirish
- bcrypt (strength 12)

### Frontend (package.json)
- React 19.2.0 + Vite 7.3.1
- react-router-dom 7.13.1
- axios 1.13.6
- i18next 25.8.13 + react-i18next 16.5.4 — 4 til (UZ/RU/UZ-Kirill/EN)
- lucide-react 0.577.0 — ikonlar
- bootstrap 5.3.8 + react-bootstrap 2.10.10
- react-to-print 3.0.0
- jsPDF + autoTable — CDN orqali (dependencies da yo'q)

---

## Database Migration holati
| Versiya | Fayl | Jadval/O'zgarish |
|---------|------|-----------------|
| V1 | init_categories | categories (daraxt strukturasi, 8 boshlang'ich kategoriya) |
| V2 | init_products | products, product_price_tiers, price_history |
| V3 | init_users | roles (OWNER/ADMIN/CASHIER/STOREKEEPER), users |
| V4 | init_suppliers | suppliers, supplier_products, supplier_debts |
| V5 | create_supplier_payments | supplier_payments |
| V6 | create_category_table | (tozalash migratsiyasi) |
| V7 | init_products_professional | product_units, warehouse_stock |
| V8 | init_purchases | purchases, purchase_items, purchase_payments |
| V9 | init_sales | customers, shifts, sales, sale_items, sale_payments, customer_debts, customer_debt_payments |
| V10 | init_partners | partners + sales.partner_id ALTER |
| V11 | init_permissions | permission_groups, permissions, user_permissions + users.phone ALTER |
| V12 | add_due_date | customer_debts.due_date ALTER |
| V13 | add_exchange_rates | exchange_rates jadvali |
| V14 | permissions_data | Barcha permission guruhlari va permission yozuvlari |
| V15 | purchase_items_add_currency | purchase_items.currency |
| V16 | purchase_multi_currency | purchases ko'p valyuta ustunlari |
| V17 | add_sales_return_permission | SALES_RETURN permission (qaytarish moduli uchun) |
| V18 | customer_debt_limit | customers.debt_limit, debt_limit_strict |
| V19 | installment_schedule | customer_debt_installments (to'lov jadvali) |
| V20 | shift_view_permission | SHIFTS permission guruhi, SHIFT_VIEW permission |
| V21 | sale_payment_due_date | sale_payments.due_date (nasiya to'lov muddati) |
| V22 | sale_item_returned_quantity | sale_items.returned_quantity NUMERIC(19,3) DEFAULT 0 (qaytarish uchun) |

---

## Backend — Tugallangan modullar

### ✅ Auth
- `POST /api/auth/login` → `{token, username, role, fullName}`
- `POST /api/auth/logout` — token blacklist ga qo'shiladi
- JWT (24 soat), in-memory blacklist

### ✅ Products
- CRUD + toggle-status + barcode qidirish
- Narx tierlari (QUANTITY/ROLE), ko'p birlik (ProductUnit)
- `minStock` field — `ProductUnitRequest` orqali saqlanadi, barcha omborlarga qo'llanadi
- `GET /api/v1/products/low-stock`
- `GET /api/v1/products/barcode/{barcode}`
- Stock transfer, stock adjust

### ✅ Categories
- Daraxt strukturasi (parent/children)
- `GET /api/v1/categories/tree`

### ✅ Warehouse Stock
- `PATCH /api/v1/warehouse-stocks/{warehouseId}/product-units/{productUnitId}/min-stock`
- `WarehouseStockController.java` — minimal miqdor yangilash

### ✅ Stock Movements
- `GET /api/v1/stock-movements` (filter: productUnitId, warehouseId, movementType, productName, from, to)
- `GET /api/v1/stock-movements/counts`
- Types: PURCHASE_IN, SALE_OUT, ADJUSTMENT_IN, ADJUSTMENT_OUT, TRANSFER_IN, TRANSFER_OUT, RETURN_IN
- `productName` — server-side qidiruv (products JOIN orqali)

### ✅ Sales (POS)
- Draft → complete (to'lov bilan) → cancel
- Hold/Unhold tizimi
- Smena: open/close/current/my/history
- PaymentMethod: CASH, CARD, TRANSFER, DEBT
- SaleStatus: DRAFT, COMPLETED, CANCELLED, RETURNED
- `POST /api/v1/sales/{id}/return` — qaytarish (to'liq yoki qisman), `ReturnRequest` (items[], reason)
- `PATCH /api/v1/sales/{id}/customer` — mavjud DRAFT ga mijoz biriktirish
- `GET /api/v1/sales/stats` — kunlik/sana bo'yicha statistika (`TodayStatsResponse`)
- `SaleItem.returnedQuantity` — har bir mahsulot uchun qaytarilgan miqdor (V22)

### ✅ Shifts
- `GET /api/v1/shifts` — barcha smenalar (filter: cashierId, from, to) — SHIFT_VIEW permission
- `GET /api/v1/shifts/{id}/summary` — to'liq hisobot (naqd/karta/nasiya, top mahsulotlar, kassa farqi) — SHIFT_VIEW
- `ShiftRepository.findAllFiltered` — native SQL + CAST fix

### ✅ Customers
- CRUD + phone qidirish
- `debtLimit`, `debtLimitStrict` fieldlari
- Nasiya to'lash, muddat uzaytirish, installment jadval
- `GET /api/v1/customers/debts/grouped` — tree view uchun
- `GET /api/v1/customers/{id}/check-debt-limit`
- `PATCH /api/v1/customers/debts/{id}/extend`

### ✅ Customer Debt Installments
- `GET/POST /api/v1/customers/debts/{id}/installments`
- `/generate` — avtomatik oylik taqsimlash
- `/custom` — qo'lda jadval
- `/{iid}/pay` — to'lov
- `DELETE`

### ✅ Suppliers
- `/api/suppliers` (v1 emas!)
- `GET /api/suppliers/{id}/debts`
- `GET /api/v1/suppliers/debts/grouped` — tree view uchun

### ✅ Purchases
- CRUD + receive + payment + cancel
- `PurchaseDetailPage` — PDF: PENDING (buyurtma varaqasi, narxsiz), RECEIVED (to'liq hujjat + to'lovlar)
- `findRecentPurchases` — Dashboard uchun

### ✅ Aging Report
- `GET /api/v1/aging/customers` — mijozlar qarzi bucket (0-30, 31-60, 61-90, 90+)
- `GET /api/v1/aging/suppliers` — yetkazuvchilar qarzi bucket
- `AgingController`, `AgingService`, `AgingResponse`

### ✅ Dashboard
- `GET /api/v1/dashboard`
- Bugungi sotuv: soni, summasi, CASH/CARD/TRANSFER/DEBT bo'yicha
- Joriy oy sotuv summasi
- Mijoz qarzlari (jami, ochiq soni, muddati o'tgan soni va summasi)
- Yetkazuvchi qarzi
- Kam zaxira: soni + ro'yxat (5 ta, guruhlab)
- Top 5 mahsulot (bugun)
- So'nggi 5 sotuv
- So'nggi 5 xarid (`totalDisplay` — USD/UZS/aralash)
- Haftalik grafik

### ✅ SaleRepository — yangi querylar
- `findTopProductsToday(from, to)` — bugungi top mahsulotlar

### ✅ WarehouseStockRepository — yangi querylar
- `countLowStockItems()` — native SQL, guruhlab, is_deleted filter
- `findLowStockItems()` — native SQL, STRING_AGG omborlar, guruhlab

---

## Muhim texnik eslatmalar

### PostgreSQL NULL type muammo
```java
CAST(:param AS VARCHAR)
CAST(:param AS BIGINT)
CAST(:param AS TIMESTAMP)
```
Barcha native query larda nullable parametrlar uchun ishlatiladi.

### React Hooks qoidasi
- `useState` har doim funksiya boshida, `if (loading) return` dan OLDIN
- Modal komponentlarda ham shu qoida

### Flyway qoidasi
- Hech qachon yugurilgan migration faylini o'zgartirma
- Yangi o'zgarish = yangi versiya fayl

### jsPDF CDN
```
https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js
https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js
```

### Narx inputlar
- `type="text" inputMode="numeric"` — spin buttons yo'q
- `fmtPrice` — input uchun (bo'shliq bilan)
- `fmt` — ko'rsatish uchun

### Valyuta qoidasi
- Tannarx: USD yoki UZS (tanlash mumkin)
- Sotuv narxi va Minimal narx: doim UZS

---

## Backend Fayl tuzilmasi
```
com.buildpos.buildpos
├── config/
│   ├── SecurityConfig.java
│   ├── JpaConfig.java
│   ├── JwtConfig.java
│   ├── SwaggerConfig.java
│   └── WebConfig.java
├── controller/
│   ├── AgingController.java          ← yangi
│   ├── AuthController.java
│   ├── CategoryController.java
│   ├── CustomerController.java
│   ├── DashboardController.java
│   ├── EmployeeController.java
│   ├── ExchangeRateController.java
│   ├── FileUploadController.java
│   ├── InstallmentController.java    ← yangi
│   ├── PartnerController.java
│   ├── PermissionController.java
│   ├── ProductController.java
│   ├── PurchaseController.java
│   ├── RoleController.java
│   ├── SaleController.java
│   ├── ShiftController.java          ← yangilandi (SHIFT_VIEW permission)
│   ├── StockMovementController.java  ← yangilandi (productName filter)
│   ├── SupplierController.java
│   ├── SupplierPaymentController.java
│   ├── UnitController.java
│   ├── WarehouseController.java
│   └── WarehouseStockController.java ← yangi (min-stock endpoint)
├── service/
│   ├── AgingService.java             ← yangi
│   ├── CategoryService.java
│   ├── CustomerService.java          ← yangilandi (installment, extend, check-limit)
│   ├── DashboardService.java         ← yangilandi (top products, low stock list, recent purchases, todayDebt)
│   ├── EmployeeService.java
│   ├── ExchangeRateService.java
│   ├── FileUploadService.java
│   ├── InstallmentService.java       ← yangi
│   ├── PartnerService.java
│   ├── PermissionService.java
│   ├── ProductService.java           ← yangilandi (minStock saqlash)
│   ├── PurchaseService.java
│   ├── RoleService.java
│   ├── SaleService.java
│   ├── ShiftService.java
│   ├── StockMovementService.java     ← yangilandi (productName parametri)
│   ├── SupplierPaymentService.java
│   ├── SupplierService.java
│   ├── UnitService.java
│   └── WarehouseService.java
├── repository/
│   ├── CategoryRepository.java
│   ├── CustomerDebtRepository.java   ← yangilandi (findAllOpenForAging, findAllOpenForTree)
│   ├── CustomerRepository.java
│   ├── ExchangeRateRepository.java
│   ├── InstallmentRepository.java    ← yangi
│   ├── PartnerRepository.java
│   ├── PermissionGroupRepository.java
│   ├── PermissionRepository.java
│   ├── ProductRepository.java
│   ├── ProductUnitRepository.java
│   ├── PurchaseItemRepository.java
│   ├── PurchasePaymentRepository.java
│   ├── PurchaseRepository.java       ← yangilandi (findRecentPurchases)
│   ├── RoleRepository.java
│   ├── SaleRepository.java           ← yangilandi (findTopProductsToday)
│   ├── ShiftRepository.java          ← yangilandi (findAllFiltered native SQL + CAST)
│   ├── StockMovementRepository.java  ← yangilandi (productName filter, products JOIN)
│   ├── SupplierDebtRepository.java   ← yangilandi (findAllOpenForAging, findAllOpenForTree)
│   ├── SupplierPaymentRepository.java
│   ├── SupplierRepository.java
│   ├── UnitRepository.java
│   ├── UserPermissionRepository.java
│   ├── UserRepository.java
│   ├── WarehouseRepository.java
│   ├── WarehouseStockRepository.java ← yangilandi (countLowStockItems native, findLowStockItems)
│   └── ShiftRepository.java
├── dto/
│   ├── request/
│   │   ├── ProductRequest.java           ← yangilandi (minStock)
│   │   ├── ReturnRequest.java            ← yangi (items[], reason)
│   │   ├── StockAdjustmentRequest.java
│   │   └── StockTransferRequest.java
│   └── response/
│       ├── AgingResponse.java            ← yangi
│       ├── DashboardResponse.java        ← yangilandi
│       ├── GroupedDebtResponse.java      ← yangi
│       ├── InstallmentResponse.java      ← yangi
│       ├── ShiftSummaryResponse.java     ← yangi
│       └── TodayStatsResponse.java       ← yangi (sales/stats uchun)
├── entity/
│   ├── CustomerDebt.java
│   ├── CustomerDebtInstallment.java      ← yangi
│   ├── SaleItem.java                     ← yangilandi (returnedQuantity field)
│   ├── enums/SaleStatus.java             ← yangilandi (RETURNED status qo'shildi)
│   ├── Purchase.java
│   ├── StockMovement.java
│   └── ...
├── repository/
│   └── SaleItemRepository.java           ← yangi
├── security/ (4 fayl)
│   └── JWT filter, auth handler, auditing
├── mapper/ (2 fayl)
│   └── CategoryMapper.java, ProductMapper.java
├── exception/ (4 fayl)
│   └── GlobalExceptionHandler + custom exceptions
└── util/
    └── StockCalculator.java

---

## Frontend Fayl tuzilmasi
```
src/
├── api/
│   ├── api.js
│   ├── debts.js            ← yangi (customerDebtsApi, supplierDebtsApi, installmentApi, agingApi)
│   ├── products.js
│   ├── purchases.js
│   ├── sales.js
│   ├── shifts.js           ← yangi (getAll, getById, getSummary, getCurrent, open, close)
│   └── stockmovements.js   ← yangi
├── context/
│   └── AuthContext.jsx
├── locales/                ← yangi (i18n tarjima fayllari)
│   ├── uz.json             — O'zbek (lotin)
│   ├── ru.json             — Rus
│   ├── uz-cyrl.json        — O'zbek (kirill)
│   └── en.json             — Ingliz
├── i18n.js                 ← yangi (i18next sozlamasi, 4 til)
├── pages/
│   ├── CashierPage.jsx
│   ├── CategoriesPage.jsx
│   ├── CustomersPage.jsx   ← yangilandi (debtLimit, nasiya tugmasi → DebtsPage)
│   ├── DashboardPage.jsx   ← to'liq qayta yozildi
│   ├── DebtsPage.jsx       ← to'liq qayta yozildi (tree/jadval/aging, installment, PayAll FIFO, extend)
│   ├── EmployeesPage.jsx
│   ├── LoginPage.jsx
│   ├── PartnersPage.jsx
│   ├── ProductsPage.jsx    ← yangilandi (minStock, tannarx USD, sotuv/min narx UZS)
│   ├── PurchaseDetailPage.jsx ← yangilandi (PDF: buyurtma varaqasi / to'liq hujjat)
│   ├── PurchaseNewPage.jsx
│   ├── PurchasesPage.jsx   ← yangilandi (Excel + PDF export)
│   ├── SalesPage.jsx       ← yangilandi (Excel + PDF export)
│   ├── ShiftReportPage.jsx ← yangi (smenalar ro'yxati + detail modal + export)
│   ├── StockMovementsPage.jsx ← yangilandi (server-side qidiruv, export, navigate)
│   ├── SuppliersPage.jsx
│   ├── UnitsPage.jsx
│   └── WarehousesPage.jsx
├── styles/
│   ├── CashierPage.css
│   ├── Common.css
│   ├── dashboard.css       — eski dashboard stili
│   ├── dashboardpage.css   ← yangi (DashboardPage uchun)
│   ├── DebtsPage.css       ← yangi
│   ├── layout.css
│   ├── ProductsPage.css    ← yangilandi
│   ├── SalesPage.css
│   ├── ShiftReportPage.css ← yangi
│   └── Variables.css
└── utils/
    └── exportUtils.js      ← yangi (exportToCSV, exportToPDF, fmtNum, fmtDate, fmtDateTime)
```

---

## Tugallangan sahifalar ✅
- LoginPage, Layout
- DashboardPage (to'liq yangilandi)
- ProductsPage (minStock qo'shildi)
- CategoriesPage, UnitsPage, WarehousesPage
- CustomersPage (debtLimit bilan)
- SuppliersPage, PartnersPage
- EmployeesPage (permissions modal)
- PurchasesPage, PurchaseNewPage, PurchaseDetailPage (PDF bilan)
- CashierPage (to'liq POS)
- SalesPage (export bilan)
- DebtsPage (tree/jadval/aging, installment, PayAll)
- ShiftReportPage (yangi)
- StockMovementsPage (server-side qidiruv, export)

---

## ⏳ Qolgan vazifalar

### ✅ Yakunlangan
| Vazifa | Sana |
|--------|------|
| ~~Sotuv → Nasiya zanjiri~~ | 2026-03-26 |
| ~~Pending Order tizimi~~ (submit/reject/my-pending + 2 tab drawer + polling) | 2026-03-30 |
| ~~Kassir nomi bug fix~~ (`sale.setCashier()` olib tashlandi) | 2026-04-02 |

### 🔴 Muhim — kun tartibiga ta'sir qiladi
| # | Vazifa | Qiyinlik | Izoh |
|---|--------|----------|------|
| 1 | **Smena kechagi ogohlantirishi** | ✅ Tugallandi (2026-04-02) | Banner + yopish/davom etish |
| 2 | **Real-time stok ko'rsatish** | Oson | Qidiruvda stok miqdori, 0 bo'lsa bloklash |
| 3 | **Qaytarish moduli UI** | O'rta | Backend tayyor (V22), SalesPage da modal |

### 🟡 Foydali — tezlik va qulaylik
| # | Vazifa | Qiyinlik | Izoh |
|---|--------|----------|------|
| 4 | **Shtrix/QR skaneri (kamera)** | O'rta | `html5-qrcode` — telefon kamerasi |
| 5 | **Tezkor mahsulotlar (Favorites)** | Oson | Ko'p sotilgan 10 mahsulot — 1 bosishda savatga |
| 6 | **Buyurtmaga izoh (assistant_note)** | Oson | Adminga yuborishda izoh maydoni |
| 7 | **Yordamchiga smena ruxsati** | Oson | SELLER roli smena ocholmaydi |

### 🟢 Keyingi bosqich
| # | Vazifa | Qiyinlik | Izoh |
|---|--------|----------|------|
| 8 | **P&L Hisobotlar** | Qiyin | Daromad/zarar hisoboti |
| 9 | **Hisob-faktura PDF (A4)** | O'rta | B2B mijozlar uchun |
| 10 | **Docker + backup** | O'rta | Loyiha oxirida |
| 11 | **Telegram Bot + Cloudflare** | Qiyin | Masofadan kirish va bildirishnomalar |

---

## Deployment muhiti
- Server: bitta lokal kompyuter (Docker)
- Internet: bor (do'kon WiFi), lekin dastur lokal ishlaydi
- Klientlar: telefonlar WiFi orqali kompyuter IP ga ulanadi
- Masofadan kirish: hozircha yo'q (Cloudflare Tunnel rejalashtirilgan)
- UPS tavsiya etiladi (elektr uzilishiga qarshi)

---

## Session: ~2026-03-28 — Qaytarish moduli asosi (hujjatlanmagan edi)

### Bajarilgan ishlar

#### V22 — sale_items.returned_quantity
- `sale_items` jadvaliga `returned_quantity NUMERIC(19,3) DEFAULT 0` ustun qo'shildi
- Har bir mahsulot qatori uchun qancha miqdor qaytarilganini saqlaydi
- To'liq yoki qisman qaytarishni qo'llab-quvvatlaydi

#### Backend — qaytarish endpointi
- `POST /api/v1/sales/{id}/return` — sotuvni qaytarish
- `ReturnRequest` DTO: `items[]` (saleItemId + returnedQuantity), `reason` (sabab)
- `SaleStatus.RETURNED` — yangi status
- `SaleItemRepository.java` — yangi repository

#### V17 — SALES_RETURN permission
- `SALES_RETURN` permission — qaytarish operatsiyasiga ruxsat
- Permissions jadvaliga qo'shilgan

#### i18n — 4 tilli qo'llab-quvvatlash
- `i18next` + `react-i18next` integratsiyasi
- `src/locales/` — uz.json, ru.json, uz-cyrl.json, en.json
- `src/i18n.js` — til sozlamasi
- Foydalanuvchi tanlagan til `localStorage` da saqlanadi

#### Holat
- Backend: tayyor (endpoint, DTO, V22 migration)
- Frontend: UI sahifasi hali yo'q (rejalashtirilgan)

---

## Session: 2026-04-02 — Kassir nomi bug fix + Pending UX yaxshilanishlari

### Bajarilgan ishlar

#### Bug: Admin pending buyurtmani yakunlasa "Kassir: Admin" ko'rinardi
- **Sabab:** `SaleService.complete()` ichida `sale.setCashier(cashier)` qatori bor edi
- `cashierUsername` = to'lovni bajargan foydalanuvchi (admin) → original sotuvchi (Sardor) o'chirilardi
- **Fix:** `sale.setCashier(cashier)` qatori o'chirildi
- `completingUser` o'zgaruvchisi faqat smena topish uchun saqlanib qoldi
- Natija: Sardor yaratgan savatcha, admin yakunlasa ham tarixda "Kassir: Sardor" ko'rinadi ✅

#### Pending drawer UX — Ochish tugmasi vs butun qator
- Admin "Ochish" tugmasini bosishi kerak — butun qator bosilganda ochilmaydi
- Bu to'g'ri UX: 3 ta tugma bor (Ochish / Qaytarish / Bekor qilish), tasodifan bosib ketmaslik uchun
- O'zgartirish talab qilinmadi — hozirgi holat saqlanib qolindi

### Texnik eslatma
```java
// SaleService.complete() — o'zgarish
// Avval:
User cashier = userRepository.findByUsername(cashierUsername)...;
sale.setCashier(cashier);  // ← original sotuvchini o'chirardi

// Hozir:
User completingUser = userRepository.findByUsername(cashierUsername)...;
// sale.setCashier() chaqirilmaydi — original seller saqlanadi
shiftRepository.findByCashierIdAndStatus(completingUser.getId(), ShiftStatus.OPEN)
        .ifPresent(sale::setShift);
```

---

## Session: 2026-03-30 (2) — Pending Order tizimi + Mobile responsive + Bugfixlar

### Bajarilgan ishlar

#### Bug: Kassir admin ochgan smenani ko'rmasdi
- `ShiftService.getCurrentShift()` — faqat o'z smenasini qidirardi
- Fix: o'z smenasi topilmasa `findFirstByStatus(OPEN)` — istalgan ochiq smenani oladi
- `ShiftRepository` — `findFirstByStatus(ShiftStatus)` metodi qo'shildi

#### Pending Order tizimi — to'liq (V23 asosida)
**Backend:**
- `PATCH /api/v1/sales/{id}/reject` — PENDING → HOLD (sabab notes ga yoziladi)
- `GET /api/v1/sales/my-pending` — kassirning o'z PENDING buyurtmalari
- `SaleService.rejectPending()` — status HOLD ga o'tkazadi, reason notes da saqlanadi
- `SaleService.getMyPendingOrders()` — sellerId bo'yicha filter
- `sales.js` API — `rejectPending`, `getMyPending` metodlari qo'shildi

**Frontend — CashierPage:**
- "Adminga yuborish" tugmasi qo'shildi (kassir uchun, `!isAdmin`)
- `handleSubmitPending()` — DRAFT yaratadi → `/submit` → PENDING
- Hold drawer — 2 tab: **Kechiktirilgan** (HOLD) | **Yuborilgan** (PENDING)
- `myPendingOrders` state + `loadMyPending()` funksiyasi
- Polling: har 20 soniyada PENDING statusni tekshiradi, o'zgarganda toast
- Admin reject tugmasi: `window.prompt` orqali sabab so'raydi → kassirga qaytariladi

#### CashierPage UX yaxshilanishlari
- **Topbar** — ko'k soat (🕐) tugmasi: hold drawer toggle (ochish/yopish)
- **Tugmalar** — ikkilamchi amallar qayta loyihalandi:
  - `TO'LASH` — katta ko'k gradient (o'zgarmadi)
  - `Kechiktirish` + `Adminga yuborish` — teng kenglikda outlined tugmalar (`pos-secondary-row`)
  - Admin uchun faqat `Kechiktirish` ko'rinadi
- `pos-hold-open-btn` — topbarda hold drawer ochuvchi toggle tugma

#### Mobile responsive — barcha sahifalar
- `layout.css` — `@media (768px): page-content { overflow-x: hidden }`
- `DebtsPage.css` — `nasiya-tabs { width: fit-content }` → 768px da `width: 100%` (page overflow fix)
- `DebtsPage.jsx` — inline `style={{}}` → `className` (aging grid, header right)
- `ProductsPage.jsx` — `<table className="ptable products-ptable">` (scoped class)
- `ProductsPage.css` — `products-ptable`: 768px da ustunlar yashirinadi (#, Rasm, Kategoriya, Shtrix-kod)
- `CashierPage.css` — print CSS fix: `visibility` pattern (`body * hidden`, `.receipt * visible`)
- `CashierPage.jsx` — `pos-back-btn` (uy ikonasi), smena yopish ikonasi, `pos-tbtn-text` yashirinadi

### Texnik eslatmalar

#### Pending Order oqimi (to'liq)
```
Kassir: Savatcha → [Adminga yuborish] → PENDING
Admin:  Bell (🔔) tugmasi → [Tasdiqlash] → COMPLETED
                          → [Rad etish + sabab] → HOLD (kassirga qaytadi, notes da sabab)
Kassir: Soat (🕐) → "Yuborilgan" tab → sabab ko'radi → bekor qiladi yoki qayta yuboradi
Polling: har 20s — status o'zgarganda kassirga toast
```

#### Inline style vs className
- Inline `style={{}}` CSS media query larni override qilmaydi
- Har doim responsive elementlar uchun `className` ishlatilsin

---

## Session: 2026-03-30 — Smena tizimi qayta ko'rib chiqish + Yangi arxitektura rejasi

### Biznes modeli
- Bitta ega: admin + kassir + to'lov qabul qiluvchi (naqd, karta, o'tkama, nasiya, chegirma)
- Ikkita yordamchi: telefon orqali savatcha yaratadi, egaga yuboradi
- Ega to'lovni yakunlaydi
- Infratuzilma: bitta kompyuter (Docker), do'kon WiFi, internet bor, masofadan kirish yo'q (hozircha)

### Arxitektura o'zgarishlari

#### shifts jadvali
- `cashier_id` majburiy emas bo'ladi
- `opened_by`, `closed_by` (user_id) — kim ochdi/yopdi saqlanadi
- Smena foydalanuvchiga emas, omborga bog'liq (per-warehouse)
- Bitta smena = bitta ish kuni

#### sales jadvali
- `status` ustuni: `DRAFT | PENDING | COMPLETED | CANCELLED`
- `assistant_note` — yordamchi egaga eslatma qoldirishi uchun
- `submitted_at` — yordamchi "Egaga yubordi" vaqti
- Pending Order oqimi: yordamchi DRAFT → PENDING, ega PENDING → COMPLETED

#### sale_payments jadvali (yangi — bo'lingan to'lov uchun)
- Bir sotuvda bir necha to'lov usuli: 500k naqd + 350k karta

### Migrations (rejalashtirilgan)
- V23: shifts — `cashier_id` nullable, `opened_by`, `closed_by` qo'shish
- V24: sales — `assistant_note`, `submitted_at`, status o'zgarishi (PENDING qo'shish)
- V25: sale_payments jadval (bo'lingan to'lov)

---

### Vazifalar ro'yxati — aniq holat (2026-04-02 tekshiruvi)

| # | Vazifa | Holat | Izoh |
|---|--------|-------|------|
| 1 | **Qaytim kalkulyatori** | ✅ Bor | `change > 0 → "Qaytim"` ko'rinadi (PaymentModal) |
| 2 | **Do'kon smenasi (per-warehouse)** | ✅ Qisman | Kassir admin smenasini ko'radi; `cashier_id` nullable qilinmagan |
| 3 | **Yordamchiga smena ochish ruxsati** | ⏳ Qilinmagan | SELLER roli smena ocholmaydi |
| 4 | **Nasiya muddati eslatmasi (Dashboard)** | ✅ Bor | `overdueDebtCount > 0` sariq banner ko'rinadi |
| 5 | **Buyurtmaga izoh (assistant_note)** | ⏳ Qilinmagan | Adminga yuborishda izoh maydoni yo'q |
| 6 | **Pending Order tizimi** | ✅ Tugallandi | Submit/take/reject + 2 tab drawer + polling |
| 7 | **Real-time stok ko'rsatish** | ⏳ Qilinmagan | Qidiruvda stok miqdori ko'rinmaydi |
| 8 | **Yordamchi natijani ko'radi** | ✅ Bor | "Yuborilgan" tab + polling toast |
| 9 | **Yordamchi mobile interfeys** | ✅ Qisman | CashierPage responsive; alohida `/assistant` sahifa yo'q |
| 10 | **Ovoz/bildirishnoma** | ✅ Qisman | Polling + toast (WebSocket/SSE yo'q) |
| 11 | **Tezkor mahsulotlar (Favorites)** | ⏳ Qilinmagan | Tez qo'shish tugmalari yo'q |
| 12 | **Shtrix/QR skaneri (kamera)** | ⏳ Qilinmagan | Telefon kamerasi orqali qidiruv yo'q |
| 13 | **Mijoz biriktirish** | ✅ Bor | CashierPage + PaymentModal da mijoz tanlash mavjud |
| 14 | **Bo'lingan to'lov** | ✅ Bor | Bir necha to'lov usuli qo'shish mumkin |
| 15 | **Qaytarish moduli UI** | ⏳ Qilinmagan | Backend tayyor (V22), SalesPage da modal kerak |
| 16 | **Hisob-faktura PDF (A4)** | ⏳ Qilinmagan | 80mm chek bor, A4 invoice yo'q |
| 17 | **Avtomatik backup** | ⏳ Qilinmagan | Docker bilan birga |
| 18 | **Telegram Bot** | ⏳ Qilinmagan | — |
| 19 | **Cloudflare Tunnel** | ⏳ Qilinmagan | — |

---

## Session: 2026-03-17 — DebtsPage, ShiftReportPage, StockMovementsPage, Dashboard, Export

### Bajarilgan ishlar

#### DebtsPage — to'liq qayta yozildi
- Tree view (default) ↔ Jadval ↔ Aging toggle
- `DebtDetailModal` — 3 tab: Ma'lumot | Tovarlar | To'lov jadvali
- `PayAllDebtsModal` — FIFO taqsimlash
- `ExtendDebtModal` — tezkor tugmalar + aniq sana
- `PaySupplierDebtModal`
- **Aging Report** — 4 bucket karta (bosilganda filter), detail jadval, navigate
- URL `?customerId=` parametri — highlight + auto-expand
- To'lov jadvali (installment) — avtomatik (oylar) + qo'lda
- Qarz limiti — ogohlantirish (sariq) yoki bloklash (qizil)
- Export: Excel (CSV) + PDF

#### AgingService/Controller/Response — yangi
- `GET /api/v1/aging/customers`
- `GET /api/v1/aging/suppliers`
- 4 bucket: 0-30, 31-60, 61-90, 90+ kun

#### ShiftReportPage — yangi
- Smenalar ro'yxati (sana filter)
- `ShiftDetailModal`: vaqt, statistika, to'lov progress bar, kassa farqi, top mahsulotlar
- Excel + PDF export
- `ShiftController` — `SHIFT_VIEW` permission (avval `SALES_VIEW` edi)
- `ShiftRepository.findAllFiltered` — native SQL + CAST fix
- `V20__shift_view_permission.sql` — yangi permission

#### StockMovementsPage — yangilandi
- Server-side `productName` qidiruv (400ms debounce)
- `StockMovementRepository` — products JOIN + CAST filter
- Export Excel + PDF
- Manba bosilganda navigate (Xarid/Sotuv sahifasiga)
- Sahifa yig'indisi (kirim/chiqim)

#### Dashboard — to'liq yangilandi
- Joriy smena badge (yashil/kulrang)
- Muddati o'tgan nasiyalar ogohlantirish banner
- `todayDebt` — bugungi nasiya summasi
- Top 5 mahsulot (bugun)
- Kam qolgan mahsulotlar ro'yxati (guruhlab, is_deleted filter)
- So'nggi 5 xarid (`totalDisplay` — USD/UZS/aralash)
- `DashboardPage.css` — yangi CSS fayl

#### Export tizimi — yangi
- `src/utils/exportUtils.js` — `exportToCSV`, `exportToPDF`, `fmtNum`, `fmtDate`, `fmtDateTime`
- jsPDF + autoTable CDN orqali yuklanadi
- SalesPage, PurchasesPage, DebtsPage, Aging Report da export tugmalari

#### ProductsPage — yangilandi
- `minStock` field — yangi mahsulotda ham, edit da ham bitta input
- Tannarx: USD yoki UZS; Sotuv narx va Minimal narx: doim UZS
- Inline stillar CSS class larga o'tkazildi (`.stock-info-row`, `.toast-msg`)
- `ProductRequest.ProductUnitRequest` — `minStock` field qo'shildi
- `ProductService.updateProduct` — barcha omborlardagi `minStock` yangilanadi

#### Bug fixlar
- `DebtsPage` — eski modal qoldiqlari olib tashlandi (Statement expected xatosi)
- `ShiftRepository` — PostgreSQL NULL type xatosi fix (native SQL + CAST)
- `WarehouseStockRepository` — `warehouse_stocks` → `warehouse_stock`, `pu.is_deleted` yo'qligi fix
- `DashboardResponse.RecentPurchaseItem` — `totalDisplay` field (USD xaridlar 0 UZS ko'rinardi)

---

## Session: 2026-03-27 — CashierPage bugfixlar + UX yaxshilanishlari

### Bajarilgan ishlar

#### Bug: DRAFT savatcha oxirgi mahsulot o'chirilganda bekor qilinmadi
- `removeItem(id)` — natija bo'sh bo'lsa `clearCart()` chaqiradi (avval shunchaki `setCart([])`)
- `updateQty(id, delta)` — qty 0 ga tushsa va cart bo'shasa `clearCart()` chaqiradi
- `clearCart()` — `loadHoldSales()` chaqirish qo'shildi (cancel dan keyin ro'yxat yangilanadi)
- **Asosiy fix**: `currentSaleRef = useRef(null)` qo'shildi — stale closure muammosini hal qildi
  - `currentSale` state closure da null ko'rinardi (PaymentModal yopilgandan keyin)
  - `currentSaleRef.current` har doim joriy qiymatni saqlaydi
  - Barcha `setCurrentSale(x)` chaqiruvlarida `currentSaleRef.current = x` ham yangilanadi
  - `clearCart` endi `currentSaleRef.current?.id` ishlatadi (state emas)

#### Bug: "To'lov" tugmasi ikki marta bosilsa yangi DRAFT yaratilardi
- `handlePay`: `currentSale?.id` mavjud bo'lsa yangi DRAFT yaratmay faqat modal ochadi

#### Qidiruv: klaviatura navigatsiya qo'shildi
- `dropIdx` state (default -1) — dropdown highlight indeksi
- Input `onKeyDown`:
  - `ArrowDown` — keyingi natija highlight (0 dan boshlab)
  - `ArrowUp` — oldingi natija (-1 = highlight yo'q, input fokusda)
  - `Enter` — `dropIdx >= 0` bo'lsa o'sha mahsulotni tanlaydi
- `dropIdx` reset: search o'zgarganda, mahsulot tanlanganda, Escape da, clear tugmasida
- `useEffect([dropIdx])` — `.scrollIntoView({ block: 'nearest' })` avtomatik scroll
- `.pos-search-item--active` — CSS highlight class

#### UI: "Yangi" tugmalari stili yangilandi
- `pos-sec-create-btn` — outline stildan to'liq ko'k (`var(--primary)`) stilga o'tkazildi
- `btn-add` (CustomersPage) uslubida lekin compact o'lchamda (11px font, 4px 10px padding)
- Hover: ko'tarilish effekti + ko'k soya (`0 2px 8px rgba(37,99,235,0.3)`)

### Texnik eslatmalar (yangi)

#### currentSaleRef pattern
```js
const [currentSale, setCurrentSale] = useState(null)
const currentSaleRef = useRef(null) // stale closure dan himoya

// Har doim birga yangilanadi:
setCurrentSale(value)
currentSaleRef.current = value

// clearCart ichida state emas ref ishlatiladi:
if (resetSale && currentSaleRef.current?.id) {
    const saleId = currentSaleRef.current.id
    currentSaleRef.current = null
    api.patch(`/api/v1/sales/${saleId}/cancel`).then(() => loadHoldSales())
}
```

---

## Session: 2026-03-26 — Sotuv → Nasiya zanjiri

### Bajarilgan ishlar

#### Backend
- `SalePayment` entity: `dueDate` field qo'shildi (DEBT to'lov muddatini saqlash uchun)
- `SalePaymentResponse`: `dueDate` field qo'shildi
- `SaleService.complete()`: DEBT to'lovda `dueDate` saqlash
- `SaleService.toResponse()`: `dueDate` map qilish
- `V21__sale_payment_due_date.sql`: `sale_payments` jadvaliga `due_date DATE` ustun

#### Frontend (PaymentModal)
- `noCustomerDebt` flag: DEBT tanlangan + mijoz yo'q bo'lsa — submit tugmasi darhol disabled + banner
- `debtInfo` state: `checkDebtLimit` API response har doim saqlanadi (faqat exceeded emas)
- Mijoz borligida DEBT tanlansa — `debtInfo.currentDebt` va `debtInfo.remaining` ko'rsatiladi
- `.pos-debt-info-card` — yangi CSS class

#### Frontend (ReceiptModal)
- `sale.debtAmount > 0` bo'lsa — sariq "NASIYA" bloki: summa + muddat (agar berilgan bo'lsa)
- Xuddi shu PDF chekda ham ko'rsatiladi
- `.receipt-debt-block`, `.receipt-debt-title`, `.receipt-debt-row` — yangi CSS class lar

---

## Session: 2026-03-25 — CashierPage refaktor + bugfixlar + tarmoq sozlamalar

### Bajarilgan ishlar

#### CashierPage — to'liq refaktor
- **Inline stillar** — 127 ta inline stildan 120 tasi CSS class larga ko'chirildi
- Yangi CSS class lar: `pos-ss-*`, `pos-modal--*`, `pos-pay-*`, `pos-cart-*`, `pos-popover`, `pos-toast`, `pos-unit-*`, `pos-debt-limit-*` va boshqalar
- `CashierPage.css` — 300+ qator yangi class lar qo'shildi

#### Barcode scanner — to'liq qayta yozildi
- **Scanner auto-detect**: EAN-8 (8), UPC-A (12), EAN-13 (13) — Enter kutmay 80ms da avtomatik tanlaydi
- **Enter handler**: search inputda Enter bosilsa darhol `/api/v1/products/barcode/{code}` chaqiradi
- **Ctrl+V global**: input aktiv bo'lmasa ham paste ishlaydi (`navigator.clipboard.readText()`)
- **onPaste handler**: barcode formatida (8-13 raqam) bo'lsa avtomatik qidiradi
- Fallback: barcode endpoint da yo'q bo'lsa search endpoint orqali qidiradi

#### ProductRepository — barcode qidiruv
- `findAllFiltered` — `product_units.barcode` ga `LEFT JOIN` qo'shildi
- Endi qidiruv: `name`, `sku`, `barcode` bo'yicha ishlaydi

#### Stock movement bug fix
- `clearCart()` — agar `currentSale` (DRAFT) bo'lsa backend da `cancel` API chaqiriladi
- `cancelOpenSale` — `clearCart(false)` ishlatadi (ikki marta cancel oldini olish)
- `onCompleted` — `clearCart(false)` (sale tugallandi, cancel kerak emas)

#### Ctrl+P/D hotkeys — olib tashlandi
- Brauzer da ishonchsiz ishlardi
- Foydalanuvchi sichqoncha bilan ishlaydi

#### updateQty bug fix
- `Math.round(qty * 1000) / 1000` — float muammosi hal qilindi
- `quantity <= 0` bo'lsa mahsulot savatchadan o'chadi (0.00 holati yo'q)

#### Tarmoq sozlamalari
- `vite.config.js` — `host: true` qo'shildi (tarmoqdagi qurilmalar kirishi uchun)
- `SecurityConfig.java` — `setAllowedOriginPatterns(["*"])` (barcha IP larga ruxsat)
- `WebConfig.java` — absolut path → `System.getProperty("user.dir") + uploadDir`
- `FileUploadService.java` — `baseUrl` dinamik (`HttpServletRequest` dan IP olinadi)
- `application.properties` — `app.upload.base-url` olib tashlandi, `app.upload.dir=uploads` (relative)
- `api.js` — `baseURL: ''` (Vite proxy orqali ishlaydi, localhost hardcode emas)

#### CashierPage UX yaxshilanishlari
- **lastSale badge** — oxirgi sotuv smena badge yonida yashil pill ko'rinishida
- **DRAFT fix** — to'lov yakunlanganda `setCurrentSale(null)` + `clearCart(false)`
- **Auto-focus** — har qanday harf bosilsa search inputga focus

### Texnik eslatmalar (yangi)

#### Barcode scanner arxitekturasi
```js
// 1. Global keydown listener (capture phase)
// 2. Har bir belgini scannerBuffer ga yig'adi
// 3. EAN-8/12/13 uzunlikka yetsa — 80ms timeout, keyin qidirish
// 4. Enter kelsa — darhol qidirish
// 5. 400ms ichida Enter kelmasa — oddiy klaviatura, buffer tozalanadi
```

#### clearCart logikasi
```js
clearCart(resetSale = true)
// resetSale=true  → currentSale cancel qilinadi (trash tugmasi)
// resetSale=false → cancel chaqirilmaydi (sale tugallandi yoki cancelOpenSale)
```

#### Tarmoq
- Frontend: `http://192.168.x.x:5173` (vite --host)
- Backend: `http://192.168.x.x:8080` (server.address=0.0.0.0)
- Rasm URL lari: so'rov kelgan IP dan dinamik olinadi
- CORS: barcha originlarga ruxsat (`setAllowedOriginPatterns(["*"])`)
- `navigator.clipboard.readText()` — HTTPS yoki localhost da ishlaydi; HTTP tarmoqda brauzer ruxsat so'rashi mumkin
