import { queryOptions } from '@tanstack/react-query';
import { getLogs } from '@/lib/api/generated';
import type { GetLogsParams } from '@/lib/api/generated';

export const logsQueryKeys = {
  all: ['logs'] as const,
  list: (params: GetLogsParams) => [...logsQueryKeys.all, params] as const,
};

export function logsQueryOptions(params: GetLogsParams) {
  return queryOptions({
    queryKey: logsQueryKeys.list(params),
    queryFn: () => getLogs(params),
  });
}
