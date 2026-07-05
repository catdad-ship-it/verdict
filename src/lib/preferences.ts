export const SHELF_KEYS = ['now_playing', 'coming_soon', 'new_to_streaming'] as const
export type ShelfKey = typeof SHELF_KEYS[number]

export const QUEUE_SORTS = ['added', 'runtime', 'title', 'year', 'rating'] as const
export type QueueSort = typeof QUEUE_SORTS[number]
