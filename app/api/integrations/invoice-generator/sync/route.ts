import { NextResponse } from "next/server";
import { syncInvoiceGeneratorFinance } from "@/lib/portal/finance-sync";

export async function POST(request: Request) {
  const expectedSecret = process.env.INVOICE_GENERATOR_SYNC_SECRET;
  const providedSecret = request.headers.get("x-eor-sync-secret");

  if (!expectedSecret || !providedSecret || providedSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized finance sync request." }, { status: 401 });
  }

  try {
    const payload = await request.json();
    const result = await syncInvoiceGeneratorFinance(payload);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Finance sync failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
