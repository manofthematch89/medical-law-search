"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SearchInputBar({ initialValue = "" }) {
  const [value, setValue] = useState(initialValue);
  const router = useRouter();

  const handleSearch = () => {
    if (!value.trim()) return;
    router.push(`/search?q=${encodeURIComponent(value.trim())}`);
  };

  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        placeholder="법령 검색..."
        className="flex-1 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 bg-white transition-all shadow-sm"
      />
      <button
        onClick={handleSearch}
        className="btn-search whitespace-nowrap"
      >
        검색
      </button>
    </div>
  );
}
