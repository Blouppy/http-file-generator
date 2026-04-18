const METHOD_COLORS: Record<string, string> = {
  GET: "bg-blue-100 text-blue-800 border-blue-200",
  POST: "bg-green-100 text-green-800 border-green-200",
  PUT: "bg-yellow-100 text-yellow-800 border-yellow-200",
  PATCH: "bg-orange-100 text-orange-800 border-orange-200",
  DELETE: "bg-red-100 text-red-800 border-red-200",
  HEAD: "bg-purple-100 text-purple-800 border-purple-200",
  OPTIONS: "bg-gray-100 text-gray-800 border-gray-200",
};

interface MethodBadgeProps {
  method: string;
}

export function MethodBadge({ method }: MethodBadgeProps) {
  const colorClass = METHOD_COLORS[method] ?? "bg-gray-100 text-gray-800 border-gray-200";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border shrink-0 ${colorClass}`}>
      {method}
    </span>
  );
}
