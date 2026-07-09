// One-time import: legacy AppSheet data (old data/*.csv) -> Supabase
// Run: node scripts/import-legacy-data.js
//
// Order: wipe existing data -> categories -> products -> stock_in/out -> qr_codes (warranty)

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

const ROOT = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT, "old data");
const EXTERNAL_BATCH_ID = "00000000-0000-0000-0000-000000000000";
const CATEGORY_FIX = { "Offifc Chair": "Office Chair" };
const DEFAULT_WARRANTY_MONTHS = 60; // ทุก warranty record เดิมเป็น "5 ปี" เหมือนกันหมด

// ---------- env ----------
function loadEnv() {
  const text = fs.readFileSync(path.join(ROOT, ".env.local"), "utf8");
  const url = text.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
  const key = text.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
  return { url, key };
}

// ---------- CSV ----------
function stripBOM(text) {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function parseCSV(text) {
  text = stripBOM(text);
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\r") { /* skip */ }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c !== ""));
}

function readCSV(filename) {
  const rows = parseCSV(fs.readFileSync(path.join(DATA_DIR, filename), "utf8"));
  const [header, ...data] = rows;
  return data.map((r) => {
    const obj = {};
    header.forEach((h, i) => { obj[h.trim()] = (r[i] ?? "").trim(); });
    return obj;
  });
}

// ---------- helpers ----------
function parseThaiDate(str) {
  if (!str) return null;
  const [datePart, timePart] = str.trim().split(" ");
  const [d, m, yBE] = datePart.split("/").map(Number);
  const yCE = yBE - 543;
  let hh = 0, mm = 0, ss = 0;
  if (timePart) [hh, mm, ss] = timePart.split(":").map(Number);
  return new Date(Date.UTC(yCE, m - 1, d, hh, mm, ss || 0));
}

const toDateOnly = (dt) => dt.toISOString().slice(0, 10);

function normalizeCategory(cat) {
  cat = (cat || "").trim();
  if (!cat) return null;
  return CATEGORY_FIX[cat] || cat;
}

function extractCode(serial) {
  serial = serial.trim();
  if (/^https?:\/\//i.test(serial)) {
    const m = serial.match(/[?&]id=([^&]+)/i);
    if (m) return m[1].toUpperCase();
    return serial.split("/").pop().toUpperCase();
  }
  return serial.toUpperCase();
}

function extractPrefixNumber(code) {
  const numMatch = code.match(/(\d+)$/);
  const qr_number = numMatch ? parseInt(numMatch[1], 10) : 0;
  const prefixMatch = code.match(/^([A-Z]+)/i);
  const prefix = prefixMatch ? prefixMatch[1].toUpperCase() : "EXT";
  return { qr_number, prefix };
}

function parseWarrantyYears(str) {
  const m = (str || "").match(/([\d.]+)/);
  return m ? parseFloat(m[1]) : 0;
}

function buildCustomerMap(customers) {
  // ต่อชื่อสาขาต่อท้ายเฉพาะบริษัทที่ชื่อซ้ำกันหลาย Customer_ID (เช่น Regus) เพื่อแยกสาขา
  // ถ้าชื่อบริษัทไม่ซ้ำ (เช่น Nestle มีสาขาเดียว) ใช้ชื่อบริษัทเฉยๆ ไม่ต้องต่อสาขา
  const nameCount = new Map();
  for (const c of customers) {
    nameCount.set(c.Company_Name, (nameCount.get(c.Company_Name) ?? 0) + 1);
  }
  const map = new Map();
  for (const c of customers) {
    if (!c.Customer_ID) continue;
    const isDuplicate = (nameCount.get(c.Company_Name) ?? 0) > 1;
    const name = c.Branch && isDuplicate ? `${c.Company_Name} - ${c.Branch}` : c.Company_Name;
    map.set(c.Customer_ID, name);
  }
  return map;
}

async function main() {
  const { url, key } = loadEnv();
  const supabase = createClient(url, key);

  console.log("=== 1) ลบข้อมูลเดิมทั้งหมด ===");
  for (const table of ["qr_codes_mf", "warranty_items_mf", "stock_out_mf", "stock_in_mf", "products_mf", "categories_mf", "customers_mf"]) {
    const { error } = await supabase.from(table).delete().not("id", "is", null);
    if (error) throw new Error(`ลบ ${table} ไม่สำเร็จ: ${error.message}`);
    console.log(`  ลบ ${table} แล้ว`);
  }

  console.log("=== 2) อ่านไฟล์ CSV ===");
  const products = readCSV("MF Product Stock.csv");
  const transactions = readCSV("Transaction_Log.csv");
  const warranties = readCSV("Warranty_Data.csv");
  const customers = readCSV("Customers.csv");
  console.log(`  products=${products.length} transactions=${transactions.length} warranties=${warranties.length} customers=${customers.length}`);

  console.log("=== 3) categories_mf ===");
  const categoryNames = [...new Set(products.map((p) => normalizeCategory(p.Category)).filter(Boolean))];
  const { data: catRows, error: catErr } = await supabase
    .from("categories_mf")
    .insert(categoryNames.map((name) => ({ name })))
    .select();
  if (catErr) throw new Error(`insert categories ล้มเหลว: ${catErr.message}`);
  const categoryIdByName = new Map(catRows.map((c) => [c.name, c.id]));
  console.log(`  สร้าง ${catRows.length} categories:`, categoryNames.join(", "));

  console.log("=== 4) products_mf ===");
  const productIdMap = new Map(); // old Product_ID -> new uuid
  const productRows = products.map((p) => {
    const newId = crypto.randomUUID();
    productIdMap.set(p.Product_ID, newId);
    const cat = normalizeCategory(p.Category);
    return {
      id: newId,
      category_id: cat ? categoryIdByName.get(cat) ?? null : null,
      name: p.Product_Name,
      model: null,
      brand: null,
      description: null,
      unit: "ชิ้น",
      min_stock_level: parseInt(p.Min_Stock, 10) || 0,
      default_warranty_months: DEFAULT_WARRANTY_MONTHS,
      current_stock: parseInt(p.On_Hand, 10) || 0,
      image_url: null,
      is_active: true,
    };
  });
  const { error: prodErr } = await supabase.from("products_mf").insert(productRows);
  if (prodErr) throw new Error(`insert products ล้มเหลว: ${prodErr.message}`);
  console.log(`  สร้าง ${productRows.length} products`);

  console.log("=== 5) customers_mf ===");
  const customerMap = buildCustomerMap(customers);
  const nameToDisplay = new Map(customers.map((c) => [c.Company_Name.trim().toLowerCase(), customerMap.get(c.Customer_ID)]));
  const customerRows = [...new Set(customerMap.values())].map((name) => ({ name }));
  const { error: custErr } = await supabase.from("customers_mf").insert(customerRows);
  if (custErr) throw new Error(`insert customers ล้มเหลว: ${custErr.message}`);
  console.log(`  สร้าง ${customerRows.length} customers`);

  console.log("=== 6) stock_in_mf / stock_out_mf ===");

  const stockInRows = [];
  const stockOutRows = [];
  const skipped = [];

  for (const t of transactions) {
    const productId = productIdMap.get(t.Product_ID);
    if (!productId) { skipped.push(t); continue; }
    const dt = parseThaiDate(t.Timestamp);
    const dateOnly = toDateOnly(dt);
    const qty = parseInt(t.Quantity, 10) || 0;

    if (t.Type === "IN") {
      stockInRows.push({
        product_id: productId,
        quantity: qty,
        received_date: dateOnly,
        supplier: null,
        source_country: null,
        notes: t.Note || null,
        created_at: dt.toISOString(),
      });
    } else if (t.Type === "OUT") {
      let customerName = t.Customer_Select ? customerMap.get(t.Customer_Select) : null;
      if (!customerName) {
        const noteKey = (t.Note || "").trim().toLowerCase();
        if (noteKey && nameToDisplay.has(noteKey)) customerName = nameToDisplay.get(noteKey);
      }
      if (!customerName) customerName = (t.Note || "").trim() || "ไม่ระบุ";

      stockOutRows.push({
        product_id: productId,
        quantity: qty,
        sold_date: dateOnly,
        customer_name: customerName,
        project_name: null,
        price: null,
        notes: t.Note || null,
        created_at: dt.toISOString(),
      });
    }
  }

  if (stockInRows.length) {
    const { error } = await supabase.from("stock_in_mf").insert(stockInRows);
    if (error) throw new Error(`insert stock_in ล้มเหลว: ${error.message}`);
  }
  if (stockOutRows.length) {
    const { error } = await supabase.from("stock_out_mf").insert(stockOutRows);
    if (error) throw new Error(`insert stock_out ล้มเหลว: ${error.message}`);
  }
  console.log(`  stock_in=${stockInRows.length} stock_out=${stockOutRows.length} skipped(unknown product)=${skipped.length}`);
  if (skipped.length) console.log("  skipped rows:", skipped);

  console.log("=== 7) qr_codes_mf (warranty) ===");
  const qrRows = [];
  const warnUnknownProduct = [];
  for (const w of warranties) {
    const code = extractCode(w.Serial_Number);
    const { qr_number, prefix } = extractPrefixNumber(code);
    const productId = productIdMap.get(w.Product_Model) ?? null;
    if (!productId) warnUnknownProduct.push(w.Product_Model);
    const customerName = customerMap.get(w.Customer_Name) || w.Customer_Name;
    const startDt = parseThaiDate(w.Start_Date);
    const purchaseDate = toDateOnly(startDt);
    const years = parseWarrantyYears(w.Warranty_Days);
    const warrantyMonths = Math.round(years * 12);
    let warrantyExpiresAt = null;
    if (warrantyMonths > 0) {
      const exp = new Date(startDt);
      exp.setUTCMonth(exp.getUTCMonth() + warrantyMonths);
      warrantyExpiresAt = exp.toISOString();
    }
    qrRows.push({
      code,
      qr_number,
      prefix,
      batch_id: EXTERNAL_BATCH_ID,
      status: "registered",
      product_id: productId,
      customer_name: customerName,
      project_name: null,
      purchase_date: purchaseDate,
      warranty_months: warrantyMonths,
      warranty_expires_at: warrantyExpiresAt,
      notes: null,
      registered_at: startDt.toISOString(),
    });
  }

  const BATCH = 50;
  let qrInserted = 0;
  for (let i = 0; i < qrRows.length; i += BATCH) {
    const chunk = qrRows.slice(i, i + BATCH);
    const { error } = await supabase.from("qr_codes_mf").upsert(chunk, { onConflict: "code", ignoreDuplicates: false });
    if (error) throw new Error(`insert qr_codes แถว ${i + 1}-${i + chunk.length} ล้มเหลว: ${error.message}`);
    qrInserted += chunk.length;
  }
  console.log(`  qr_codes=${qrInserted}${warnUnknownProduct.length ? ` (product ไม่พบ ${warnUnknownProduct.length} รายการ: ${[...new Set(warnUnknownProduct)]})` : ""}`);

  console.log("=== เสร็จสิ้น ===");
}

main().catch((err) => {
  console.error("IMPORT FAILED:", err.message);
  process.exit(1);
});
