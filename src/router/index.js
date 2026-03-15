import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'

const routes = [
  {
    path: '/',
    redirect: '/login',
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/auth/LoginView.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/setup',
    name: 'setup',
    component: () => import('@/views/auth/SetupView.vue'),
    meta: { requiresAuth: false },
  },

  // Driver routes
  {
    path: '/driver',
    component: () => import('@/layouts/DriverLayout.vue'),
    meta: { requiresAuth: true, role: 'driver' },
    children: [
      {
        path: '',
        name: 'driver-home',
        component: () => import('@/views/driver/DriverHomeView.vue'),
      },
      {
        path: 'trip',
        name: 'driver-trip',
        component: () => import('@/views/driver/DriverTripView.vue'),
      },
      {
        path: 'route',
        name: 'driver-route',
        component: () => import('@/views/driver/DriverRouteView.vue'),
      },
      {
        path: 'chat',
        name: 'driver-chat',
        component: () => import('@/views/driver/DriverChatView.vue'),
      },
      {
        path: 'docs',
        name: 'driver-docs',
        component: () => import('@/views/driver/DriverDocsView.vue'),
      },
    ],
  },

  // Dispatcher routes
  {
    path: '/dispatcher',
    component: () => import('@/layouts/DispatcherLayout.vue'),
    meta: { requiresAuth: true, role: 'dispatcher' },
    children: [
      {
        path: '',
        name: 'dispatcher-dashboard',
        component: () => import('@/views/dispatcher/DispatcherDashboardView.vue'),
      },
      {
        path: 'map',
        name: 'dispatcher-map',
        component: () => import('@/views/dispatcher/DispatcherMapView.vue'),
      },
      {
        path: 'trips',
        name: 'dispatcher-trips',
        component: () => import('@/views/dispatcher/DispatcherTripsView.vue'),
      },
      {
        path: 'trips/:id',
        name: 'dispatcher-trip-detail',
        component: () => import('@/views/dispatcher/DispatcherTripDetailView.vue'),
      },
      {
        path: 'drivers',
        name: 'dispatcher-drivers',
        component: () => import('@/views/dispatcher/DispatcherDriversView.vue'),
      },
      {
        path: 'chat',
        name: 'dispatcher-chat',
        component: () => import('@/views/dispatcher/DispatcherChatView.vue'),
      },
      {
        path: 'routes',
        name: 'dispatcher-routes',
        component: () => import('@/views/shared/RoutesView.vue'),
      },
      {
        path: 'events',
        name: 'dispatcher-events',
        component: () => import('@/views/dispatcher/DispatcherEventsView.vue'),
      },
    ],
  },

  // Logist routes
  {
    path: '/logist',
    component: () => import('@/layouts/LogistLayout.vue'),
    meta: { requiresAuth: true, role: 'logist' },
    children: [
      {
        path: '',
        name: 'logist-dashboard',
        component: () => import('@/views/logist/LogistDashboardView.vue'),
      },
      {
        path: 'planning',
        name: 'logist-planning',
        component: () => import('@/views/logist/LogistPlanningView.vue'),
      },
      {
        path: 'routes',
        name: 'logist-routes',
        component: () => import('@/views/shared/RoutesView.vue'),
      },
      {
        path: 'containers',
        name: 'logist-containers',
        component: () => import('@/views/logist/LogistContainersView.vue'),
      },
      {
        path: 'trips',
        name: 'logist-trips',
        component: () => import('@/views/logist/LogistTripsView.vue'),
      },
      {
        path: 'trips/:id',
        name: 'logist-trip-detail',
        component: () => import('@/views/logist/LogistTripDetailView.vue'),
      },
      {
        path: 'events',
        name: 'logist-events',
        component: () => import('@/views/logist/LogistEventsView.vue'),
      },
    ],
  },

  // Public routes (no auth required)
  {
    path: '/r/:id',
    name: 'public-route',
    component: () => import('@/views/public/PublicRouteView.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/calc/:linkId',
    name: 'public-calc',
    component: () => import('@/views/public/PublicCalcView.vue'),
    meta: { requiresAuth: false },
  },

  // Catch-all
  {
    path: '/:pathMatch(.*)*',
    redirect: '/login',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  await authStore.isReady

  const requiresAuth = to.meta.requiresAuth !== false
  const requiredRole = to.meta.role

  // Not logged in → go to login
  if (requiresAuth && !authStore.isAuthenticated) {
    return next('/login')
  }

  // Logged in + has role + trying to open /login → redirect to dashboard
  if (to.path === '/login' && authStore.isAuthenticated && authStore.role) {
    return next(authStore.roleRedirect)
  }

  // Logged in but wrong role for this route
  if (requiredRole && authStore.role && authStore.role !== requiredRole) {
    return next(authStore.roleRedirect)
  }

  next()
})

export default router
