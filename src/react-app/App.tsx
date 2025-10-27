import { useEffect, useState } from 'react';
import './App.css';

// Типы для нашего приложения
type VPSPlan = {
	id: string;
	name: string;
	cpu: number;
	ram: number;
	storage: number;
	bandwidth: number;
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

function App() {
	const [plans, setPlans] = useState<VPSPlan[]>([]);
	const [instances, setInstances] = useState<VPSInstance[]>([]);
	const [loading, setLoading] = useState(true);
	const [activeTab, setActiveTab] = useState<'plans' | 'instances' | 'create'>('plans');
	const [selectedPlan, setSelectedPlan] = useState<string>('');

	// Загрузка данных
	useEffect(() => {
		fetchData();
	}, []);

	const fetchData = async () => {
		try {
			const [plansRes, instancesRes] = await Promise.all([
				fetch('/api/plans'),
				fetch('/api/vps')
			]);

			const plansData = await plansRes.json();
			const instancesData = await instancesRes.json();

			if (plansData.success) setPlans(plansData.data);
			if (instancesData.success) setInstances(instancesData.data);
		} catch (error) {
			console.error('Error fetching data:', error);
		} finally {
			setLoading(false);
		}
	};

	// Создание VPS
	const createVPS = async (name: string, region: string) => {
		if (!selectedPlan) {
			alert('Пожалуйста, выберите тарифный план');
			return;
		}

		try {
			const response = await fetch('/api/vps', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					planId: selectedPlan,
					name,
					region
				}),
			});

			const data = await response.json();

			if (data.success) {
				alert('VPS создается...');
				setActiveTab('instances');
				fetchData();
			} else {
				alert('Ошибка при создании VPS: ' + data.error);
			}
		} catch (error) {
			console.error('Error creating VPS:', error);
		}
	};

	// Управление VPS
	const manageVPS = async (vpsId: string, action: 'start' | 'stop' | 'restart') => {
		try {
			const response = await fetch(`/api/vps/${vpsId}/action`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ action }),
			});

			const data = await response.json();

			if (data.success) {
				alert(`VPS ${action} выполнен`);
				fetchData();
			} else {
				alert('Ошибка: ' + data.error);
			}
		} catch (error) {
			console.error('Error managing VPS:', error);
		}
	};

	// Удаление VPS
	const deleteVPS = async (vpsId: string) => {
		if (!confirm('Вы уверены, что хотите удалить этот VPS?')) return;

		try {
			const response = await fetch(`/api/vps/${vpsId}`, {
				method: 'DELETE',
			});

			const data = await response.json();

			if (data.success) {
				alert('VPS удален');
				fetchData();
			} else {
				alert('Ошибка: ' + data.error);
			}
		} catch (error) {
			console.error('Error deleting VPS:', error);
		}
	};

	if (loading) {
		return (
			<div className="app">
				<div className="loading">Загрузка...</div>
			</div>
		);
	}

	return (
		<div className="app">
			<header className="app-header">
				<h1>🚀 TimaHost VPS Manager</h1>
				<nav className="nav">
					<button
						className={activeTab === 'plans' ? 'active' : ''}
						onClick={() => setActiveTab('plans')}
					>
						Тарифы
					</button>
					<button
						className={activeTab === 'instances' ? 'active' : ''}
						onClick={() => setActiveTab('instances')}
					>
						Мои VPS ({instances.length})
					</button>
					<button
						className={activeTab === 'create' ? 'active' : ''}
						onClick={() => setActiveTab('create')}
					>
						Создать VPS
					</button>
				</nav>
			</header>

			<main className="main-content">
				{activeTab === 'plans' && <PlansTab plans={plans} />}
				{activeTab === 'instances' && (
					<InstancesTab
						instances={instances}
						plans={plans}
						onManage={manageVPS}
						onDelete={deleteVPS}
					/>
				)}
				{activeTab === 'create' && (
					<CreateTab
						plans={plans}
						selectedPlan={selectedPlan}
						onPlanSelect={setSelectedPlan}
						onCreate={createVPS}
					/>
				)}
			</main>
		</div>
	);
}

// Компонент для отображения тарифов
function PlansTab({ plans }: { plans: VPSPlan[] }) {
	return (
		<div className="plans-grid">
			{plans.map(plan => (
				<div key={plan.id} className={`plan-card ${plan.category}`}>
					<div className="plan-header">
						<h3>{plan.name}</h3>
						<div className="price">${plan.price}/мес</div>
					</div>
					<div className="plan-specs">
						<div>💻 {plan.cpu} vCPU</div>
						<div>🧠 {plan.ram} GB RAM</div>
						<div>💾 {plan.storage} GB SSD</div>
						<div>🌐 {plan.bandwidth} TB Банда</div>
					</div>
					<div className="plan-category">{plan.category}</div>
				</div>
			))}
		</div>
	);
}

