export type DocLang = "th" | "en";

export function docLang(value: string | undefined): DocLang {
  return value === "en" ? "en" : "th";
}

// fixed wording on the printed delivery documents (names, addresses and notes stay as typed)
const TEXT = {
  th: {
    pickTitle: "ใบเตรียมของ",
    noteTitle: "ใบส่งงาน",
    docNo: "เลขที่",
    issued: "วันที่ออกเอกสาร",
    taxId: "เลขประจำตัวผู้เสียภาษี",
    customer: "ลูกค้า",
    contact: "ผู้ติดต่อ",
    project: "โปรเจค:",
    scheduled: "วันนัดส่ง/ติดตั้ง",
    receiver: "ผู้รับหน้างาน",
    address: "สถานที่ส่ง",
    item: "รายการสินค้า",
    qty: "จำนวน",
    total: "รวม",
    madeToOrder: "สั่งทำ",
    source: "แหล่งที่มา:",
    note: "หมายเหตุ:",
    received: "ข้าพเจ้าได้ตรวจรับสินค้าตามรายการข้างต้นครบถ้วนในสภาพเรียบร้อยแล้ว",
    extraNote: "หมายเหตุเพิ่มเติม",
    signed: "ลงชื่อ",
    date: "วันที่",
    sender: "ผู้ส่งสินค้า",
    customerSign: "ผู้รับสินค้า (ลูกค้า)",
    picker: "ผู้จัดของ",
    checker: "ผู้ตรวจสอบ",
    printedOn: "พิมพ์เมื่อ",
    by: "โดย",
    printPick: "🖨️ พิมพ์ใบเตรียมของ",
    printNote: "🖨️ พิมพ์ใบส่งงาน",
    back: "← กลับ",
    photoAlt: "รูปรายการ",
  },
  en: {
    pickTitle: "Picking List",
    noteTitle: "Delivery Note",
    docNo: "No.",
    issued: "Date issued",
    taxId: "Tax ID",
    customer: "Customer",
    contact: "Contact",
    project: "Project:",
    scheduled: "Delivery / installation date",
    receiver: "Site contact",
    address: "Delivery address",
    item: "Item",
    qty: "Qty",
    total: "Total",
    madeToOrder: "Made to order",
    source: "Source:",
    note: "Note:",
    received: "I have received the goods listed above in good condition.",
    extraNote: "Additional notes",
    signed: "Signature:",
    date: "Date",
    sender: "Delivered by",
    customerSign: "Received by (customer)",
    picker: "Prepared by",
    checker: "Checked by",
    printedOn: "Printed on",
    by: "by",
    printPick: "🖨️ Print picking list",
    printNote: "🖨️ Print delivery note",
    back: "← Back",
    photoAlt: "Item photo",
  },
} as const;

export function docText(lang: DocLang) {
  return TEXT[lang];
}

export function formatDocDate(date: string, lang: DocLang): string {
  return new Date(date).toLocaleDateString(lang === "en" ? "en-GB" : "th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// "ชิ้น" -> pcs, "ชุด" -> set(s); anything else is printed as typed
export function unitLabel(unit: string, quantity: number, lang: DocLang): string {
  if (lang === "th") return unit;
  const plural = quantity > 1;
  if (unit === "ชิ้น" || unit === "อัน" || unit === "ตัว") return plural ? "pcs" : "pc";
  if (unit === "ชุด") return plural ? "sets" : "set";
  return unit;
}
