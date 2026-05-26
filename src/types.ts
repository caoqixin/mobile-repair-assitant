// 1. 手机型号
export interface Model {
  id: number;
  brand_id: number;
  name: string;
  code: string | null;
  is_tablet: boolean;
  release_year: number;
  crated_at?: string;
}

// 2. 配件库存
export interface InventoryComponent {
  id: string;
  name: string;
  sku: string;
  category_id: number;
  categories?: Category;
  quality: string;
  cost_price: number;
  suggested_repair_price: number;
  partner_repair_price: number;
  stock_quantity: number;
  supplier_id: number;
  created_at?: string;
}

export interface Category {
  id: number;
  name: string;
}

// 3. Supabase 联表查询中间件返回的数据结构
export interface CompatibilityResponse {
  inventory_components: InventoryComponent | null;
}
