package com.buildpos.buildpos.service;

import com.buildpos.buildpos.dto.response.ImportPreviewResponse;
import com.buildpos.buildpos.dto.response.ImportResultResponse;
import com.buildpos.buildpos.entity.*;
import com.buildpos.buildpos.entity.enums.ProductStatus;
import com.buildpos.buildpos.repository.*;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.text.Normalizer;
import java.util.*;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class ProductImportService {

    private final ProductRepository productRepository;
    private final ProductUnitRepository productUnitRepository;
    private final CategoryRepository categoryRepository;
    private final UnitRepository unitRepository;
    private final WarehouseRepository warehouseRepository;
    private final WarehouseStockRepository warehouseStockRepository;

    // ── Tizim maydonlari va ularning kalit so'zlari ───────────────
    private static final Map<String, List<String>> FIELD_KEYWORDS = new LinkedHashMap<>();

    static {
        FIELD_KEYWORDS.put("name",         List.of("nom", "nomi", "mahsulot", "наименование", "товар", "name", "product", "tovar"));
        FIELD_KEYWORDS.put("categoryName", List.of("kategoriya", "category", "категория", "группа", "cat", "group"));
        FIELD_KEYWORDS.put("unitName",     List.of("birlik", "o'lchov", "unit", "ед.", "единица", "мера", "o'lchov birligi", "мер"));
        FIELD_KEYWORDS.put("barcode",      List.of("shtrix", "barcode", "штрих", "код", "barkod", "bar code", "bar"));
        FIELD_KEYWORDS.put("costPriceUsd", List.of("tannarx usd", "tannarx (usd)", "cost usd", "usd narx", "usd"));
        FIELD_KEYWORDS.put("costPrice",    List.of("tannarx", "себестоимость", "закуп", "тан", "tannarx uzs", "tannarx (uzs)", "cost uzs"));
        FIELD_KEYWORDS.put("salePrice",    List.of("sotuv", "sotish narx", "цена", "price", "продажн", "narx uzs", "sotuv narxi", "selling"));
        FIELD_KEYWORDS.put("minPrice",     List.of("minimal", "min narx", "минимальн", "min price", "минимал"));
        FIELD_KEYWORDS.put("minStock",       List.of("min qoldiq", "остаток", "qoldiq", "minimum qol", "минимальный остат", "остат"));
        FIELD_KEYWORDS.put("initialStock",   List.of("boshlang'ich", "boshlang", "initial", "zaxira", "начальный", "начал", "приход", "количество"));
    }

    // ── Shablon generatsiya ───────────────────────────────────────
    public byte[] generateTemplate() throws IOException {
        try (XSSFWorkbook wb = new XSSFWorkbook()) {
            XSSFSheet sheet = wb.createSheet("Mahsulotlar");

            // Ustun sarlavha uslubi
            XSSFCellStyle headerStyle = wb.createCellStyle();
            headerStyle.setFillForegroundColor(new XSSFColor(new byte[]{(byte)37, (byte)99, (byte)235}, null));
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setBorderBottom(BorderStyle.THIN);
            headerStyle.setBorderRight(BorderStyle.THIN);
            XSSFFont headerFont = wb.createFont();
            headerFont.setColor(new XSSFColor(new byte[]{(byte)255, (byte)255, (byte)255}, null));
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);

            // Majburiy ustun uslubi (sariq)
            XSSFCellStyle requiredStyle = wb.createCellStyle();
            requiredStyle.setFillForegroundColor(new XSSFColor(new byte[]{(byte)254, (byte)243, (byte)199}, null));
            requiredStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            requiredStyle.setBorderBottom(BorderStyle.THIN);
            requiredStyle.setBorderRight(BorderStyle.THIN);
            XSSFFont reqFont = wb.createFont();
            reqFont.setBold(true);
            requiredStyle.setFont(reqFont);
            requiredStyle.setAlignment(HorizontalAlignment.CENTER);

            String[] headers = {
                "Mahsulot nomi *",
                "Kategoriya",
                "O'lchov birligi *",
                "Shtrix kodi",
                "Tannarx (UZS)",
                "Tannarx (USD)",
                "Sotuv narxi (UZS)",
                "Min narx (UZS)",
                "Min qoldiq",
                "Boshlang'ich zaxira"
            };

            boolean[] required = {true, false, true, false, false, false, false, false, false, false};

            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(required[i] ? requiredStyle : headerStyle);
                sheet.setColumnWidth(i, 5000);
            }

            // 3 ta namuna qator
            String[][] samples = {
                {"Sement M400", "Qurilish materiallari", "qop", "4600001234567", "75000", "",     "90000", "80000", "10",  "100"},
                {"Temir 12mm",  "Armatura",              "kg",  "",               "",      "0.85", "18000", "16000", "50",  "500"},
                {"G'isht qizil","G'isht",                "dona","",               "1000",  "",     "1200",  "",      "500", "2000"}
            };

            XSSFCellStyle dataStyle = wb.createCellStyle();
            dataStyle.setBorderBottom(BorderStyle.THIN);
            dataStyle.setBorderRight(BorderStyle.THIN);

            for (int r = 0; r < samples.length; r++) {
                Row row = sheet.createRow(r + 1);
                for (int c = 0; c < samples[r].length; c++) {
                    Cell cell = row.createCell(c);
                    cell.setCellValue(samples[r][c]);
                    cell.setCellStyle(dataStyle);
                }
            }

            // Izoh sahifasi
            XSSFSheet infoSheet = wb.createSheet("Izoh");
            String[][] info = {
                {"Maydon", "Tavsif"},
                {"Mahsulot nomi *", "Majburiy. Mahsulot nomi."},
                {"Kategoriya", "Ixtiyoriy. Mavjud kategoriya nomi. Bo'sh qoldirilsa kategoriyasiz qo'shiladi."},
                {"O'lchov birligi *", "Majburiy. Mavjud birlik belgisi yoki nomi (kg, dona, m, pochka...)."},
                {"Shtrix kodi", "Ixtiyoriy. Noyob shtrix kod."},
                {"Tannarx (UZS)", "Ixtiyoriy. UZS (so'm) da tannarx. Tannarx USD da bo'lsa bu ustunni bo'sh qoldiring."},
                {"Tannarx (USD)", "Ixtiyoriy. USD da tannarx. Faqat dollar narx bo'lsa to'ldiring."},
                {"Sotuv narxi (UZS)", "Ixtiyoriy. UZS da sotuv narxi."},
                {"Min narx (UZS)", "Ixtiyoriy. UZS da minimal sotuv narxi."},
                {"Min qoldiq", "Ixtiyoriy. Minimal qoldiq miqdori."},
                {"Boshlang'ich zaxira", "Ixtiyoriy. Import vaqtida omborga kiritiladigan boshlang'ich miqdor. Ombor tanlanganda ishlaydi."},
            };
            for (int r = 0; r < info.length; r++) {
                Row row = infoSheet.createRow(r);
                for (int c = 0; c < info[r].length; c++) {
                    row.createCell(c).setCellValue(info[r][c]);
                }
            }
            infoSheet.setColumnWidth(0, 6000);
            infoSheet.setColumnWidth(1, 12000);

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            wb.write(out);
            return out.toByteArray();
        }
    }

    // ── Preview ────────────────────────────────────────────────────
    public ImportPreviewResponse preview(MultipartFile file) throws IOException {
        try (Workbook wb = WorkbookFactory.create(file.getInputStream())) {
            Sheet sheet = wb.getSheetAt(0);
            Row headerRow = sheet.getRow(0);
            if (headerRow == null) {
                return ImportPreviewResponse.builder()
                        .headers(List.of())
                        .sampleRows(List.of())
                        .autoMapping(Map.of())
                        .totalDataRows(0)
                        .build();
            }

            // Ustun sarlavhalarini o'qish
            List<String> headers = new ArrayList<>();
            for (int i = 0; i < headerRow.getLastCellNum(); i++) {
                Cell cell = headerRow.getCell(i);
                headers.add(cell != null ? getCellString(cell).trim() : "Ustun " + (i + 1));
            }

            // Namuna qatorlar (max 5)
            List<List<String>> sampleRows = new ArrayList<>();
            int lastRow = Math.min(sheet.getLastRowNum(), 5);
            for (int r = 1; r <= lastRow; r++) {
                Row row = sheet.getRow(r);
                if (row == null) continue;
                List<String> rowData = new ArrayList<>();
                for (int c = 0; c < headers.size(); c++) {
                    Cell cell = row.getCell(c);
                    rowData.add(cell != null ? getCellString(cell) : "");
                }
                sampleRows.add(rowData);
            }

            // Avtomatik mapping
            Map<String, Integer> autoMapping = detectMapping(headers);

            int totalDataRows = Math.max(0, sheet.getLastRowNum()); // 0-based last row index = count

            return ImportPreviewResponse.builder()
                    .headers(headers)
                    .sampleRows(sampleRows)
                    .autoMapping(autoMapping)
                    .totalDataRows(totalDataRows)
                    .build();
        }
    }

    // ── Execute (import) ──────────────────────────────────────────
    @Transactional
    public ImportResultResponse execute(MultipartFile file, Map<String, Integer> mapping, Long warehouseId) throws IOException {
        // Ombor (ixtiyoriy)
        Warehouse warehouse = warehouseId != null
                ? warehouseRepository.findById(warehouseId).orElse(null)
                : null;

        try (Workbook wb = WorkbookFactory.create(file.getInputStream())) {
            Sheet sheet = wb.getSheetAt(0);
            int lastRow = sheet.getLastRowNum();

            List<String[]> errorRows = new ArrayList<>();
            List<String> errorHeaders = List.of(
                    "Qator", "Mahsulot nomi", "Kategoriya", "Birlik", "Xato sababi"
            );

            int successCount = 0;
            int errorCount = 0;

            Integer nameCol        = mapping.get("name");
            Integer catCol         = mapping.get("categoryName");
            Integer unitCol        = mapping.get("unitName");
            Integer barcodeCol     = mapping.get("barcode");
            Integer costUsdCol     = mapping.get("costPriceUsd");
            Integer costUzsCol     = mapping.get("costPrice");
            Integer salePriceCol   = mapping.get("salePrice");
            Integer minPriceCol    = mapping.get("minPrice");
            Integer minStockCol    = mapping.get("minStock");
            Integer initialStockCol= mapping.get("initialStock");

            for (int r = 1; r <= lastRow; r++) {
                Row row = sheet.getRow(r);
                if (row == null) continue;

                String nameVal = nameCol != null && nameCol >= 0 ? getCellString(row.getCell(nameCol)).trim() : "";
                if (nameVal.isEmpty()) continue; // Bo'sh qatorlarni o'tkazib yuborish

                String catVal         = safeCell(row, catCol);
                String unitVal        = safeCell(row, unitCol);
                String barcodeVal     = safeCell(row, barcodeCol);
                String costUsdVal     = safeCell(row, costUsdCol);
                String costUzsVal     = safeCell(row, costUzsCol);
                String salePriceVal   = safeCell(row, salePriceCol);
                String minPriceVal    = safeCell(row, minPriceCol);
                String minStockVal    = safeCell(row, minStockCol);
                String initialStockVal= safeCell(row, initialStockCol);

                // Birlik majburiy
                if (unitVal.isEmpty()) {
                    errorRows.add(new String[]{String.valueOf(r + 1), nameVal, catVal, unitVal, "O'lchov birligi kiritilmagan"});
                    errorCount++;
                    continue;
                }

                // Birlikni topish (avval symbol, keyin name)
                Unit unit = unitRepository.findBySymbolIgnoreCase(unitVal)
                        .or(() -> unitRepository.findByNameIgnoreCase(unitVal))
                        .orElse(null);
                if (unit == null) {
                    errorRows.add(new String[]{String.valueOf(r + 1), nameVal, catVal, unitVal,
                            "Birlik topilmadi: '" + unitVal + "'"});
                    errorCount++;
                    continue;
                }

                // Kategoriya (ixtiyoriy)
                Category category = null;
                if (!catVal.isEmpty()) {
                    category = categoryRepository.findByNameIgnoreCaseAndIsDeletedFalse(catVal).orElse(null);
                }

                // Barcode tekshirish
                if (!barcodeVal.isEmpty() && productUnitRepository.existsByBarcode(barcodeVal)) {
                    errorRows.add(new String[]{String.valueOf(r + 1), nameVal, catVal, unitVal,
                            "Shtrix kod allaqachon mavjud: '" + barcodeVal + "'"});
                    errorCount++;
                    continue;
                }

                // Slug
                String slug = generateSlug(nameVal);
                if (productRepository.existsBySlug(slug)) {
                    slug = slug + "-" + System.currentTimeMillis();
                }

                BigDecimal costUsd     = parseBigDecimal(costUsdVal);
                BigDecimal costUzs     = parseBigDecimal(costUzsVal);
                BigDecimal salePrice   = parseBigDecimal(salePriceVal);
                BigDecimal minPrice    = parseBigDecimal(minPriceVal);
                BigDecimal minStock    = parseBigDecimal(minStockVal);
                BigDecimal initialStock= parseBigDecimal(initialStockVal);

                try {
                    Product product = Product.builder()
                            .name(nameVal)
                            .slug(slug)
                            .category(category)
                            .status(ProductStatus.ACTIVE)
                            .isDeleted(false)
                            .minStock(minStock)
                            .build();
                    productRepository.save(product);

                    ProductUnit pu = ProductUnit.builder()
                            .product(product)
                            .unit(unit)
                            .isDefault(true)
                            .isBaseUnit(true)
                            .conversionFactor(BigDecimal.ONE)
                            .barcode(barcodeVal.isEmpty() ? null : barcodeVal)
                            .costPriceUsd(costUsd.compareTo(BigDecimal.ZERO) > 0 ? costUsd : null)
                            .costPrice(costUzs)
                            .salePrice(salePrice)
                            .minPrice(minPrice)
                            .isActive(true)
                            .build();
                    productUnitRepository.save(pu);

                    // Boshlang'ich zaxira (ombor tanlangan va miqdor > 0 bo'lsa)
                    if (warehouse != null && initialStock.compareTo(BigDecimal.ZERO) > 0) {
                        WarehouseStock ws = WarehouseStock.builder()
                                .warehouse(warehouse)
                                .productUnit(pu)
                                .quantity(initialStock)
                                .minStock(BigDecimal.ZERO)
                                .build();
                        warehouseStockRepository.save(ws);
                    }

                    successCount++;
                } catch (Exception e) {
                    errorRows.add(new String[]{String.valueOf(r + 1), nameVal, catVal, unitVal,
                            e.getMessage() != null ? e.getMessage() : "Noma'lum xato"});
                    errorCount++;
                }
            }

            // Xato Excel fayli
            String errorFileBase64 = null;
            if (!errorRows.isEmpty()) {
                errorFileBase64 = buildErrorExcel(errorHeaders, errorRows);
            }

            return ImportResultResponse.builder()
                    .totalRows(successCount + errorCount)
                    .successCount(successCount)
                    .errorCount(errorCount)
                    .errorFileBase64(errorFileBase64)
                    .build();
        }
    }

    // ── Yordamchi methodlar ───────────────────────────────────────

    private Map<String, Integer> detectMapping(List<String> headers) {
        Map<String, Integer> mapping = new LinkedHashMap<>();
        for (String field : FIELD_KEYWORDS.keySet()) {
            mapping.put(field, -1);
        }

        for (int i = 0; i < headers.size(); i++) {
            String headerLower = headers.get(i).toLowerCase(Locale.ROOT);
            for (Map.Entry<String, List<String>> entry : FIELD_KEYWORDS.entrySet()) {
                if (mapping.get(entry.getKey()) >= 0) continue; // Allaqachon topilgan
                for (String keyword : entry.getValue()) {
                    if (headerLower.contains(keyword.toLowerCase(Locale.ROOT))) {
                        mapping.put(entry.getKey(), i);
                        break;
                    }
                }
            }
        }
        return mapping;
    }

    private String safeCell(Row row, Integer colIndex) {
        if (colIndex == null || colIndex < 0 || row == null) return "";
        Cell cell = row.getCell(colIndex);
        return cell != null ? getCellString(cell).trim() : "";
    }

    private String getCellString(Cell cell) {
        if (cell == null) return "";
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue();
            case NUMERIC -> {
                double d = cell.getNumericCellValue();
                // Butun son bo'lsa .0 qo'shmaslik
                if (d == Math.floor(d) && !Double.isInfinite(d)) {
                    yield String.valueOf((long) d);
                }
                yield String.valueOf(d);
            }
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            case FORMULA -> {
                try {
                    yield String.valueOf(cell.getNumericCellValue());
                } catch (Exception e) {
                    yield cell.getStringCellValue();
                }
            }
            default -> "";
        };
    }

    private BigDecimal parseBigDecimal(String s) {
        if (s == null || s.isBlank()) return BigDecimal.ZERO;
        try {
            // Bo'shliq va vergulni olib tashlash
            return new BigDecimal(s.replaceAll("[\\s,]", ""));
        } catch (NumberFormatException e) {
            return BigDecimal.ZERO;
        }
    }

    private String generateSlug(String name) {
        String normalized = Normalizer.normalize(name, Normalizer.Form.NFD);
        Pattern pattern = Pattern.compile("\\p{InCombiningDiacriticalMarks}+");
        return pattern.matcher(normalized).replaceAll("").toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9\\s-]", "").replaceAll("[\\s]+", "-")
                .replaceAll("-+", "-").replaceAll("^-|-$", "");
    }

    private String buildErrorExcel(List<String> headerList, List<String[]> rows) throws IOException {
        try (XSSFWorkbook wb = new XSSFWorkbook()) {
            XSSFSheet sheet = wb.createSheet("Xatolar");

            XSSFCellStyle headStyle = wb.createCellStyle();
            headStyle.setFillForegroundColor(new XSSFColor(new byte[]{(byte)220, (byte)38, (byte)38}, null));
            headStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            XSSFFont hf = wb.createFont();
            hf.setColor(new XSSFColor(new byte[]{(byte)255, (byte)255, (byte)255}, null));
            hf.setBold(true);
            headStyle.setFont(hf);

            Row hRow = sheet.createRow(0);
            for (int i = 0; i < headerList.size(); i++) {
                Cell c = hRow.createCell(i);
                c.setCellValue(headerList.get(i));
                c.setCellStyle(headStyle);
                sheet.setColumnWidth(i, i == headerList.size() - 1 ? 10000 : 5000);
            }

            for (int r = 0; r < rows.size(); r++) {
                Row row = sheet.createRow(r + 1);
                String[] data = rows.get(r);
                for (int c = 0; c < data.length; c++) {
                    row.createCell(c).setCellValue(data[c]);
                }
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            wb.write(out);
            return Base64.getEncoder().encodeToString(out.toByteArray());
        }
    }
}