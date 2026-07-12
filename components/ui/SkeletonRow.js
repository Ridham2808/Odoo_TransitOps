// components/ui/SkeletonRow.js
// Table row skeleton for loading states

/**
 * @param {{ cols?: number, rows?: number }} props
 */
export default function SkeletonRow({ cols = 5, rows = 5 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, ri) => (
        <tr key={ri}>
          {Array.from({ length: cols }).map((_, ci) => (
            <td key={ci} style={{ padding: "11px 12px" }}>
              <div
                className="skeleton"
                style={{
                  height: 14,
                  width: ci === 0 ? "60%" : ci === cols - 1 ? "40%" : "80%",
                  borderRadius: 4,
                }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
