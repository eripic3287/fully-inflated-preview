import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/auth/actions";
import FullyInflatedApp from "@/components/FullyInflatedApp";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 12,
          padding: "10px 20px",
          background: "#2B2140",
          color: "#fff",
          fontFamily: "'Outfit', system-ui, sans-serif",
          fontSize: 13.5,
        }}
      >
        <span style={{ opacity: 0.8 }}>{user.email}</span>
        <form action={logout}>
          <button
            type="submit"
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,.4)",
              color: "#fff",
              borderRadius: 8,
              padding: "5px 10px",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Sign out
          </button>
        </form>
      </div>
      <FullyInflatedApp />
    </div>
  );
}
