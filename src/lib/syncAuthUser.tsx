import supabase from "@/backend/config";

/**
 * Sync the authenticated user from Supabase Auth (e.g. Google login)
 * into your public.users table.
 *
 * Ensures the user exists so foreign key relations like orders.customer_id work.
 */
export async function syncUserProfile() {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.error("Auth fetch error:", authError.message);
    return null;
  }

  if (!user) {
    console.warn("No authenticated user found.");
    return null;
  }

  // Upsert into your public.users table
  const { data, error } = await supabase
    .from("users")
    .upsert(
      {
        auth_id: user.id, // link to auth.users.id
        email: user.email,
        full_name: user.user_metadata.full_name || user.user_metadata.name,
        profile_picture: user.user_metadata.avatar_url || null,
      },
      { onConflict: "auth_id" } // ensures update instead of duplicate
    )
    .select("id")
    .single();

  if (error) {
    console.error("Error syncing user:", error.message);
    return null;
  }

  return data; // returns your users.id (used for customer_id, etc.)
}
