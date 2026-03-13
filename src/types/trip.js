/**
 * @typedef {'driver_accepted'|'en_route_to_loading'|'arrived_at_loading'|'loading_started'|
 *   'loading_completed'|'departed'|'in_transit'|'arrived_at_waypoint'|'departed_waypoint'|
 *   'arrived_at_unloading'|'unloading_started'|'unloading_completed'|'documents_signed'|
 *   'en_route_to_terminal'|'arrived_at_terminal'|'waiting_at_terminal'|
 *   'container_drop_off_started'|'container_returned'|'terminal_receipt_confirmed'|
 *   'trip_completed'|'customs_arrived_at_border'|'customs_in_progress'|
 *   'customs_completed'|'customs_border_crossed'|'customs_waiting_at_border'|
 *   'delayed'|'breakdown'|'cargo_damaged'|'accident'|'rest_stop'|'terminal_rejected_return'} TripStatus
 */

/**
 * @typedef {Object} Waypoint
 * @property {string} id
 * @property {string} name
 * @property {string} address
 * @property {'loading'|'unloading'|'waypoint'|'terminal'} type
 * @property {number} lat
 * @property {number} lng
 * @property {boolean} completed
 * @property {Date|null} arrivedAt
 * @property {Date|null} departedAt
 */

/**
 * @typedef {Object} Container
 * @property {string} id
 * @property {string} number
 * @property {'20ft'|'40ft'|'40ft_hc'|'45ft'} type
 * @property {string} sealNumber
 * @property {number} weight
 * @property {string} cargoDescription
 * @property {TripStatus} currentStatus
 * @property {Date|null} terminalReturnDate
 */

/**
 * @typedef {Object} StatusLogEntry
 * @property {TripStatus} status
 * @property {Date} at
 * @property {string} byUid
 * @property {string} byName
 * @property {{lat: number, lng: number}|null} location
 * @property {string} comment
 */

/**
 * @typedef {Object} Trip
 * @property {string} id
 * @property {string} number
 * @property {string} driverUid
 * @property {string} driverName
 * @property {string} dispatcherUid
 * @property {boolean} isInternational
 * @property {TripStatus} currentStatus
 * @property {Waypoint[]} waypoints
 * @property {Container[]} containers
 * @property {StatusLogEntry[]} statusLog
 * @property {string[]} availableStatuses
 * @property {Date} createdAt
 * @property {Date} updatedAt
 * @property {Date|null} eta
 * @property {Date|null} completedAt
 */

export const TripStatus = {}
export const Trip = {}
export const Container = {}
