import type { BillType } from "@/lib/types";

export function BillIcon({
  type,
  size = "md",
}: {
  type: Pick<BillType, "emoji" | "image_url" | "name">;
  size?: "sm" | "md" | "lg";
}) {
  const box =
    size === "lg" ? "h-14 w-14 text-3xl" : size === "sm" ? "h-8 w-8 text-lg" : "h-11 w-11 text-2xl";

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-800 ring-1 ring-teal-900/60 ${box}`}
      title={type.name}
    >
      {type.image_url ? (
        <img src={type.image_url} alt="" className="h-full w-full object-cover" />
      ) : (
        <span aria-hidden="true">{type.emoji}</span>
      )}
    </span>
  );
}

export async function readImageFile(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Choose an image file.");
  }
  if (file.size > 200_000) {
    throw new Error("Use a picture smaller than 200 KB.");
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string" || !result.startsWith("data:image/")) {
        reject(new Error("Could not read that picture."));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => reject(new Error("Could not read that picture."));
    reader.readAsDataURL(file);
  });
}
