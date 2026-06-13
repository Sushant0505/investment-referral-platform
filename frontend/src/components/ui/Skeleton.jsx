/**
 * Skeleton Loader Components
 * Reusable skeleton placeholders for loading states
 */

export const CardSkeleton = () => (
  <div className="card p-6 animate-pulse">
    <div className="flex items-center justify-between mb-4">
      <div className="skeleton h-4 w-24"></div>
      <div className="skeleton h-8 w-8 rounded-lg"></div>
    </div>
    <div className="skeleton h-8 w-32 mb-2"></div>
    <div className="skeleton h-3 w-20"></div>
  </div>
);

export const TableRowSkeleton = ({ columns = 5 }) => (
  <tr className="animate-pulse">
    {Array.from({ length: columns }).map((_, i) => (
      <td key={i} className="px-4 py-4">
        <div className="skeleton h-4 w-full"></div>
      </td>
    ))}
  </tr>
);

export const TableSkeleton = ({ rows = 5, columns = 5 }) => (
  <>
    {Array.from({ length: rows }).map((_, i) => (
      <TableRowSkeleton key={i} columns={columns} />
    ))}
  </>
);

export const ChartSkeleton = ({ height = 300 }) => (
  <div className="card p-6 animate-pulse">
    <div className="skeleton h-5 w-40 mb-4"></div>
    <div className="skeleton w-full" style={{ height }}></div>
  </div>
);

export const ListItemSkeleton = () => (
  <div className="flex items-center gap-3 p-3 animate-pulse">
    <div className="skeleton w-10 h-10 rounded-full"></div>
    <div className="flex-1">
      <div className="skeleton h-4 w-32 mb-2"></div>
      <div className="skeleton h-3 w-24"></div>
    </div>
    <div className="skeleton h-4 w-16"></div>
  </div>
);

export const DashboardSkeleton = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ChartSkeleton />
      <ChartSkeleton />
    </div>
    <div className="card p-6">
      <div className="skeleton h-5 w-40 mb-4"></div>
      <table className="w-full">
        <tbody>
          <TableSkeleton rows={5} columns={4} />
        </tbody>
      </table>
    </div>
  </div>
);
