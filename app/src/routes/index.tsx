import { createFileRoute } from '@tanstack/react-router'
import { queryOptions, useQuery } from '@tanstack/react-query'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

type RoomItem = {
  room: {
    id: string
    name: string
    blockId: string
    isLocked: boolean | null
    doorState: 'OPEN' | 'CLOSED' | 'UNKNOWN'
    lastStatusUpdateAt: string | null
    createdAt: string
  }
  block: {
    id: string
    name: string
  }
}

type RoomsResponse = {
  result: RoomItem[]
}

const roomsQueryOptions = () =>
  queryOptions({
    queryKey: ['rooms'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/rooms`)

      if (!response.ok) {
        throw new Error('Falha ao carregar as salas')
      }

      const data = (await response.json()) as RoomsResponse
      return data.result
    },
    staleTime: 1000 * 30,
  })

export const Route = createFileRoute('/')({
  loader: ({ context }) => context.queryClient.ensureQueryData(roomsQueryOptions()),
  component: RoomsPage,
})

function RoomsPage() {
  const {
    data: rooms,
    isLoading,
    isError,
    error,
  } = useQuery(roomsQueryOptions())

  return (
    <main className="mx-auto flex min-h-[calc(100vh-80px)] w-full max-w-4xl flex-col gap-6 px-4 py-10">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Salas cadastradas</h1>
        <p className="text-sm text-slate-600">
          Lista simples com os ambientes monitorados pelo sistema de controle de acesso.
        </p>
      </header>

      {isLoading ? (
        <p className="text-slate-700">Carregando salas...</p>
      ) : isError ? (
        <p className="text-red-600">
          {error instanceof Error
            ? error.message
            : 'Não foi possível carregar as salas. Tente novamente mais tarde.'}
        </p>
      ) : rooms && rooms.length > 0 ? (
        <ul className="space-y-3 text-slate-800">
          {rooms.map(({ room, block }) => {
            const doorStateLabel = formatDoorState(room.doorState)
            const lockedStatus =
              room.isLocked === null
                ? 'Sem informação'
                : room.isLocked
                  ? 'Trancada'
                  : 'Destrancada'

            return (
              <li
                key={room.id}
                className="rounded border border-slate-200 bg-white p-4 shadow-sm"
              >
                <p className="font-medium">
                  {block.name} — {room.name}
                </p>
                <p className="text-sm text-slate-600">
                  Porta: {doorStateLabel} • Tranca: {lockedStatus}
                </p>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="text-slate-700">Nenhuma sala cadastrada até o momento.</p>
      )}
    </main>
  )
}

function formatDoorState(state: RoomItem['room']['doorState']) {
  switch (state) {
    case 'OPEN':
      return 'Aberta'
    case 'CLOSED':
      return 'Fechada'
    default:
      return 'Desconhecida'
  }
}
