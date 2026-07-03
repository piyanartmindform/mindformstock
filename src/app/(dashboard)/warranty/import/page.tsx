import { ImportForm } from "./ImportForm";

export default function ImportWarrantyPage() {
  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto w-full">
      <div className="pt-2">
        <a href="/warranty" className="text-brand text-sm">← กลับ</a>
        <h1 className="text-xl font-bold text-gray-900 mt-2">นำเข้าข้อมูลประกัน</h1>
        <p className="text-gray-500 text-sm">อัปโหลด CSV เพื่อลงทะเบียนหลายรายการพร้อมกัน</p>
      </div>
      <ImportForm />
    </div>
  );
}
