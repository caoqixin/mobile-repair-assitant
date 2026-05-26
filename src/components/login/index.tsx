import { useActionState, useState } from "react";
import { Lock, Mail, Eye, EyeOff } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabaseClient";

interface LoginProps {
  onLoginSuccess: (user: User) => void;
}

interface ActionState {
  error: string | null;
  success: boolean;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // 1. 使用 _prevState 消除“声明但未读取”的警告
  const loginAction = async (
    _prevState: ActionState | null,
    formData: FormData,
  ): Promise<ActionState> => {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    // 如果后续不需要处理记住密码逻辑，直接移除 rememberMe 的声明以消除警告

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      return { error: authError.message, success: false };
    }

    if (data?.user) {
      onLoginSuccess(data.user);
      return { error: null, success: true };
    }

    return { error: "未知错误", success: false };
  };

  // 2. 这里解构出来的 isPending 已经在下方按钮的 disabled={isPending} 中正确读取
  const [state, formAction, isPending] = useActionState(loginAction, {
    error: null,
    success: false,
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50  px-4 transition-colors duration-200">
      <div className="max-w-md w-full space-y-8 p-8 bg-white  rounded-2xl shadow-xl border border-gray-100 da">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            店铺极速查询
          </h2>
          <p className="mt-2 text-center text-sm text-gray-500">
            请登录您的员工账号
          </p>
        </div>

        {state?.error && (
          <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">
            {state.error}
          </div>
        )}

        <form action={formAction} className="mt-8 space-y-6">
          <div className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
              <input
                name="email"
                type="email"
                required
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm outline-none"
                placeholder="邮箱地址"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                required
                className="w-full pl-10 pr-12 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm outline-none"
                placeholder="登录密码"
              />
              <button
                type="button"
                className="absolute right-3 top-3.5 text-gray-400"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center text-gray-600">
              <input
                name="rememberMe"
                type="checkbox"
                className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <span className="ml-2">记住密码</span>
            </label>
            <a href="#" className="text-indigo-600 hover:underline">
              忘记密码？
            </a>
          </div>

          {/* 3. 使用 isPending 绑定 disabled，彻底解决第3个警告 */}
          <button
            type="submit"
            disabled={isPending}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-lg transition duration-150 disabled:opacity-50"
          >
            {isPending ? "正在登录..." : "立即登录"}
          </button>
        </form>
      </div>
    </div>
  );
}
