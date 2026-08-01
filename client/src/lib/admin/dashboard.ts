export type RecentOrder = {
  _id: string;
  name: string;
  customerName: string;
  size: string;
  from: string;
  to: string;
  total: number;
  status: 'confirmed' | 'completed' | 'cancelled';
  createdAt: string;
};

export type RecentProduct = {
  id: string;
  name: string;
  category: string;
  price: number;
  image: string;
  status: 'available' | 'rented' | 'hidden';
  createdAt: string;
};

export type DashboardStats = {
  totalProducts: number;
  availableProducts: number;
  currentlyRentedProducts: number;
  totalCategories: number;
  recentOrders: RecentOrder[];
  recentlyAddedProducts: RecentProduct[];
};

export async function fetchDashboard(): Promise<DashboardStats> {
  const res = await fetch('/api/admin/dashboard', { credentials: 'include' });
  if (!res.ok) throw new Error('Could not load the dashboard. Please try again.');
  return res.json();
}
