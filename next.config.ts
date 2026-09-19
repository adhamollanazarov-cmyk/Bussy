import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Bu papkadan tashqarida (masalan, foydalanuvchi uy katalogida) turgan begona
  // package-lock.json fayllari Turbopack'ning workspace root'ini noto'g'ri
  // aniqlashiga sabab bo'ladi va native modullar (lightningcss) topilmaydi.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
