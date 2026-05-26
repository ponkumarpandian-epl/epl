import { NextRequest, NextResponse } from "next/server";

const NOMINATIM = "https://nominatim.openstreetmap.org/reverse";
const UA = "EPL-Tournament-App/1.0 (https://www.e-citypremierleague.in)";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat/lng required" }, { status: 400 });
  }

  const url = `${NOMINATIM}?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1&zoom=18`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, "Accept-Language": "en" },
      // Be a good Nominatim citizen — small cache window relieves load.
      next: { revalidate: 60 },
    });
    if (!res.ok) {
      return NextResponse.json({ error: `Nominatim returned ${res.status}` }, { status: 502 });
    }
    const data = (await res.json()) as { display_name?: string; address?: Record<string, string> };
    return NextResponse.json({
      address:     data.display_name ?? "",
      components:  data.address      ?? {},
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
