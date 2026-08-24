export type UserRole = 'customer' | 'seller' | 'admin';

export interface User {
  uid: string;
  name: string;
  email: string;
  phoneNumber: string;
  role: UserRole;
  createdAt: string;
  status: 'active' | 'suspended';
}

export interface CustomerProfile {
  uid: string;
  name: string;
  email: string;
  phoneNumber: string;
  walletBalance: number;
  rewardPoints: number;
  defaultAddressId?: string;
  createdAt: string;
}

export interface SellerProfile {
  uid: string;
  name: string;
  email: string;
  phoneNumber: string;
  shopId?: string;
  pan: string;
  gst?: string;
  businessProofUrl?: string; // or base64 text
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface AdminProfile {
  uid: string;
  name: string;
  email: string;
  role: 'superadmin' | 'moderator';
  createdAt: string;
}

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface Address {
  id?: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  formattedAddress: string;
  location: LatLng;
}

export interface Shop {
  id: string;
  sellerId: string;
  name: string;
  description: string;
  logoBase64: string; // Image stored as base64 text
  bannerBase64: string; // Image stored as base64 text
  address: Address;
  location: LatLng;
  deliveryRadiusKm: number;
  openingTime: string; // HH:MM
  closingTime: string; // HH:MM
  status: 'pending' | 'approved' | 'suspended';
  isActive: boolean;
  categories: string[];
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  brandId: string;
  imageBase64: string; // Image stored as base64 text
  imageTextDescription?: string; // AI generated descriptive text
  isApproved: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  icon?: string; // Lucide icon name or emoji
  active: boolean;
}

export interface Brand {
  id: string;
  name: string;
  logo?: string;
  active: boolean;
}

export interface InventoryItem {
  id: string; // shopId_productId
  shopId: string;
  productId: string;
  stock: number;
  price: number;
  isAvailable: boolean;
  updatedAt: string;
}

export interface CartItem {
  productId: string;
  product: Product;
  shopId: string;
  shopName: string;
  quantity: number;
  price: number;
}

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

export type PaymentMethod = 'cod' | 'razorpay' | 'wallet' | 'upi';
export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'failed';
export type OrderStatus = 'placed' | 'accepted' | 'preparing' | 'dispatched' | 'delivered' | 'cancelled';

export interface Order {
  id: string;
  parentOrderId?: string; // Links split orders back to original group
  customerId: string;
  customerName: string;
  customerPhone: string;
  shopId: string;
  shopName: string;
  items: OrderItem[];
  subtotal: number;
  deliveryCharge: number;
  platformFee: number;
  tax: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  deliveryAddress: Address;
  createdAt: string;
  updatedAt: string;
}

export interface OrderGroup {
  id: string;
  customerId: string;
  customerName: string;
  subOrders: string[]; // List of split order IDs
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  createdAt: string;
}

export interface City {
  id: string;
  name: string;
  state: string;
  country: string;
  active: boolean;
}

export interface Area {
  id: string;
  name: string;
  cityId: string;
  active: boolean;
}

export interface Zone {
  id: string;
  name: string;
  areaId: string;
  cityId: string;
  coordinates: LatLng[]; // Polygon boundary for delivery zones
  active: boolean;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  customerId: string;
  customerName: string;
  shopId: string;
  shopName: string;
  lastMessageText: string;
  updatedAt: string;
}

export interface WalletTransaction {
  id: string;
  amount: number;
  type: 'credit' | 'debit';
  description: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userRole: UserRole;
  subject: string;
  description: string;
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  createdAt: string;
  updatedAt: string;
}

export interface PlatformSettings {
  commissionPercent: number;
  baseDeliveryCharge: number;
  deliveryChargePerKm: number;
  platformFee: number;
  freeDeliveryThreshold: number;
  mapProvider?: 'openstreetmap' | 'google';
  googleMapsApiKey?: string;
}
