import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateCaptionBundle } from "@/lib/openai";

const Schema = z.object({ contentId: z.string() });

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const content = await prisma.discoveredContent.findUnique({ where: { id: parsed.data.contentId } });
  if (!content) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const bundle = await generateCaptionBundle({
    carMake: content.carMake,
    carModel: content.carModel,
    originalAuthor: content.originalAuthor,
    rawCaption: content.caption,
  });

  const caption = await prisma.caption.create({
    data: {
      contentId: content.id,
      shortText: bundle.shortText,
      luxuryText: bundle.luxuryText,
      questionText: bundle.questionText,
      hashtags: bundle.hashtags,
      creditLine: bundle.creditLine,
    },
  });

  return NextResponse.json({ caption });
}