// Компонент для отображения инстансов
function InstancesTab({
	instances,
	plans,
	onManage,
	onDelete
}: {
	instances: VPSInstance[];
	plans: VPSPlan[];
	onManage: (id: string, action: 'start' | 'stop' | 'restart') => void;
	onDelete: (id: string) => void;
}) {
	const getPlanName = (planId: string) => {
		const plan = plans.find(p => p.id === planId);
		return plan ? plan.name : 'Unknown';
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'running': return 'green';
			case 'stopped': return 'red';
			case 'pending': return 'orange';
			case 'error': return 'darkred';
			default: return 'gray';
		}
	};

	return (
		<div className="instances-list">
			{instances.length === 0 ? (
				<div className="empty-state">
					<h3>У вас пока нет VPS инстансов</h3>
					<p>Создайте свой первый VPS на вкладке "Создать VPS"</p>
				</div>
			) : (
				instances.map(instance => (
					<div key={instance.id} className="instance-card">
						<div className="instance-header">
							<h4>{instance.name}</h4>
							<span
								className="status"
								style={{ color: getStatusColor(instance.status) }}
							>
								{instance.status}
							</span>
						</div>

						<div className="instance-info">
							<div>📋 Тариф: {getPlanName(instance.planId)}</div>
							<div>🌍 Регион: {instance.region}</div>
							{instance.ipAddress && <div>📍 IP: {instance.ipAddress}</div>}
							<div>🕐 Создан: {new Date(instance.createdAt).toLocaleDateString()}</div>
						</div>

						<div className="instance-actions">
							{instance.status === 'running' && (
								<>
									<button onClick={() => onManage(instance.id, 'stop')}>⏹️ Остановить</button>
									<button onClick={() => onManage(instance.id, 'restart')}>🔄 Перезагрузить</button>
								</>
							)}
							{instance.status === 'stopped' && (
								<button onClick={() => onManage(instance.id, 'start')}>▶️ Запустить</button>
							)}
							<button
								className="danger"
								onClick={() => onDelete(instance.id)}
							>
								🗑️ Удалить
							</button>
						</div>
					</div>
				))
			)}
		</div>
	);
}

// Компонент для создания VPS
function CreateTab({
	plans,
	selectedPlan,
	onPlanSelect,
	onCreate
}: {
	plans: VPSPlan[];
	selectedPlan: string;
	onPlanSelect: (planId: string) => void;
	onCreate: (name: string, region: string) => void;
}) {
	const [name, setName] = useState('');
	const [region, setRegion] = useState('us-east');

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (name && region && selectedPlan) {
			onCreate(name, region);
			setName('');
			setRegion('us-east');
			onPlanSelect('');
		}
	};

	return (
		<div className="create-tab">
			<form onSubmit={handleSubmit} className="create-form">
				<h3>Создать новый VPS</h3>

				<div className="form-group">
					<label>Название VPS:</label>
					<input
						type="text"
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="Мой VPS сервер"
						required
					/>
				</div>

				<div className="form-group">
					<label>Регион:</label>
					<select value={region} onChange={(e) => setRegion(e.target.value)}>
						<option value="us-east">US East</option>
						<option value="us-west">US West</option>
						<option value="eu-central">EU Central</option>
						<option value="asia-southeast">Asia Southeast</option>
					</select>
				</div>

				<div className="form-group">
					<label>Тарифный план:</label>
					<div className="plan-selection">
						{plans.map(plan => (
							<div
								key={plan.id}
								className={`plan-option ${selectedPlan === plan.id ? 'selected' : ''}`}
								onClick={() => onPlanSelect(plan.id)}
							>
								<div className="plan-option-name">{plan.name}</div>
								<div className="plan-option-specs">
									{plan.cpu}vCPU, {plan.ram}GB RAM, {plan.storage}GB SSD
								</div>
								<div className="plan-option-price">${plan.price}/мес</div>
							</div>
						))}
					</div>
				</div>

				<button
					type="submit"
					className="create-button"
					disabled={!name || !region || !selectedPlan}
				>
					🚀 Создать VPS
				</button>
			</form>
		</div>
	);
}

export default App;