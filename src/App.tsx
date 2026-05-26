import { useState, useEffect } from "react";
import Dashboard from "./components/dashboard";
import Login from "./components/login/index";
import type { User } from "@supabase/supabase-js";
import { supabase } from "./lib/supabaseClient";
import { useRegisterSW } from "virtual:pwa-register/react";
import {
  ArrowUpToLine,
  CloudDownload,
  PlusSquare,
  RefreshCw,
  X,
} from "lucide-react";

// 声明安卓专属 PWA 安装事件类型
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);

  // 状态 1：阻断初始刷新闪烁的加载状态
  const [appLoading, setAppLoading] = useState<boolean>(true);

  // 状态 2：手机网络在线状态
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  // ---------------- 全局 PWA 智能安装核心状态 ----------------
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [platform, setPlatform] = useState<"android" | "ios" | "desktop">(
    "desktop",
  );
  const [showInstallBanner, setShowInstallBanner] = useState<boolean>(false);
  const [showIosGuide, setShowIosGuide] = useState<boolean>(false);

  // 状态 4：VitePWA 的更新/离线接管钩子
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegistered(r) {
      console.log("Service Worker 注册成功:", r);
    },
    onRegisterError(error) {
      console.error("Service Worker 注册失败:", error);
    },
  });

  // 监听手机网络断网/联网事件
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // 捕获鉴权状态并拦截“登录闪烁”
  useEffect(() => {
    // 1. 先去读取当前缓存的 session
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setUser(session?.user ?? null);
        setAppLoading(false); // 明确拿到结果后，关闭全屏白屏/加载
      })
      .catch(() => {
        setAppLoading(false);
      });

    // 2. 持续订阅鉴权状态变动
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAppLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  //  全局 PWA 设备环境与安装横幅捕获
  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(userAgent);

    // 检查是否已经是 PWA 独立窗口运行中
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone;

    if (isStandalone) return; // 已安装则不提示

    if (isIos) {
      setPlatform("ios");
      setShowInstallBanner(true); // iOS 直接提示
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setPlatform("android");
      setShowInstallBanner(true); // 安卓捕获到事件后提示
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () =>
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  // 执行安卓安装
  const handleAndroidInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowInstallBanner(false);
    }
    setDeferredPrompt(null);
  };

  // 阶段一：首屏绝对加载状态（防止闪烁登录页的关键）
  if (appLoading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-gray-50  transition-colors duration-200">
        <div className="relative flex flex-col items-center space-y-4">
          {/* 高级现代流线型旋转动效 */}
          <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-gray-500 tracking-wider animate-pulse">
            安全连接中...
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900 transition-colors duration-200">
      {/* ================= 1. 全局快捷安装横幅 (置于屏幕最顶层) ================= */}
      {showInstallBanner && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-linear-to-r from-indigo-600 to-violet-600 text-white px-4 py-3 flex items-center justify-between shadow-lg text-xs font-medium animate-fade-in">
          <div className="flex items-center space-x-2">
            <span className="bg-white/20 p-1.5 rounded-lg text-white">🚀</span>
            <div>
              <p className="font-bold">把「库存快查」添加到桌面</p>
              <p className="text-[10px] text-indigo-100">
                原生 App 级全屏体验，启动快不占内存
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            {platform === "android" ? (
              <button
                onClick={handleAndroidInstall}
                className="bg-white text-indigo-600 px-3 py-1.5 rounded-lg font-bold shadow-sm active:scale-95 transition"
              >
                立即安装
              </button>
            ) : (
              <button
                onClick={() => setShowIosGuide(true)}
                className="bg-white text-indigo-600 px-3 py-1.5 rounded-lg font-bold shadow-sm active:scale-95 transition"
              >
                查看指引
              </button>
            )}
            <button
              onClick={() => setShowInstallBanner(false)}
              className="p-1 text-white/70 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
      {/* ================= 2. 顶层离线网络通知条 (紧跟安装横幅下方或动态堆叠) ================= */}
      <div
        className={`fixed left-0 right-0 z-40 transform transition-all duration-300 shadow-md ${
          showInstallBanner ? "top-12.5" : "top-0" // 智能计算间距防止重叠
        } ${!isOnline ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 pointer-events-none"}`}
      >
        <div className="bg-red-500 text-white text-xs font-semibold py-2 px-4 flex items-center justify-center space-x-2">
          <span>⚠️ 当前网络已断开，正在浏览离线缓存数据</span>
        </div>
      </div>

      {/* ================= 3. 核心业务视图 (为顶部横幅腾出外边距) ================= */}
      <div
        className="flex-1 w-full transition-all duration-300"
        style={{
          // 关键：通过 transform 强行把 Dashboard 的 fixed 限制在这个 div 内部
          transform: "translate3d(0, 0, 0)",
          // 利用 margin-top 配合计算高度，把整个容器及里面的 fixed 元素整体往下推
          marginTop: showInstallBanner ? "50px" : "0px",
          height: showInstallBanner ? "calc(100vh - 50px)" : "100vh",
        }}
      >
        {user ? (
          <Dashboard
            user={user}
            onLogout={async () => {
              await supabase.auth.signOut();
              setUser(null);
            }}
          />
        ) : (
          <Login onLoginSuccess={(u: User) => setUser(u)} />
        )}
      </div>

      {/* ================= 4. PWA 离线就绪 / 新版本更新通知弹窗 ================= */}
      {(offlineReady || needRefresh) && (
        <div className="fixed bottom-4 left-4 right-4 z-50 max-w-sm mx-auto bg-white  border border-gray-100  p-4 rounded-2xl shadow-2xl flex flex-col space-y-3">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-indigo-50  text-indigo-600  rounded-xl">
              <CloudDownload size={20} />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-gray-900 ">
                {needRefresh ? "发现新版本后台" : "应用已就绪"}
              </h4>
              <p className="text-xs text-gray-500  mt-0.5 leading-relaxed">
                {needRefresh
                  ? "系统发布了全新的功能功能，点击立即更新。"
                  : "已成功缓存，本程序目前支持在无网络时离线打开。"}
              </p>
            </div>
          </div>
          <div className="flex space-x-2 justify-end pt-1">
            <button
              onClick={() => {
                setOfflineReady(false);
                setNeedRefresh(false);
              }}
              className="px-3 py-1.5 text-xs font-medium text-gray-500 bg-gray-100  rounded-lg"
            >
              忽略
            </button>
            {needRefresh && (
              <button
                onClick={() => updateServiceWorker(true)}
                className="flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg"
              >
                <RefreshCw size={12} className="animate-spin" />
                <span>立即更新</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ================= 5. iOS 专属引导抽屉 ================= */}
      {showIosGuide && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center backdrop-blur-xs">
          <div
            className="absolute inset-0"
            onClick={() => setShowIosGuide(false)}
          />
          <div className="relative w-full max-w-md bg-white  rounded-t-3xl p-6 shadow-2xl flex flex-col space-y-5">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold">添加到 iPhone 主屏幕</h3>
              <button
                onClick={() => setShowIosGuide(false)}
                className="p-1 rounded-full bg-gray-100 text-gray-500"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-4 text-sm text-gray-600">
              <div className="flex items-start space-x-3">
                <div className="bg-indigo-50 text-indigo-600 font-bold w-6 h-6 flex items-center justify-center rounded-full shrink-0 text-xs">
                  1
                </div>
                <p className="pt-0.5">
                  请确保当前使用的是系统自带的{" "}
                  <span className="font-semibold text-gray-900">
                    Safari 浏览器
                  </span>{" "}
                  打开本页面。
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="bg-indigo-50 text-indigo-600 font-bold w-6 h-6 flex items-center justify-center rounded-full shrink-0 text-xs">
                  2
                </div>
                <div className="pt-0.5 space-y-1">
                  <p>
                    点击浏览器底部工具栏的{" "}
                    <span className="font-semibold text-gray-900">“分享”</span>{" "}
                    按钮：
                  </p>
                  <div className="inline-flex items-center space-x-1 bg-gray-100 px-2 py-1 rounded-md text-gray-700 font-medium text-xs mt-1">
                    <ArrowUpToLine size={14} className="text-blue-500" />
                    <span>(带有向上箭头的方块图标)</span>
                  </div>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="bg-indigo-50 text-indigo-600 font-bold w-6 h-6 flex items-center justify-center rounded-full shrink-0 text-xs">
                  3
                </div>
                <div className="pt-0.5 space-y-1">
                  <p>
                    在弹出的菜单中向下滚动，找到并选择{" "}
                    <span className="font-semibold text-gray-900">
                      “添加到主屏幕”
                    </span>
                    ：
                  </p>
                  <div className="inline-flex items-center space-x-1.5 bg-gray-100 px-2 py-1 rounded-md text-gray-700 font-medium text-xs mt-1">
                    <PlusSquare size={14} />
                    <span>添加到主屏幕</span>
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowIosGuide(false)}
              className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl text-sm shadow-lg shadow-indigo-600/20"
            >
              我知道了
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
