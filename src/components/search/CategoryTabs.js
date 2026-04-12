import { CATEGORY_ORDER } from "../../constants";

export default function CategoryTabs({ categories, activeCategory, onSelect, results }) {
  // 정해진 순서대로 정렬하되, 결과에 있는 카테고리만 노출
  const sortedCategories = CATEGORY_ORDER.filter(
    (cat) => cat === "전체" || categories.includes(cat)
  );

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {sortedCategories.map((cat) => {
        const count = cat === "전체" 
          ? results.length 
          : results.filter((r) => r.category === cat).length;

        if (count === 0 && cat !== "전체") return null;

        return (
          <button
            key={cat}
            onClick={() => onSelect(cat)}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 border ${
              activeCategory === cat
                ? "bg-slate-900 text-white border-slate-900 shadow-md"
                : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700"
            }`}
          >
            {cat} <span className={`ml-1 ${activeCategory === cat ? "text-slate-400" : "text-slate-300"}`}>{count}</span>
          </button>
        );
      })}
    </div>
  );
}
