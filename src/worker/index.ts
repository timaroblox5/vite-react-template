import { Hono } from "hono";

// Типы для нашего приложения
type VPSPlan = {
    id: string;
    name: string;
    cpu: number;
    ram: number; // в GB
    storage: number; // в GB
    bandwidth: number; // в TB
    price: number;
    category: 'basic' | 'pro' | 'enterprise';
};

type VPSInstance = {
    id: string;
    planId: string;
    name: string;
    status: 'running' | 'stopped' | 'pending' | 'error';
    ipAddress?: string;
    createdAt: string;
    region: string;
};

type CreateVPSRequest = {
    planId: string;
    name: string;
    region: string;
};

// Mock данные для демонстрации
const VPS_PLANS: VPSPlan[] = [
    {
        id: 'basic-1',
        name: 'Basic VPS',
        cpu: 2,
        ram: 4,
        storage: 80,
        bandwidth: 2,
        price: 9.99,
        category: 'basic'
    },
    {
        id: 'pro-1',
        name: 'Pro VPS',
        cpu: 4,
        ram: 8,
        storage: 160,
        bandwidth: 5,
        price: 19.99,
        category: 'pro'
    },
    {
        id: 'enterprise-1',
        name: 'Enterprise VPS',
        cpu: 8,
        ram: 16,
        storage: 320,
        bandwidth: 10,
        price: 39.99,
        category: 'enterprise'
    }
];

// In-memory хранилище (в реальном приложении используйте KV или базу данных)
let vpsInstances: VPSInstance[] = [];

const app = new Hono<{ Bindings: Env }>();

// Middleware для CORS
app.use('/api/*', async (c, next) => {
    c.res.headers.set('Access-Control-Allow-Origin', '*');
    c.res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    c.res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    await next();
});

app.options('/api/*', (c) => c.text('', 204));

// API Routes
app.get("/api/", (c) => c.json({
    name: "TimaHost VPS Manager",
    version: "1.0.0",
    description: "VPS/RDP Hosting Management API"
}));

// Получить все доступные тарифы VPS
app.get("/api/plans", (c) => {
    return c.json({
        success: true,
        data: VPS_PLANS
    });
});

// Получить тариф по ID
app.get("/api/plans/:id", (c) => {
    const planId = c.req.param('id');
    const plan = VPS_PLANS.find(p => p.id === planId);

    if (!plan) {
        return c.json({ success: false, error: 'Plan not found' }, 404);
    }

    return c.json({ success: true, data: plan });
});

// Получить все VPS инстансы пользователя
app.get("/api/vps", (c) => {
    return c.json({
        success: true,
        data: vpsInstances
    });
});

// Создать новый VPS инстанс
app.post("/api/vps", async (c) => {
    try {
        const body = await c.req.json<CreateVPSRequest>();
        const { planId, name, region } = body;

        // Проверяем существование тарифа
        const plan = VPS_PLANS.find(p => p.id === planId);
        if (!plan) {
            return c.json({ success: false, error: 'Invalid plan ID' }, 400);
        }

        // Создаем новый инстанс
        const newVPS: VPSInstance = {
            id: `vps-${Date.now()}`,
            planId,
            name,
            status: 'pending',
            region,
            createdAt: new Date().toISOString()
        };

        vpsInstances.push(newVPS);

        // Имитируем создание VPS (в реальном приложении здесь был бы вызов к API провайдера)
        setTimeout(() => {
            const instance = vpsInstances.find(v => v.id === newVPS.id);
            if (instance) {
                instance.status = 'running';
                instance.ipAddress = `192.168.1.${Math.floor(Math.random() * 255)}`;
            }
        }, 5000);

        return c.json({
            success: true,
            data: newVPS,
            message: 'VPS instance is being created...'
        }, 201);

    } catch (error) {
        return c.json({ success: false, error: 'Invalid request body' }, 400);
    }
});

// Получить информацию о конкретном VPS
app.get("/api/vps/:id", (c) => {
    const vpsId = c.req.param('id');
    const vps = vpsInstances.find(v => v.id === vpsId);

    if (!vps) {
        return c.json({ success: false, error: 'VPS not found' }, 404);
    }

    const plan = VPS_PLANS.find(p => p.id === vps.planId);
    return c.json({
        success: true,
        data: {
            ...vps,
            plan
        }
    });
});

// Управление VPS (старт/стоп/перезагрузка)
app.post("/api/vps/:id/action", async (c) => {
    const vpsId = c.req.param('id');
    const { action } = await c.req.json<{ action: 'start' | 'stop' | 'restart' }>();

    const vps = vpsInstances.find(v => v.id === vpsId);
    if (!vps) {
        return c.json({ success: false, error: 'VPS not found' }, 404);
    }

    // Обновляем статус в зависимости от действия
    switch (action) {
        case 'start':
            vps.status = 'running';
            break;
        case 'stop':
            vps.status = 'stopped';
            break;
        case 'restart':
            vps.status = 'pending';
            setTimeout(() => {
                if (vps) vps.status = 'running';
            }, 3000);
            break;
    }

    return c.json({
        success: true,
        message: `VPS ${action} action completed`,
        data: vps
    });
});

// Удалить VPS инстанс
app.delete("/api/vps/:id", (c) => {
    const vpsId = c.req.param('id');
    const index = vpsInstances.findIndex(v => v.id === vpsId);

    if (index === -1) {
        return c.json({ success: false, error: 'VPS not found' }, 404);
    }

    vpsInstances.splice(index, 1);
    return c.json({ success: true, message: 'VPS instance deleted' });
});

// Статистика использования
app.get("/api/stats", (c) => {
    const stats = {
        totalInstances: vpsInstances.length,
        runningInstances: vpsInstances.filter(v => v.status === 'running').length,
        stoppedInstances: vpsInstances.filter(v => v.status === 'stopped').length,
        totalPlans: VPS_PLANS.length,
        regions: [...new Set(vpsInstances.map(v => v.region))]
    };

    return c.json({ success: true, data: stats });
});

export default app;