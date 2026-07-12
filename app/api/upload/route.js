// app/api/upload/route.js
import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { getUserFromHeaders } from "@/lib/auth";

export async function POST(request) {
  const user = getUserFromHeaders(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save locally under public/uploads
    const uploadDir = join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    const filename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const filePath = join(uploadDir, filename);
    await writeFile(filePath, buffer);

    return NextResponse.json({ fileUrl: `/uploads/${filename}` });
  } catch (error) {
    console.error("Local file upload failed:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
