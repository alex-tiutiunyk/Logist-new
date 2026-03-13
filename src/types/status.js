export const STATUS = {
  // Basic statuses
  DRIVER_ACCEPTED: 'driver_accepted',
  EN_ROUTE_TO_LOADING: 'en_route_to_loading',
  ARRIVED_AT_LOADING: 'arrived_at_loading',
  LOADING_STARTED: 'loading_started',
  LOADING_COMPLETED: 'loading_completed',
  DEPARTED: 'departed',
  IN_TRANSIT: 'in_transit',
  ARRIVED_AT_WAYPOINT: 'arrived_at_waypoint',
  DEPARTED_WAYPOINT: 'departed_waypoint',
  ARRIVED_AT_UNLOADING: 'arrived_at_unloading',
  UNLOADING_STARTED: 'unloading_started',
  UNLOADING_COMPLETED: 'unloading_completed',
  DOCUMENTS_SIGNED: 'documents_signed',
  EN_ROUTE_TO_TERMINAL: 'en_route_to_terminal',
  ARRIVED_AT_TERMINAL: 'arrived_at_terminal',
  WAITING_AT_TERMINAL: 'waiting_at_terminal',
  CONTAINER_DROP_OFF_STARTED: 'container_drop_off_started',
  CONTAINER_RETURNED: 'container_returned',
  TERMINAL_RECEIPT_CONFIRMED: 'terminal_receipt_confirmed',
  TRIP_COMPLETED: 'trip_completed',

  // Customs statuses
  CUSTOMS_ARRIVED_AT_BORDER: 'customs_arrived_at_border',
  CUSTOMS_IN_PROGRESS: 'customs_in_progress',
  CUSTOMS_COMPLETED: 'customs_completed',
  CUSTOMS_BORDER_CROSSED: 'customs_border_crossed',
  CUSTOMS_WAITING_AT_BORDER: 'customs_waiting_at_border',

  // Emergency statuses
  DELAYED: 'delayed',
  BREAKDOWN: 'breakdown',
  CARGO_DAMAGED: 'cargo_damaged',
  ACCIDENT: 'accident',
  REST_STOP: 'rest_stop',
  TERMINAL_REJECTED_RETURN: 'terminal_rejected_return',
}

export const STATUS_LABELS = {
  driver_accepted: 'Водій прийняв рейс',
  en_route_to_loading: 'Їде на завантаження',
  arrived_at_loading: 'Прибув на завантаження',
  loading_started: 'Завантаження розпочато',
  loading_completed: 'Завантаження завершено',
  departed: 'Виїхав',
  in_transit: 'В дорозі',
  arrived_at_waypoint: 'Прибув у проміжну точку',
  departed_waypoint: 'Виїхав із проміжної точки',
  arrived_at_unloading: 'Прибув на розвантаження',
  unloading_started: 'Розвантаження розпочато',
  unloading_completed: 'Розвантаження завершено',
  documents_signed: 'Документи підписано',
  en_route_to_terminal: 'Їде на термінал',
  arrived_at_terminal: 'Прибув на термінал',
  waiting_at_terminal: 'Очікує на терміналі',
  container_drop_off_started: 'Здача контейнера розпочата',
  container_returned: 'Контейнер повернуто',
  terminal_receipt_confirmed: 'Квитанція терміналу підтверджена',
  trip_completed: 'Рейс завершено',

  customs_arrived_at_border: 'Прибув на кордон',
  customs_in_progress: 'Митне оформлення',
  customs_completed: 'Митне оформлення завершено',
  customs_border_crossed: 'Кордон перетнуто',
  customs_waiting_at_border: 'Очікування на кордоні',

  delayed: 'Затримка',
  breakdown: 'Поломка',
  cargo_damaged: 'Пошкодження вантажу',
  accident: 'ДТП',
  rest_stop: 'Зупинка на відпочинок',
  terminal_rejected_return: 'Термінал відхилив повернення',
}

export const STATUS_COLORS = {
  in_transit: { bg: 'bg-blue-100', text: 'text-blue-700' },
  loading: { bg: 'bg-amber-100', text: 'text-amber-700' },
  customs: { bg: 'bg-purple-100', text: 'text-purple-700' },
  completed: { bg: 'bg-green-100', text: 'text-green-700' },
  emergency: { bg: 'bg-red-100', text: 'text-red-700' },
  default: { bg: 'bg-gray-100', text: 'text-gray-700' },
}

export const EMERGENCY_STATUSES = [
  'delayed',
  'breakdown',
  'cargo_damaged',
  'accident',
  'rest_stop',
  'terminal_rejected_return',
]

export const CUSTOMS_STATUSES = [
  'customs_arrived_at_border',
  'customs_in_progress',
  'customs_completed',
  'customs_border_crossed',
  'customs_waiting_at_border',
]

export function getStatusColor(status) {
  if (EMERGENCY_STATUSES.includes(status)) return STATUS_COLORS.emergency
  if (CUSTOMS_STATUSES.includes(status)) return STATUS_COLORS.customs
  if (['trip_completed', 'terminal_receipt_confirmed', 'container_returned', 'documents_signed'].includes(status)) {
    return STATUS_COLORS.completed
  }
  if (['loading_started', 'loading_completed', 'unloading_started', 'unloading_completed'].includes(status)) {
    return STATUS_COLORS.loading
  }
  if (['in_transit', 'departed', 'en_route_to_loading', 'en_route_to_terminal'].includes(status)) {
    return STATUS_COLORS.in_transit
  }
  return STATUS_COLORS.default
}
