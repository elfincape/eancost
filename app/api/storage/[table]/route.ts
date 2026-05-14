import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isStorageTable } from "@/lib/storage/tables";

type RouteContext = {
  params: Promise<{ table: string }>;
};

function unavailableResponse(error: unknown) {
  return NextResponse.json(
    {
      error: error instanceof Error ? error.message : "Supabase admin client is not available.",
    },
    { status: 503 },
  );
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { table } = await context.params;

  if (!isStorageTable(table)) {
    return NextResponse.json({ error: "Unsupported storage table." }, { status: 404 });
  }

  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "100");

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 500) : 100);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    return unavailableResponse(error);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { table } = await context.params;

  if (!isStorageTable(table)) {
    return NextResponse.json({ error: "Unsupported storage table." }, { status: 404 });
  }

  try {
    const payload = await request.json();
    const supabase = createAdminClient();
    const { data, error } = await supabase.from(table).insert(payload).select("*").single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return unavailableResponse(error);
  }
}
