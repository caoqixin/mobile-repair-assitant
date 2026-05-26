import React, { useState, useEffect, type UIEvent } from "react";
import { Search, Smartphone, Layers, LogOut, X } from "lucide-react";
import type { Model, InventoryComponent } from "../../types";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabaseClient";

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

export default function Dashboard({ onLogout }: DashboardProps) {
  // 1. 输入状态与防抖状态
  const [search, setSearch] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");

  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState<number | null>(null);
  const [components, setComponents] = useState<InventoryComponent[]>([]);

  // 分页与加载状态
  const [page, setPage] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const PAGE_SIZE = 15;

  useEffect(() => {
    // 设置一个 500ms 的定时器
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500); // 500毫秒内如果 search 再次改变，会触发下面的 clear / 重置机制

    // 清理函数：当用户继续打字时，上一次的定时器会被无情销毁
    return () => {
      clearTimeout(handler);
    };
  }, [search]);

  // 当搜索框内容改变时，重置所有状态并重新请求
  useEffect(() => {
    setModels([]);
    setPage(0);
    setHasMore(true);
    fetchModels(0, debouncedSearch);
  }, [debouncedSearch]);

  // 拉取手机型号
  const fetchModels = async (currentPage: number, searchQuery: string) => {
    if (loading) return;
    setLoading(true);

    let query = supabase
      .from("models")
      .select("id, brand_id, name, code, is_tablet, release_year")
      .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1)
      .order("name", { ascending: true });

    if (searchQuery.trim()) {
      query = query.ilike("name", `%${searchQuery.trim()}%`);
    }

    const { data, error } = await query;

    if (!error && data) {
      const fetchedModels = data as Model[];
      setModels((prev) =>
        currentPage === 0 ? fetchedModels : [...prev, ...fetchedModels],
      );

      // 如果返回的数据少于单页上限，说明后面没有更多了
      if (fetchedModels.length < PAGE_SIZE) {
        setHasMore(false);
      }
    }
    setLoading(false);
  };

  // 修复后的触底滚动加载逻辑
  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;

    // 移动端视口计算微调：距离底部 80px 时即触发预加载
    if (scrollHeight - scrollTop <= clientHeight + 80 && hasMore && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchModels(nextPage, debouncedSearch); // 分页加载也同步使用防抖词
    }
  };

  // 获取关联的配件数据
  const fetchComponents = async (modelId: number) => {
    setComponents([]);

    const { data, error } = await supabase
      .from("inventory_components")
      .select(
        `
      id,
      name,
      sku,
      category_id,
      quality,
      cost_price,
      suggested_repair_price,
      partner_repair_price,
      stock_quantity,
      supplier_id,
      categories(name),
      component_compatibility!inner(model_id) 
    `,
      ) // 这一行利用中间表建立了 inner join 关系
      .eq("component_compatibility.model_id", modelId); // 直接在连接条件上过滤 model_id

    if (error) {
      console.error("获取配件失败:", error.message);
      return;
    }

    if (data) {
      // 此时 data 的结构已经几乎等同于 InventoryComponent[]
      // 只需要简单断言即可，连 map 转型都省了
      const validComponents = data as unknown as InventoryComponent[];
      setComponents(validComponents);
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-50  text-gray-900  transition-colors duration-200">
      {/* 顶部导航 */}
      <header className="p-4 bg-white  shadow-sm flex items-center justify-between z-10 border-b border-gray-100">
        <div>
          <h1 className="text-xl font-bold tracking-tight">库存快查</h1>
          <p className="text-xs text-gray-400 mt-0.5">极速移动端后台</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onLogout}
            className="p-2.5 rounded-xl text-red-500 bg-red-50 transition active:scale-95"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* 主体布局 - 搜索框和列表独立，防止滚动时输入框移出视口 */}
      <main className="flex-1 flex flex-col p-4 overflow-hidden max-w-md w-full mx-auto">
        {/* 搜索过滤输入框 */}
        <div className="relative mb-4 shadow-sm rounded-xl shrink-0">
          {/* 左侧搜索图标 */}
          <Search className="absolute left-3.5 top-3.5 h-5 w-5 text-gray-400" />

          {/* 输入框：注意 pr-11 预留了右侧清空按钮的宽度，防止文字遮挡 */}
          <input
            type="text"
            className="w-full pl-11 pr-11 py-3.5 bg-white border border-gray-200  rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition-all"
            placeholder="输入型号过滤，如: iPhone 15"
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setSearch(e.target.value)
            }
          />

          {/* 右侧一键清空按钮：只有当输入框有内容时才显示 */}
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3.5 top-3 p-1 rounded-lg text-gray-400 hover:text-gray-600 active:scale-95 transition-all"
              aria-label="清空输入"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* 无限滑动区域 - 使用 flex-1 与 overflow-y-auto 彻底解决高度问题 */}
        <div
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto space-y-3 pb-6 scrolling-touch"
        >
          {models.map((model) => (
            <div
              key={model.id}
              className="bg-white  rounded-xl shadow-xs border border-gray-100  overflow-hidden"
            >
              <button
                className="w-full p-4 flex items-center justify-between text-left active:bg-gray-50 "
                onClick={() => {
                  if (selectedModel === model.id) {
                    setSelectedModel(null);
                  } else {
                    setSelectedModel(model.id);
                    fetchComponents(model.id);
                  }
                }}
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-indigo-50  text-indigo-600 0 rounded-lg">
                    <Smartphone size={20} />
                  </div>
                  <div>
                    <span className="font-semibold text-gray-800  block">
                      {model.name}
                    </span>
                    {model.code && (
                      <span className="text-xs text-gray-400">
                        {model.code}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-xs font-semibold text-indigo-600  bg-indigo-50/50  px-2 py-1 rounded-md">
                  {selectedModel === model.id ? "收起" : "配件"}
                </span>
              </button>

              {/* 配件抽屉部分 */}
              {selectedModel === model.id && (
                <div className="bg-gray-50/50 border-t border-gray-100  p-3 space-y-2">
                  {components.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4">
                      未匹配到兼容配件或正在加载...
                    </p>
                  ) : (
                    components.map((comp) => (
                      <div
                        key={comp.id}
                        className="p-3 bg-white  rounded-xl border border-gray-100  shadow-xs flex flex-col space-y-2"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex items-center space-x-2">
                            <Layers
                              size={15}
                              className="text-gray-400 shrink-0"
                            />
                            <span className="text-sm font-semibold">
                              {comp.name}
                            </span>
                          </div>
                          {/* 对应最新的新 Type: stock_quantity */}
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-bold shrink-0 ${
                              comp.stock_quantity > 0
                                ? "bg-green-50 text-green-600  "
                                : "bg-red-50 text-red-600  "
                            }`}
                          >
                            库存: {comp.stock_quantity}
                          </span>
                        </div>

                        <div className="flex justify-between items-center pt-1 border-t border-gray-50  text-xs text-gray-500">
                          <div className="flex flex-col">
                            <span>品相:</span>
                            <span className="font-bold">{comp.quality}</span>
                          </div>
                          <div className="flex flex-col">
                            <span>分类:</span>
                            <span className="font-bold">
                              {comp.categories?.name}
                            </span>
                          </div>
                          <div className="text-right flex flex-col">
                            <span className="text-indigo-600  font-bold text-lg">
                              € {comp.suggested_repair_price}
                            </span>
                            <span className="text-gray-400 scale-90 inline-block ml-1">
                              (同行: € {comp.partner_repair_price})
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}

          {/* 状态占位指示器 */}
          {loading && (
            <div className="flex justify-center items-center py-4 space-x-2 text-sm text-gray-400">
              <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <span>加载中...</span>
            </div>
          )}
          {!hasMore && models.length > 0 && (
            <p className="text-center text-xs text-gray-400 py-6">
              🎉 已拉取全部型号数据
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
