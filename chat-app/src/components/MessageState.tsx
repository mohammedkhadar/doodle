"use client";

interface MessageStateProps {
  title: string;
  detail: string;
  tone?: "neutral" | "error";
}

export function MessageState({ title, detail, tone = "neutral" }: MessageStateProps) {
  return (
    <div className="flex flex-1 items-center justify-center py-12">
      <div
        className={[
          "max-w-md rounded-[6px] border bg-white/90 px-6 py-5 text-center shadow-[0_2px_8px_rgba(0,0,0,0.08)]",
          tone === "error" ? "border-[#ff9e8d]" : "border-[#d8d8d8]",
        ].join(" ")}
      >
        <p className="text-lg font-medium text-[#6d7380]">{title}</p>
        <p className="mt-2 text-sm text-[#9097a0]">{detail}</p>
      </div>
    </div>
  );
}
