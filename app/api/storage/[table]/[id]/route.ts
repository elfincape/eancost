import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isStorageTable } from "@/lib/storage/tables";

type RouteContext = {
  params: Promise<{ table: string; id: string }>;
};

function unavailableResponse(error: unknown) {
  return NextResponse.json(
    {
      error: error instanceof Error ? error.message : "Supabase admin client is not available.",
    },
    { status: 503 },
  );
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { table, id } = await context.params;

  if (!isStorageTable(table)) {
    return NextResponse.json({ error: "Unsupported storage table." }, { status: 404 });
  }

  try {
    const payload = await request.json();
    const supabase = createAdminClient();
    const { data, error } = await supabase.from(table).update(payload).eq("id", id).select("*").single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    return unavailableResponse(error);
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { table, id } = await context.params;

  if (!isStorageTable(table)) {
    return NextResponse.json({ error: "Unsupported storage table." }, { status: 404 });
  }

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from(table).delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data: { id } });
  } catch (error) {
    return unavailableResponse(error);
  }
}
