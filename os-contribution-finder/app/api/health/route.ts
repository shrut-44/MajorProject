import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createServiceClient();
    
    // Quick DB check
    const { count, error } = await supabase
      .from("issues")
      .select("*", { count: "exact", head: true })
      .limit(1);

    if (error) {
      throw error;
    }

    return NextResponse.json(
      {
        status: "ok",
        database: "connected",
        issues_count: count ?? 0,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Health check failed:", err);
    return NextResponse.json(
      {
        status: "error",
        message: "Health check failed",
      },
      { status: 503 }
    );
  }
}
