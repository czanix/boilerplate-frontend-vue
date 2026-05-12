# Czanix Boilerplate — Frontend Vue.js

> Vue 3 com Composition API, TypeScript e Pinia. Reatividade declarativa sem a complexidade de quem confunde framework com identidade.

[![Vue](https://img.shields.io/badge/Vue.js-3.4-4FC08D?style=flat&logo=vue.js&logoColor=white)](https://vuejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-007ACC?style=flat&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tech Reference](https://img.shields.io/badge/Czanix-Tech%20Reference-gold)](https://czanix.com/pt/stack)

---

## Filosofia

Vue é progressivo por design. Este boilerplate usa isso a favor:

1. **Composition API exclusivamente** — Options API é legado funcional, não padrão novo
2. **Pinia para estado global** — Vuex é história. Pinia é type-safe, modular e debuggável
3. **Auto-import com unplugin** — sem 47 linhas de import por componente
4. **Feature-based, não type-based** — pasta por funcionalidade, não por tipo de arquivo

**O que não tem aqui:** Mixins (composables resolvem melhor), Vuex, Options API, CSS global sem escopo, `any` no TypeScript.

---

## Estrutura

```
src/
├── features/                        # Organizaçao por domínio
│   ├── orders/
│   │   ├── components/
│   │   │   ├── OrderList.vue        # Componente de apresentação
│   │   │   └── OrderForm.vue
│   │   ├── composables/
│   │   │   └── useOrders.ts         # Lógica reutilizável
│   │   ├── stores/
│   │   │   └── orders.store.ts      # Pinia store
│   │   ├── services/
│   │   │   └── orders.api.ts        # HTTP layer
│   │   ├── types/
│   │   │   └── order.types.ts       # Interfaces TypeScript
│   │   └── OrdersView.vue           # Page-level component
│   │
│   └── auth/
│       ├── components/
│       ├── composables/
│       │   └── useAuth.ts
│       ├── stores/
│       │   └── auth.store.ts
│       └── guards/
│           └── auth.guard.ts        # Navigation guard
│
├── shared/                          # Cross-feature
│   ├── components/
│   │   ├── AppButton.vue
│   │   ├── AppModal.vue
│   │   └── AppTable.vue
│   ├── composables/
│   │   ├── useApi.ts                # Fetch wrapper com Result pattern
│   │   ├── useDebounce.ts
│   │   └── useIntersectionObserver.ts
│   ├── utils/
│   │   └── result.ts                # Result<T> type
│   └── layouts/
│       ├── DefaultLayout.vue
│       └── AuthLayout.vue
│
├── plugins/
│   ├── router.ts                    # Vue Router config
│   ├── pinia.ts                     # Pinia config
│   └── i18n.ts                      # Internacionalização
│
├── styles/
│   ├── tokens.css                   # Design tokens (cores, spacing, tipografia)
│   ├── reset.css                    # CSS reset mínimo
│   └── transitions.css              # Transições reutilizáveis
│
├── App.vue
└── main.ts
```

### Por que feature-based?

Porque quando o projeto cresce, você procura "onde está a lógica de pedidos?", não "onde estão os composables?". Colocation > convenção de pasta por tipo.

---

## Início rápido

```bash
# 1. Clone
git clone https://github.com/czanix/boilerplate-frontend-vue.git meu-projeto
cd meu-projeto

# 2. Dependências
npm install

# 3. Ambiente
cp .env.example .env.local

# 4. Dev server
npm run dev
```

---

## Composables — lógica reutilizável sem herança

```typescript
// useApi.ts — fetch wrapper com Result Pattern
import type { Result } from '@/shared/utils/result';

export function useApi() {
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function request<T>(
    url: string,
    options?: RequestInit
  ): Promise<Result<T>> {
    loading.value = true;
    error.value = null;

    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        ...options,
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        error.value = body.error || `HTTP ${response.status}`;
        return { ok: false, error: error.value! };
      }

      const data = await response.json();
      return { ok: true, value: data as T };
    } catch (e) {
      error.value = 'Network error';
      return { ok: false, error: error.value };
    } finally {
      loading.value = false;
    }
  }

  return { request, loading: readonly(loading), error: readonly(error) };
}
```

```vue
<!-- OrderList.vue — consumo limpo -->
<script setup lang="ts">
const { orders, fetchOrders, isLoading } = useOrders();

onMounted(() => fetchOrders());
</script>

<template>
  <div v-if="isLoading" class="skeleton-grid" />
  <TransitionGroup v-else name="list" tag="ul">
    <li v-for="order in orders" :key="order.publicId">
      {{ order.customerName }} — {{ order.total }}
    </li>
  </TransitionGroup>
</template>
```

---

## Pinia Store — type-safe e devtools integrado

```typescript
// orders.store.ts
export const useOrdersStore = defineStore('orders', () => {
  // State
  const orders = ref<Order[]>([]);
  const selectedOrder = ref<Order | null>(null);

  // Getters (computed)
  const pendingOrders = computed(() =>
    orders.value.filter(o => o.status === 'pending')
  );

  const totalRevenue = computed(() =>
    orders.value.reduce((sum, o) => sum + o.total, 0)
  );

  // Actions
  async function fetchOrders() {
    const { request } = useApi();
    const result = await request<Order[]>('/api/orders');

    if (result.ok) {
      orders.value = result.value;
    }
  }

  async function cancelOrder(publicId: string) {
    const { request } = useApi();
    const result = await request(`/api/orders/${publicId}/cancel`, {
      method: 'PATCH',
    });

    if (result.ok) {
      const index = orders.value.findIndex(o => o.publicId === publicId);
      if (index !== -1) {
        orders.value[index].status = 'cancelled';
      }
    }

    return result;
  }

  return {
    orders: readonly(orders),
    selectedOrder,
    pendingOrders,
    totalRevenue,
    fetchOrders,
    cancelOrder,
  };
});
```

**Por que `readonly()` no retorno?** Componentes leem o estado, actions modificam. Sem atalhos, sem mutação direta, sem bug por efeito colateral.

---

## Router — lazy loading e guards

```typescript
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@/shared/layouts/DefaultLayout.vue'),
    children: [
      {
        path: '',
        name: 'home',
        component: () => import('@/features/dashboard/DashboardView.vue'),
      },
      {
        path: 'orders',
        name: 'orders',
        component: () => import('@/features/orders/OrdersView.vue'),
        meta: { requiresAuth: true },
      },
    ],
  },
  {
    path: '/login',
    component: () => import('@/shared/layouts/AuthLayout.vue'),
    children: [
      {
        path: '',
        name: 'login',
        component: () => import('@/features/auth/LoginView.vue'),
      },
    ],
  },
];

// Guard global
router.beforeEach((to) => {
  const auth = useAuthStore();
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }
});
```

---

## Performance

### Lazy Components
```vue
<script setup>
// Componentes pesados carregam sob demanda
const HeavyChart = defineAsyncComponent(() =>
  import('@/shared/components/HeavyChart.vue')
);
</script>
```

### Virtual Scroll para listas longas
```vue
<template>
  <!-- 10.000 itens sem matar o DOM -->
  <RecycleScroller
    :items="products"
    :item-size="64"
    key-field="publicId"
    v-slot="{ item }"
  >
    <ProductRow :product="item" />
  </RecycleScroller>
</template>
```

---

## Testes

```bash
npm run test:unit          # Vitest — unit tests
npm run test:e2e           # Playwright — e2e
npm run test:coverage      # Coverage report
```

```typescript
// Exemplo de teste com Vitest
describe('useOrders', () => {
  it('should fetch orders successfully', async () => {
    const { orders, fetchOrders } = useOrders();

    await fetchOrders();

    expect(orders.value).toHaveLength(3);
    expect(orders.value[0].status).toBe('pending');
  });
});
```

---

## Referência técnica

- [Guia de Frontend](https://czanix.com/pt/stack/backend)
- [Catálogo de Trade-offs](https://czanix.com/pt/stack/tradeoffs)
- [Tech Radar](https://czanix.com/pt/stack/tech-radar)

---

## Licença

MIT — use, adapte, melhore. Se ajudou, [deixa uma estrela](https://github.com/czanix/boilerplate-frontend-vue) ⭐

---

<div align="center">
<sub>Desenvolvido e mantido por <a href="https://czanix.com">Cesar Zanis</a> — Czanix</sub>
</div>
