import { LoginForm } from "@/components/LoginForm";

export const metadata = { title: "Log in · Freshroots Planner" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  return (
    <div className="mx-auto mt-24 w-full max-w-sm px-4">
      <h1 className="text-xl font-semibold">Freshroots Demand Planner</h1>
      <p className="mt-1 text-sm text-slate-600">Shared team password. This is a simple gate, not real authentication.</p>
      <LoginForm next={typeof next === "string" ? next : "/"} />
    </div>
  );
}
