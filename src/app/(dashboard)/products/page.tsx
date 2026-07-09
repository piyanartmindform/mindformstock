import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { getCurrentUserRole } from "@/lib/auth";
import { ProductList } from "./ProductList";

async function getData() {
  const supabase = createClient();
  const [productsRes, categoriesRes] = await Promise.all([
    supabase
      .from("products_mf")
      .select("*, categories_mf(name)")
      .eq("is_active", true)
      .order("name"),
    supabase.from("categories_mf").select("id, name").order("name"),
  ]);
  return {
    products: productsRes.data ?? [],
    categories: categoriesRes.data ?? [],
  };
}

export default async function ProductsPage() {
  const [{ products, categories }, role] = await Promise.all([getData(), getCurrentUserRole()]);
  const isAdmin = role === "admin";

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">สินค้า</h1>
          <p className="text-gray-500 text-sm">{products.length} รายการ</p>
        </div>
        {isAdmin && (
          <Link
            href="/products/new"
            className="h-10 px-4 bg-brand text-white rounded-xl text-sm font-medium flex items-center gap-1.5"
          >
            <span>+</span> เพิ่มสินค้า
          </Link>
        )}
      </div>

      {products.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">📦</p>
          <p className="text-gray-500">ยังไม่มีสินค้า</p>
          {isAdmin && (
            <Link href="/products/new" className="text-brand text-sm mt-2 inline-block">
              + เพิ่มสินค้าใหม่
            </Link>
          )}
        </div>
      ) : (
        <ProductList products={products} categories={categories} />
      )}
    </div>
  );
}
