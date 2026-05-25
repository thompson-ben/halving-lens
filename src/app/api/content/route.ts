import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const platform = searchParams.get("platform");
  const search = searchParams.get("q");

  const items = await prisma.discoveredContent.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(platform ? { platform } : {}),
      ...(search
        ? {
            OR: [
              { caption: { contains: search, mode: "insensitive" } },
              { originalAuthor: { contains: search, mode: "insensitive" } },
              { carMake: { contains: search, mode: "insensitive" } },
              { carModel: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ aiScore: "desc" }, { discoveredAt: "desc" }],
    take: 200,
    include: { captions: { orderBy: { createdAt: "desc" }, take: 1 }, score: true },
  });

  return NextResponse.json({ items });
}
