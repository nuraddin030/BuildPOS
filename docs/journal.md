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
| V23 | pending_order_system | sales.submitted_at, sales.status ENUM + PENDING/HOLD qo'shildi |
| V24 | product_unit_conversion | product_units.conversion_factor DECIMAL(12,4) DEFAULT 1, is_base_unit BOOLEAN DEFAULT FALSE |

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
│   ├── ProductService.java           ← yangilandi (minStock, multi-unit, slug/barcode fix, update by unit ID)
│   ├── PurchaseService.java
│   ├── RoleService.java
│   ├── SaleService.java              ← yangilandi (multi-unit: resolveBaseStock, effectiveQty, deduct/check/return)
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
│   ├── ProductRepository.java        ← yangilandi (existsBySlug — o'chirilgan mahsulotlar ham tekshiriladi)
│   ├── ProductUnitRepository.java    ← yangilandi (findByProductIdAndIsBaseUnitTrue qo'shildi)
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
│   └── WarehouseStockRepository.java ← yangilandi (countLowStockItems native, findLowStockItems)
├── dto/
│   ├── request/
│   │   ├── ProductRequest.java           ← yangilandi (minStock, id/conversionFactor/isBaseUnit qo'shildi)
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
│   ├── ProductsPage.jsx    ← yangilandi (refaktoring: modal olib tashlandi, ~190 qator, navigate to form)
│   ├── ProductFormPage.jsx ← yangi (mahsulot qo'shish/tahrirlash sahifasi, multi-unit support)
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
- ProductsPage (minStock, multi-unit, refaktoring)
- **ProductFormPage** (yangi sahifa — `/products/new`, `/products/:id/edit`)
- CategoriesPage, UnitsPage, WarehousesPage
- CustomersPage (debtLimit bilan)
- SuppliersPage, PartnersPage
- EmployeesPage (permissions modal)
- PurchasesPage, PurchaseNewPage, PurchaseDetailPage (PDF bilan)
- CashierPage (to'liq POS, multi-unit support)
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
| ~~Pending Order tizimi~~ | 2026-03-30 |
| ~~Kassir nomi bug fix~~ | 2026-04-02 |
| ~~Smena kechagi ogohlantirishi~~ | 2026-04-02 |
| ~~Real-time stok ko'rsatish~~ | 2026-04-03 |
| ~~Tezkor mahsulotlar (Favorites)~~ | 2026-04-03 |
| ~~QR/Kamera skaneri~~ (CashierPage + ProductsPage, HTTPS) | 2026-04-03 |
| ~~Multi-unit konversiya~~ (Metr+Pochka, stock base unit da) | 2026-04-06 |
| ~~ProductFormPage~~ (modal → alohida sahifa) | 2026-04-06 |

### 🔴 Muhim — tezroq qilish kerak
| # | Vazifa | Qiyinlik | Izoh |
|---|--------|----------|------|
| ~~1~~ | ~~Qaytarish moduli UI~~ | ~~O'rta~~ | ✅ Tugallandi (2026-04-07) |
| ~~2~~ | ~~Purchase → multi-unit fix~~ | ~~O'rta~~ | ✅ Tugallandi (2026-04-07) — 10 dona → 40 metr test ✅ |
| ~~3~~ | ~~ProductFormPage — edit da yangi unit qo'shish~~ | ~~O'rta~~ | ✅ Tugallandi (2026-04-07) |
| 4 | **Buyurtmaga izoh (assistant_note)** | Oson | Kassir adminga yuborishda izoh yozsin |

### 🟡 O'rta muhimlik
| # | Vazifa | Qiyinlik | Izoh |
|---|--------|----------|------|
| 5 | **Inventarizatsiya (Revision) moduli** | Qiyin | Haqiqiy omborni sanab tizim bilan solishtirish, oyda bir marta |
| 6 | **Narx tarixi grafigi** | Oson | price_history jadvali tayyor, faqat UI kerak (ProductFormPage yoki alohida) |
| 7 | **Mahsulot Excel import** | O'rta | 500-1000 mahsulotni bittada kiritish uchun |
| 8 | **Smena kassa hisoboti chop etish** | Oson | Smena yopilganda A4 chop: naqd/karta/nasiya, kassir imzosi joyi |
| 9 | **Mijozga avtomatik chegirma** | O'rta | Har bir mijozga doimiy % chegirma, CashierPage da avtomatik qo'llanadi |

### 🟢 Keyingi bosqich
| # | Vazifa | Qiyinlik | Izoh |
|---|--------|----------|------|
| 10 | **P&L Hisobotlar** | Qiyin | Daromad/zarar hisoboti — tannarx vs sotuv narxi |
| 11 | **Hisob-faktura PDF (A4)** | O'rta | B2B mijozlar uchun rasmiy hujjat |
| 12 | **Docker + avtomatik backup** | O'rta | Loyiha oxirida, PostgreSQL dump kunlik |
| 13 | **Telegram Bot + Cloudflare Tunnel** | Qiyin | Masofadan kirish + bildirishnomalar (kam stok, katta sotuv) |

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

## Session: 2026-04-07 — Multi-unit bugfixlar, Production build, Linux case-sensitivity

### Bajarilgan ishlar

#### 1. conversionFactor UI yo'nalishi o'zgartirildi (`ProductFormPage.jsx`)

**Muammo:** Foydalanuvchi "1 Dona = 4 Metr" deb kiritmoqchi edi, lekin forma "1 ta shu birlik = [N] [base]" ko'rinishida edi.

**Fix:**
- **Yuklashda** (DB → UI): saqlangan `0.25` → foydalanuvchiga `4` ko'rsatiladi (`1 / 0.25`)
- **Saqlashda** (UI → DB): kiritilgan `4` → `0.25` saqlanadi (`1 / 4`)
- **Label o'zgarishi:** `"1 {baseUnitName} = [input] {thisUnitName}"` — IIFE orqali runtime da hisoblanadi
- Placeholder: `"4"` (avval `"0.25"` edi)

**Test natijasi:** 10 Dona xarid → `10 × 4 = 40 Metr` base stockga to'g'ri qo'shildi ✅

---

#### 2. Purchase → multi-unit fix (`#2 vazifa`)

**Muammo:** Xarid qilganda non-base birlik (masalan Pochka) tanlansa, stock asosiy birlikka (Metr) qo'shilmay, Pochka ga to'g'ridan-to'g'ri yozilardi.

**Backend `PurchaseService.receiveItem()` — to'liq qayta yozildi:**
```java
ProductUnit purchasedUnit = item.getProductUnit();
ProductUnit stockUnit = purchasedUnit;
BigDecimal effectiveQty = qty;

if (!Boolean.TRUE.equals(purchasedUnit.getIsBaseUnit())) {
    stockUnit = productUnitRepository
            .findByProductIdAndIsBaseUnitTrue(purchasedUnit.getProduct().getId())
            .orElse(purchasedUnit);
    BigDecimal cf = purchasedUnit.getConversionFactor();
    if (cf != null && cf.compareTo(BigDecimal.ONE) != 0) {
        effectiveQty = qty.multiply(cf);  // 10 Dona × 4 = 40 Metr
    }
}
// WarehouseStock asosiy birlik (stockUnit) ga qo'shiladi
stock = warehouseStockRepository.findByWarehouseIdAndProductUnitId(warehouse.getId(), stockUnit.getId())
```
- StockMovement ham `stockUnit` va `effectiveQty` bilan yoziladi

**Frontend `PurchaseNewPage.jsx` — birlik tanlash qo'shildi:**
- `EMPTY_FORM` ga `availableUnits: []` field
- `selectProduct()`: barcha birliklarni saqlaydi, asosiy birlik default tanlangan
- `selectUnit()` funksiyasi — birlik o'zgartirilganda narx va birlik yangilanadi
- UI: bir nechta birlik bo'lsa chip tugmalar (tanlangan — ko'k), bitta bo'lsa yashirin
- Clear tugmasi `availableUnits` ham tozalaydi

**Test natijasi:** 10 Dona xarid → `10 × 4 = 40 Metr` asosiy stokga to'g'ri qo'shildi ✅

---

#### 3. Edit rejimida yangi birlik qo'shish — to'liq fix (`#3 vazifa`)

**Muammo:** Mahsulotni tahrirlashda "+" bilan yangi birlik qo'shilganda `id=null` bo'lgani uchun backend `continue` qilib o'tib ketardi — saqlanmadi.

**Backend (`ProductService.update()`):**
- `id == null` → yangi `ProductUnit` yaratiladi (avval `continue` edi)
- Non-base birlik uchun `WarehouseStock` yaratilmaydi (zaxira `baseStock / cf` orqali hisoblanadi)
- `isBaseUnit` majburan `false` — edit orqali qo'shilgan birlik hech qachon asosiy bo'lmaydi
- Barcode tekshiruvi: faqat boshqa mahsulotlarda mavjudligini tekshiradi (o'sha mahsulot o'z birligiga xatolik bermaydi)

**Frontend (`ProductFormPage.jsx`):**
- Shart `!isEdit` → `!isEdit || !u.id` — yangi birliklar uchun initial stock maydonlari ko'rinadi
- "Asosiy birlik" radio: `disabled` + `"(yangi birlik — asosiy bo'lmaydi)"` yozuvi
- Non-base yangi birlik: `"Zaxira asosiy birlik orqali hisoblanadi"` xabari (stock maydoni o'rniga)

---

#### 3. Qaytarish moduli UI (`#1 vazifa`) — allaqachon tayyor ekani aniqlandi

`SalesPage.jsx` da `ReturnModal` komponenti va `salesApi.returnSale` to'liq yozilgan — avvalgi sessiyada amalga oshirilgan.

---

#### 4. Production build tayyorlash (`vite.config.js`, `main.jsx`)

**Muammo:** Lokal (Windows) da `@vitejs/plugin-basic-ssl` va HTTPS kamera uchun kerak edi. Production da bu paket yo'q.

**Fix `vite.config.js`:**
```js
// O'chirildi:
import basicSsl from '@vitejs/plugin-basic-ssl'
plugins: [react(), basicSsl()]
https: true

// O'zgartirildi:
plugins: [react()]
build: { outDir: 'dist' }   // avval '../src/main/resources/static' — Docker da noto'g'ri yo'l
```

**Fix `main.jsx`:**
```js
// Avval (Windows da ishlardi, Linux da yo'q):
import '../src/styles/variables.css'
import '../src/styles/layout.css'
import '../src/styles/common.css'

// Endi:
import './styles/Variables.css'
import './styles/layout.css'
import './styles/Common.css'
```

---

#### 5. Linux case-sensitive import yo'llari — to'liq tekshirish va tuzatish

**Muammo:** Windows da fayl tizimi case-insensitive — `import '../api/auth'` va `Auth.js` bir xil ishlaydi. Linux da XATO beradi.

**Tuzatilgan fayllar (7 ta):**
| Fayl | O'zgarish |
|---|---|
| `context/AuthContext.jsx` | `api/auth` → `api/Auth` |
| `pages/CustomersPage.jsx` | `api/customers` → `api/Customers` |
| `pages/PartnersPage.jsx` | `api/partners` → `api/Partners` |
| `pages/PurchaseNewPage.jsx` | `api/suppliers` → `api/Suppliers` |
| `pages/SuppliersPage.jsx` | `api/suppliers` → `api/Suppliers` |
| `pages/UnitsPage.jsx` | `api/units` → `api/Units` |
| `pages/WarehousesPage.jsx` | `api/warehouses` → `api/Warehouses` |

**CSS fayl nomi noto'g'riligi:**
- `DashboardPage.jsx` → `DashboardPage.css` import qilardi
- Haqiqiy fayl: `dashboardpage.css` (kichik harf)
- Fix: `git mv frontend/src/styles/dashboardpage.css frontend/src/styles/DashboardPage.css`

---

### VPS ga o'tkazishda nima o'zgardi

| Muammo | Sabab | Fix |
|--------|-------|-----|
| `@vitejs/plugin-basic-ssl` yo'q xatosi | Paket faqat lokal o'rnatilgan, prod da yo'q | `vite.config.js` dan olib tashlandi |
| `outDir: '../src/main/resources/static'` — Docker da noto'g'ri yo'l | Lokal uchun Spring Boot ga embed qilish uchun edi | `outDir: 'dist'` — Docker Nginx uchun to'g'ri yo'l |
| `../src/styles/...` — import muammosi | `src/main.jsx` `src/` ichida, `../src/` noto'g'ri relative yo'l | `./styles/...` ga o'zgartirildi |
| `api/auth` → `Auth.js` topilmadi | Linux case-sensitive, Windows da ko'rinmagan | Barcha 7 ta import to'g'irlandi |
| `dashboardpage.css` → `DashboardPage.css` topilmadi | Fayl nomi kichik harf edi | `git mv` bilan renamed |

---

### ⚠ Kelajakda bu xatolarni takrorlamaslik

**Qoida 1: Yangi fayl yaratganda — import bilan bir xil nom**
```
❌ styles/dashboardpage.css  + import 'DashboardPage.css'
✅ styles/DashboardPage.css  + import 'DashboardPage.css'
```

**Qoida 2: api/ papkasidagi fayllar — import da xuddi shunday**
```
api/Auth.js      → import from '../api/Auth'    ✅
api/Customers.js → import from '../api/Customers' ✅
api/api.js       → import from '../api/api'     ✅  (kichik harf!)
```

**Qoida 3: Production build ni commit dan oldin sinab ko'r**
```bash
cd frontend && npm run build
# Xato bo'lsa — tuzat, keyin push qil
```

**Qoida 4: Lokal-only paketlar `devDependencies` da bo'lishi kerak**
```
@vitejs/plugin-basic-ssl — faqat dev da kerak, prod da yo'q
→ package.json da devDependencies ichida bo'lsin
→ Yoki vite.config.js da env tekshiruv bilan:
   if (process.env.NODE_ENV !== 'production') plugins.push(basicSsl())
```

**Qoida 5: vite.config.js outDir**
```js
// Docker/production uchun:
build: { outDir: 'dist' }  // ✅ Nginx /usr/share/nginx/html ga ko'chiradi

// Spring Boot embed (JAR) uchun:
build: { outDir: '../src/main/resources/static' }  // ❌ Docker da noto'g'ri
```

---

### Fayl o'zgarishlari (2026-04-07)
- **Yangilandi:** `ProductFormPage.jsx` (conversionFactor yo'nalishi, yangi unit fix)
- **Yangilandi:** `ProductService.java` (yangi unit create, barcode check, non-base WarehouseStock o'chirildi)
- **Yangilandi:** `vite.config.js` (basicSsl olib tashlandi, outDir=dist)
- **Yangilandi:** `src/main.jsx` (import yo'llari tuzatildi)
- **Yangilandi:** `context/AuthContext.jsx`, `CustomersPage.jsx`, `PartnersPage.jsx`, `PurchaseNewPage.jsx`, `SuppliersPage.jsx`, `UnitsPage.jsx`, `WarehousesPage.jsx` (api/ import case-fix)
- **Renamed:** `styles/dashboardpage.css` → `styles/DashboardPage.css`

---

## Session: 2026-04-06 — Multi-unit konversiya, ProductFormPage, Bugfixlar

### Bajarilgan ishlar

#### V24 — product_units yangi ustunlar
```sql
ALTER TABLE product_units
    ADD COLUMN IF NOT EXISTS conversion_factor DECIMAL(12, 4) NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS is_base_unit      BOOLEAN       NOT NULL DEFAULT FALSE;
UPDATE product_units SET is_base_unit = TRUE WHERE is_default = TRUE;
```
- `conversion_factor` — 1 ta shu birlik = nechta asosiy birlik (masalan: 1 pochka = 250 metr)
- `is_base_unit` — faqat asosiy birlikning `WarehouseStock` yozuvi bor
- Mavjud unitlar: `is_default = TRUE` bo'lganlari avtomatik `is_base_unit = TRUE` ga o'tkazildi

#### Multi-unit konversiya arxitekturasi
**Konsepsiya:**
- Elektr kabel: Metr (asosiy) + Pochka (1 pochka = 250 metr)
- Stock faqat Metr da saqlanadi
- Pochka sotilganda → 250 metr kamayadi
- Narx mustaqil belgilanadi (1 metr = 2 000 so'm, 1 pochka = 500 000 so'm)

**Backend o'zgarishlar:**

`ProductUnit` entity:
```java
@Column(nullable = false, precision = 12, scale = 4)
private BigDecimal conversionFactor = BigDecimal.ONE;
@Column(nullable = false)
private Boolean isBaseUnit = false;
```

`SaleService` — yangi private metodlar:
- `resolveBaseStock(SaleItem)` — non-base unit bo'lsa base unit ning `WarehouseStock` ini topadi
- `effectiveQty(SaleItem)` — `quantity × conversionFactor` hisoblaydi
- `deductStockForSale(Sale)` — savatchadagi barcha itemlar uchun stockni kamaytiradi (base unit orqali)
- `checkStockForSale(Sale)` — sotishdan oldin stok tekshiruvi (base unit orqali)
- `returnStockForSale()` — qaytarishda base unit stockga `effectiveQty` qaytaradi
- `returnSale()` — partial return ham base unit stockga `qty × cf` qaytaradi

`checkWarehouses()` — non-base unit uchun base unit ning omborlarini qaytaradi

`ProductService`:
- `create` — `isBaseUnit`, `conversionFactor` maydonlarini saqlaydi
- `update` — endi `unitReq.id` bo'yicha to'g'ri unit topib yangilaydi (avval faqat default unit yangilanardi)
- Slug uniqueness: `existsBySlug` (barcha qatorlar, o'chirilganlar ham) — oldin `existsBySlugAndIsDeletedFalse` edi (o'chirilgan mahsulot slug conflict qilardi)

`ProductUnitRepository`:
```java
Optional<ProductUnit> findByProductIdAndIsBaseUnitTrue(Long productId);
```

`ProductRequest.ProductUnitRequest` — yangi maydonlar:
```java
private Long id;              // edit uchun — mavjud product_unit ID si
private BigDecimal conversionFactor;
private Boolean isBaseUnit;
```

`ProductMapper` — `isLowStock` bug fix:
- Avval: har bir omborni `anyMatch` bilan tekshirardi → agar bitta omborda 0 bo'lsa qizil ko'rinardi
- Endi: `totalStock` (barcha omborlar yig'indisi) vs `minStockThreshold` — to'g'ri taqqoslash

#### ProductFormPage — yangi sahifa
`/products/new` va `/products/:id/edit` — modal o'rniga alohida sahifa.

**Arxitektura:**
- `ProductsPage.jsx` — 779 qatordan ~190 qatorga: faqat ro'yxat, filter, pagination
- `ProductFormPage.jsx` — yangi fayl: mahsulot qo'shish/tahrirlash formi
- `Layout.jsx` — yangi routelar: `ProtectedRoute` bilan `PRODUCTS_CREATE` / `PRODUCTS_EDIT`

**ProductFormPage xususiyatlari:**
- PurchaseNewPage stilida: `table-card` sektsiyalar, `act-btn` orqaga, `btn-add` saqlash
- Rasm thumbneil (88×88) + asosiy ma'lumotlar bitta kartada
- Har bir birlik: alohida karta, `isBaseUnit` radio button, konversiya input
- Konversiya panel: asosiy bo'lsa ko'k fon, aks holda `1 ta shu birlik = [N] [base_symbol]`
- Narx qatori: valyuta 10%, sotuv/minimal/tannarx 30%dan
- Camera scanner: `ScanLine` icon, avtomatik barcode: `Shuffle` icon
- `EMPTY_UNIT.isBaseUnit = false`, birinchi unit avtomatik `isBaseUnit = true`
- Kategoriyalar: `getCategoriesTree` → xatolikda `getCategories` fallback
- Edit paytida: `unit.id` payload ga qo'shiladi → `update()` to'g'ri unit topadi

**CSS qo'shimchalari (`ProductsPage.css`):**
- `.input-action-btn` — yangi klass (barcode scanner/generate tugmalari uchun), hover effekti
- `.form-row-4 .form-group { flex: 1; min-width: 0; }` — 4 ta input teng kenglikda

#### CashierPage — multi-unit stock fix
```js
function resolveUnitStock(unit, allUnits, warehouseId) {
    // non-base unit: base unit stock / conversionFactor
}
```
- `UnitModal` — stock badge `resolveUnitStock` ishlatadi
- `addUnitToCart` — stock tekshiruv `resolveUnitStock` ishlatadi
- `UnitModal` birlik ko'rsatishi: `unitName` (asosiy) + `unitSymbol · barcode` (kichik)

### Bugfixlar
| Bug | Sabab | Fix |
|-----|-------|-----|
| Slug conflict (o'chirilgan mahsulot) | `existsBySlugAndIsDeletedFalse` — DB constraint barcha qatorlarga qo'llanadi | `existsBySlug` ga o'tkazildi |
| Barcode conflict (edit da) | Uniqueness tekshiruvi yo'q edi | `existsByBarcodeAndIdNot` qo'shildi |
| Update faqat default unitni yangilardi | `findByProductIdAndIsDefaultTrue` loop ichida | `unitReq.id` bo'yicha to'g'ri unit topiladi |
| checkWarehouses bo'sh qaytarardi | Pochka uchun `WarehouseStock` yo'q | Base unit ning stocki qaytariladi |
| isLowStock noto'g'ri | Per-warehouse `anyMatch` | `totalStock` vs `minStockThreshold` |

### Joriy migration versiya: V24
### Fayl o'zgarishlari
- **Yangi:** `V24__product_unit_conversion.sql`, `ProductFormPage.jsx`
- **Yangilandi:** `ProductUnit.java`, `ProductRequest.java`, `ProductResponse.java`, `ProductUnitRepository.java`, `ProductRepository.java`, `ProductService.java`, `SaleService.java`, `ProductMapper.java`, `ProductsPage.jsx`, `CashierPage.jsx`, `Layout.jsx`, `ProductsPage.css`

---

## Session: 2026-04-03 — Stok, Favorites, Kamera skaneri, HTTPS

### Bajarilgan ishlar

#### Real-time stok ko'rsatish
- Qidiruv dropdown da `p.totalStock` asosida yashil/qizil badge
- Stok = 0 bo'lsa `addUnitToCart` da bloklash + toast xabar
- UnitModal da ham har bir birlik uchun stok badge
- `ProductSummaryResponse.totalStock` ishlatiladi (list endpoint `warehouseStocks` qaytarmaydi)

#### Tezkor mahsulotlar (Favorites)
- `localStorage` asosida — har safar mahsulot qo'shilganda hisob yuritiladi
- Top 10 eng ko'p qo'shilgan mahsulot savatcha tepasida chip sifatida
- `pos-favs-wrap` — gorizontal scroll, o'ng tomonda fade gradient
- Chip: ko'k chap chegara, hover effekti, rasm yoki rang nuqtasi

#### QR/Shtrix kod kamera skaneri
- `CameraScanner` — `src/components/CameraScanner.jsx` (shared komponent)
- `html5-qrcode@2.3.8` CDN orqali (birinchi ochilishda yuklanadi)
- Fallback: `facingMode:environment` → `getCameras()` ID orqali
- `isRunningRef` — `stop()` faqat scanner ishlab turganida chaqiriladi
- **CashierPage**: topbar da 📷 tugma, scan → `searchByBarcode()`
- **ProductsPage**: shtrix kod inputi yonida 📷 tugma, scan → barcode input ga yoziladi

#### HTTPS (kamera uchun zarur)
- `@vitejs/plugin-basic-ssl` o'rnatildi
- `vite.config.js` ga `basicSsl()` + `https: true` qo'shildi
- Tarmoqda `https://[IP]:5173` — telefon brauzerda bir marta "Proceed" bosish kerak

#### searchByBarcode refaktoring
- `doScannerSearch` `useEffect` ichidan chiqarib, component darajasida `searchByBarcode` funksiyasi yaratildi
- Fizik scanner va kamera scanner bir xil funksiyani ishlatadi

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

---

## 🔐 Kiberxavfsizlik va Internet Deploy — Vazifalar

> Eskiz.uz VPS ga deploy qilishdan oldin bajarilishi zarur. Rasmiy axborot xavfsizligi sertifikati olish maqsadida OWASP Top 10 va mahalliy talablar asosida tuzilgan.
>
> **Muhimlik:** 🔴 KRITIK — deploy dan oldin | 🟡 YUQORI — 1 hafta ichida | 🟢 O'RTA — 1 oy ichida

---

### Backend vazifalar (Spring Boot + PostgreSQL)

#### 🔴 B-01 — JWT Refresh Token mexanizmi
- Access token: **15 daqiqa** (hozir 24 soat — xavfli)
- Refresh token: **7 kun**, `HttpOnly` cookie da saqlash
- Yangi endpoint: `POST /api/auth/refresh`
- V25 migration: `refresh_tokens` jadvali (token, user_id, expires_at, revoked)
- Fayllar: `AuthController.java`, `JwtService.java`, `V25__refresh_tokens.sql`

#### 🔴 B-02 — HTTPS majburiy qilish
- HTTP → HTTPS 301 redirect (Nginx darajasida)
- Spring Security da ham `requiresSecure()` qo'shish
- Fayllar: `SecurityConfig.java`, `nginx.conf`

#### 🔴 B-03 — CORS production domeniga cheklash
- Hozir: `setAllowedOriginPatterns(["*"])` — barcha originlarga ruxsat (lokal uchun to'g'ri edi)
- O'zgartiriladi: `setAllowedOrigins(["https://yourdomain.uz"])`
- Fayllar: `SecurityConfig.java`, `application-prod.properties`

#### 🔴 B-04 — Rate Limiting
- Login endpointi: 5 urinish / 15 daqiqa (IP bo'yicha)
- Boshqa endpointlar: 200 so'rov / daqiqa (token bo'yicha)
- 429 Too Many Requests + `Retry-After` header
- Kutubxona: `Bucket4j` yoki oddiy `OncePerRequestFilter`
- Fayllar: `RateLimitFilter.java`, `SecurityConfig.java`

#### 🔴 B-05 — Environment Variables (maxfiy ma'lumotlar kodda bo'lmasin)
- JWT secret, DB parol, DB URL — hamma `.env` ga ko'chiriladi
- `application.properties` → `application-prod.properties` (env dan o'qiydi)
- `.env` hech qachon Git ga yuklanmaydi (`.gitignore` da)
- Fayllar: `application.properties`, `.env.example`, `.gitignore`

#### 🔴 B-06 — Swagger UI ni production da o'chirish
- `springdoc.swagger-ui.enabled=false` — prod profilda
- Yoki Basic Auth bilan himoyalash
- Fayllar: `SwaggerConfig.java`, `application-prod.properties`

#### 🔴 B-07 — SQL Injection tekshiruvi
- Barcha native query larda `@Param` + `PreparedStatement` ishlatilayotganini tekshirish
- String concatenation bilan query qurilmayotganini tekshirish
- Fayllar: Barcha `*Repository.java` fayllar

#### 🟡 B-08 — Token Blacklist DB ga ko'chirish
- Hozir: in-memory (restart da tozalanib ketadi — xavfli)
- O'zgartiriladi: DB jadvaliga saqlash yoki Redis
- V25 migration bilan birga amalga oshirish
- Fayllar: `TokenBlacklistService.java`

#### 🟡 B-09 — Input Validation (DTO annotatsiyalar)
- Barcha `*Request.java` DTO larda: `@NotNull`, `@Size`, `@Pattern`, `@Min/@Max`
- Controllerlarda: `@Valid` annotatsiyasi
- Fayllar: Barcha `*Request.java` fayllar, barcha Controller metodlar

#### 🟡 B-10 — File Upload xavfsizligi
- MIME type tekshirish (Content-Type spoofing oldini olish)
- Fayl hajmi cheklash: maks 5 MB
- Fayl nomini sanitize qilish (path traversal oldini olish)
- Fayllar: `FileUploadService.java`, `FileUploadController.java`

#### 🟡 B-11 — Audit Log jadvali
- **Sertifikat olish uchun asosiy talab**
- V26 migration: `audit_logs` jadvali
  ```sql
  CREATE TABLE audit_logs (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT,
      action VARCHAR(20),        -- CREATE, UPDATE, DELETE
      entity_type VARCHAR(50),   -- Sale, Product, Customer ...
      entity_id BIGINT,
      old_value JSONB,
      new_value JSONB,
      ip_address VARCHAR(45),
      created_at TIMESTAMP DEFAULT NOW()
  );
  ```
- `AuditLogFilter.java` — POST/PUT/PATCH/DELETE so'rovlarda avtomatik yozadi
- Fayllar: `AuditLogFilter.java`, `AuditLogRepository.java`, `V26__audit_logs.sql`

#### 🟡 B-12 — Xato xabarlarini standartlashtirish
- Stack trace, tizim yo'li, DB xato matni foydalanuvchiga ko'rinmasin
- Faqat `{error: "Xato yuz berdi", code: "ERR_001"}` shaklidagi javob
- Fayllar: `GlobalExceptionHandler.java`

#### 🟡 B-13 — Parol murakkablik talablari
- Minimal 8 belgi, katta harf, kichik harf, raqam majburiy
- `PasswordValidator.java` — alohida validator sinf
- Fayllar: `EmployeeService.java`, `PasswordValidator.java`

#### 🟡 B-14 — PostgreSQL faqat lokal ulanish
- `postgresql.conf`: `listen_addresses = '127.0.0.1'`
- `pg_hba.conf`: faqat lokal ulanishlarga ruxsat
- Alohida DB foydalanuvchi: `buildpos_user` (faqat zarur huquqlar, superuser emas)
- Fayllar: Docker ichida `pg_hba.conf`, `postgresql.conf`

#### 🟡 B-15 — HTTP Security Headers
- `X-Frame-Options: DENY` — clickjacking himoyasi
- `X-Content-Type-Options: nosniff` — MIME sniffing himoyasi
- `Content-Security-Policy` — XSS himoyasi
- `Strict-Transport-Security: max-age=31536000` — HTTPS majburiy
- `Referrer-Policy: strict-origin-when-cross-origin`
- Fayllar: `SecurityConfig.java` yoki `nginx.conf`

#### 🟢 B-16 — Actuator endpointlarni o'chirish
- Prod da faqat `/actuator/health` ochiq, qolganlari o'chiriladi
- Fayllar: `application-prod.properties`

#### 🟢 B-17 — Request Logging
- Har so'rov uchun: IP, method, path, status code, response time
- `logback-spring.xml` — Rolling file appender (kunlik, 30 kun saqlash)
- Fayllar: `LoggingFilter.java`, `logback-spring.xml`

#### 🟢 B-18 — Rasm o'lchami cheklash
- Maksimal qabul: 2000×2000 px, Thumbnailator bilan resize
- Fayllar: `FileUploadService.java`

---

### Frontend vazifalar (React + Nginx)

#### 🔴 F-01 — localStorage dan token ko'chirish (XSS himoyasi)
- Hozir: `localStorage` — XSS hujumiga ochiq
- **Variant A (tavsiya):** `HttpOnly` cookie — backend `Set-Cookie` orqali beradi, JS da o'qilmaydi
- **Variant B (oson):** `sessionStorage` — tab yopilganda tozalanadi, localStorage dan xavfsizroq
- Variant B tanlansa: `api.js` da `Authorization` header o'zgarishsiz ishlayveradi
- Fayllar: `api.js`, `AuthContext.jsx`

#### 🔴 F-02 — Content Security Policy (meta tag)
- `index.html` da CSP meta tag: faqat o'z domenidan skript/stil/rasm yuklanadi
- CDN lar (cdnjs.cloudflare.com) ruxsat ro'yxatiga qo'shiladi
- Fayllar: `index.html`

#### 🟡 F-03 — CDN kutubxonalarni npm ga ko'chirish
- `jsPDF`, `html5-qrcode` — CDN o'rniga `npm install` + import
- SRI hash bilan CDN qoldirilsa ham mumkin
- Fayllar: `package.json`, barcha CDN ishlatgan komponentlar

#### 🟡 F-04 — dangerouslySetInnerHTML tekshiruvi
- Barcha `.jsx` fayllardan `dangerouslySetInnerHTML` qidirish
- Topilsa — sanitize-html kutubxonasi bilan tozalash
- React o'zi XSS dan himoyalaydi, lekin bu prop — istisno

#### 🟡 F-05 — Logout da to'liq tozalash
- Token, barcha state, cache — to'liq o'chirilsin
- Login sahifaga yo'naltirish
- Fayllar: `AuthContext.jsx`

#### 🟡 F-06 — Vite production build sozlamalari
- `build.sourcemap: false` — kodni teskari muhandislikdan himoya
- `esbuild.drop: ['console', 'debugger']` — prod da log lar o'chadi
- `build.minify: 'esbuild'`
- Fayllar: `vite.config.js`

#### 🟡 F-07 — axios interceptor: 401 da avtomatik logout
- 401 javob kelganda: token tozalanadi, login ga yo'naltiradi
- Hozirgi holat tekshirilsin (bor yoki yo'q)
- Fayllar: `api.js`

#### 🟢 F-08 — robots.txt
- `/api/**` qidiruv robotlaridan yashirish
- Fayllar: `public/robots.txt`

#### 🟢 F-09 — Harakatsizlik timeout (Inactivity logout)
- 30 daqiqa harakatsizlikda avtomatik logout
- `mousemove`, `keydown`, `click` eventlarini kuzatadi
- Fayllar: `AuthContext.jsx`

---

### Deploy vazifalar (VPS + Docker + CI/CD)

#### 🔴 D-01 — backend/Dockerfile
```dockerfile
# Multi-stage: build → runtime
FROM maven:3.9-eclipse-temurin-17 AS build
# ... maven build ...
FROM eclipse-temurin:17-jre-alpine
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser
# maks 512MB heap, G1GC
ENTRYPOINT ["java", "-Xmx512m", "-XX:+UseG1GC", "-jar", "app.jar"]
```
- Non-root user (appuser) — root sifatida ishlamaslik
- Fayllar: `backend/Dockerfile`

#### 🔴 D-02 — frontend/Dockerfile
```dockerfile
FROM node:20-alpine AS build
# ... npm run build ...
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx-frontend.conf /etc/nginx/conf.d/default.conf
```
- Fayllar: `frontend/Dockerfile`

#### 🔴 D-03 — nginx.conf (SSL + Proxy)
```nginx
server {
    listen 80;
    return 301 https://$host$request_uri;  # HTTP → HTTPS
}
server {
    listen 443 ssl;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_certificate /etc/letsencrypt/live/domain/fullchain.pem;
    location /api { proxy_pass http://backend:8080; }
    location / { root /usr/share/nginx/html; try_files $uri /index.html; }
    # Security headers ham shu yerda
}
```
- Fayllar: `nginx/nginx.conf`

#### 🔴 D-04 — docker-compose.yml
```yaml
services:
  postgres:
    image: postgres:16-alpine
    networks: [internal]          # faqat ichki network
    env_file: .env
  backend:
    build: ./backend
    networks: [internal, proxy]
    env_file: .env
    depends_on: [postgres]
  nginx:
    build: ./frontend
    ports: ["80:80", "443:443"]
    networks: [proxy]
networks:
  internal:                        # tashqaridan ko'rinmaydi
  proxy:
```
- Barcha maxfiy ma'lumotlar `.env` dan
- Network isolation: postgres tashqaridan ko'rinmaydi
- Fayllar: `docker-compose.yml`

#### 🔴 D-05 — .env.example va .gitignore
```
# .env.example (faqat kalitlar, qiymatlar yo'q)
DB_PASSWORD=
JWT_SECRET=
POSTGRES_DB=
```
- `.gitignore` ga `.env` qo'shish
- Fayllar: `.env.example`, `.gitignore`

#### 🔴 D-06 — Let's Encrypt SSL sertifikat
- Certbot + Nginx plugin: `certbot --nginx -d yourdomain.uz`
- Avtomatik yangilanish: `systemd timer` yoki `cron`
- Muhlat: 90 kun (avtomatik yangilanadi)
- VPS da: `/etc/nginx/sites-available/buildpos`

#### 🔴 D-07 — PostgreSQL faqat ichki network
- Tashqi port mapping yo'q (`5432:5432` — yo'q)
- Faqat `internal` network orqali backend ulanadi
- Kuchli parol (maks 32 belgi, aralash)
- Fayllar: `docker-compose.yml`

#### 🔴 D-08 — UFW Firewall
```bash
ufw default deny incoming
ufw allow 2222/tcp    # SSH (yangi port)
ufw allow 80/tcp      # HTTP → redirect
ufw allow 443/tcp     # HTTPS
ufw enable
```
- VPS: `ufw` sozlamalari

#### 🟡 D-09 — SSH xavfsizligi
```
# /etc/ssh/sshd_config
Port 2222                    # default portni o'zgartirish
PermitRootLogin no           # root login o'chirish
PasswordAuthentication no    # parol bilan kirish o'chirish
PubkeyAuthentication yes     # faqat kalit bilan
```
- SSH kalit juftligi yaratib, public key ni VPS ga qo'shish
- Fayllar: VPS `/etc/ssh/sshd_config`

#### 🟡 D-10 — GitHub Actions CI/CD
```yaml
# .github/workflows/deploy.yml
on:
  push:
    branches: [main]
jobs:
  deploy:
    steps:
      - name: Deploy to VPS
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /opt/buildpos
            git pull origin main
            docker-compose up --build -d
```
- GitHub Secrets: `VPS_HOST`, `SSH_PRIVATE_KEY`, `VPS_PORT`
- Fayllar: `.github/workflows/deploy.yml`

#### 🟡 D-11 — Avtomatik PostgreSQL Backup
```bash
# /etc/cron.d/buildpos-backup
0 3 * * * root docker exec buildpos-postgres \
  pg_dump -U buildpos_user buildpos_db \
  > /opt/backups/buildpos_$(date +%Y%m%d).sql
# 7 kundan eski backuplarni o'chirish
0 4 * * * root find /opt/backups -name "*.sql" -mtime +7 -delete
```
- VPS: `/etc/cron.d/buildpos-backup`

#### 🟡 D-12 — Docker Health Check va restart
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:8080/actuator/health"]
  interval: 30s
  timeout: 10s
  retries: 3
restart: unless-stopped
```
- Fayllar: `docker-compose.yml`

#### 🟢 D-13 — Docker Log Rotation
```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```
- Fayllar: `docker-compose.yml`

#### 🟢 D-14 — Fail2ban
```bash
apt install fail2ban
# SSH va Nginx uchun jail sozlash
# 5 muvaffaqiyatsiz urinish → 1 soat ban
```
- VPS: `/etc/fail2ban/jail.local`

#### 🟢 D-15 — Monitoring
- **UptimeRobot** (bepul): har 5 daqiqada `https://domain/actuator/health` tekshiradi
- Yoki VPS da **Netdata** o'rnatish: disk, RAM, CPU real-time monitoring
- VPS yoki uptimerobot.com

---

### Deploy ketma-ketligi (tartibi muhim)

```
1. Barcha KRITIK vazifalar (B-01..B-07, F-01..F-02, D-01..D-07)
2. GitHub: .env.example, .gitignore tekshirish
3. VPS sotib olish: Eskiz.uz — Ubuntu 24.04, 2CPU/4GB RAM
4. VPS boshlang'ich sozlash: SSH key, UFW, Fail2ban, Docker
5. Domen DNS: A record → VPS IP (24 soat kutish mumkin)
6. SSL: Certbot + Let's Encrypt
7. VPS da .env fayl yaratish (GitHub ga YUKLAMANG)
8. docker-compose up --build -d
9. Test: HTTPS, /api/auth/login, barcha sahifalar
10. GitHub Actions: deploy.yml sozlash
11. Backup cron job sozlash
12. UptimeRobot monitoring
```

---

### Sertifikat uchun minimal talab ro'yxati

| Talab | BuildPOS da qaysi vazifa |
|-------|--------------------------|
| HTTPS majburiy | D-03, D-06 |
| Autentifikatsiya xavfsizligi | B-01, B-04, B-05 |
| Ma'lumotlar bazasi himoyasi | B-07, B-14, D-07 |
| Audit log (kim, qachon, nima) | B-11 |
| Kirish nazorati (RBAC) | ✅ Allaqachon bor |
| Xatolar boshqaruvi | B-12 |
| Tarmoq himoyasi | D-08, D-09, D-14 |
| Zaxira nusxa | D-11 |

**Jami: 42 vazifa — 🔴 17 KRITIK | 🟡 17 YUQORI | 🟢 8 O'RTA**

