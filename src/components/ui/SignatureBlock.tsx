export function SignatureBlock({ label }: { label: string }) {
  return (
    <div>
      <div className="h-16 border-b border-gray-400 mb-2" />
      <p className="text-gray-500">ลงชื่อ {label}</p>
      <p className="text-gray-400 text-xs mt-1">วันที่ ____ / ____ / ____</p>
    </div>
  );
}
