import {
  User, Shop, Product, InventoryItem, Order, OrderGroup,
  City, Area, Zone, WalletTransaction, PlatformSettings,
  Category, Brand, LatLng, Address, PaymentMethod, OrderStatus, PaymentStatus
} from '@buyqk/types';

import { ADMIN_EMAILS, HR_EMAILS } from './whitelist';
export { isSuperAdminEmail, isTeamEmailAllowed } from './whitelist';

import { initializeApp, getApps, FirebaseApp, deleteApp } from 'firebase/app';
import {
  getAuth, signInWithPopup, GoogleAuthProvider,
  signOut as firebaseSignOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  Auth
} from 'firebase/auth';
import {
  getFirestore, Firestore,
  collection, doc, setDoc, getDoc, getDocs,
  addDoc, updateDoc, deleteDoc,
  onSnapshot, query, where, orderBy, limit,
  serverTimestamp, Timestamp, writeBatch
} from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadString, getDownloadURL } from 'firebase/storage';
import { getDatabase, Database } from 'firebase/database';

// ==========================================
// FIREBASE INIT
// ==========================================

const env = (typeof (import.meta as any).env !== 'undefined') ? (import.meta as any).env : {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || 'AIzaSyDtVt-YzG5nShekcRJVMQfjsbyF99QOrNI',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'buyqk-teams.firebaseapp.com',
  databaseURL: env.VITE_FIREBASE_DATABASE_URL || 'https://buyqk-teams-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'buyqk-teams',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'buyqk-teams.firebasestorage.app',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1041338794149',
  appId: env.VITE_FIREBASE_APP_ID || '1:1041338794149:web:fa794d1e75db1f27d60d4c'
};

let firebaseApp: FirebaseApp;
let firebaseAuth: Auth;
let db: Firestore;
let storage: ReturnType<typeof getStorage>;
let rtdb: Database;

if (getApps().length === 0) {
  firebaseApp = initializeApp(firebaseConfig);
} else {
  firebaseApp = getApps()[0];
}
firebaseAuth = getAuth(firebaseApp);
db = getFirestore(firebaseApp);
storage = getStorage(firebaseApp);
rtdb = getDatabase(firebaseApp);

// ==========================================
// STORAGE SERVICE
// ==========================================

export const storageService = {
  uploadBase64: async (filePath: string, base64OrDataUrl: string): Promise<string> => {
    if (!base64OrDataUrl) return '';
    if (base64OrDataUrl.startsWith('http://') || base64OrDataUrl.startsWith('https://')) {
      return base64OrDataUrl;
    }
    try {
      let dataUrl = base64OrDataUrl;
      if (!dataUrl.startsWith('data:')) {
        dataUrl = `data:image/png;base64,${base64OrDataUrl}`;
      }
      const sRef = storageRef(storage, filePath);
      await uploadString(sRef, dataUrl, 'data_url');
      return await getDownloadURL(sRef);
    } catch (err) {
      console.error("Failed to upload base64 to storage, using fallback:", err);
      return base64OrDataUrl;
    }
  },
  uploadTextFile: async (filePath: string, textContent: string): Promise<string> => {
    try {
      const sRef = storageRef(storage, filePath);
      await uploadString(sRef, textContent, 'raw');
      return await getDownloadURL(sRef);
    } catch (err) {
      console.error("Failed to upload text file to storage, using fallback:", err);
      return textContent;
    }
  }
};

// ==========================================
// STATIC DATA (never needs real-time sync)
// ==========================================

const CATEGORIES: Category[] = [
  { id: 'cat_groceries', name: 'Groceries & Fruits', icon: '🍎', active: true },
  { id: 'cat_electronics', name: 'Electronics', icon: '🔌', active: true },
  { id: 'cat_pharmacy', name: 'Medical & Pharmacy', icon: '💊', active: true },
  { id: 'cat_bakery', name: 'Bakery & Sweets', icon: '🥐', active: true },
  { id: 'cat_stationery', name: 'Stationery & Books', icon: '✏️', active: true },
  { id: 'cat_household', name: 'Household & Tools', icon: '🔨', active: true },
];

const BRANDS: Brand[] = [
  { id: 'b_apple', name: 'Apple', active: true },
  { id: 'b_nestle', name: 'Nestle', active: true },
  { id: 'b_amul', name: 'Amul', active: true },
  { id: 'b_logitech', name: 'Logitech', active: true },
  { id: 'b_local', name: 'Local Artisan', active: true },
];

const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  commissionPercent: 10,
  baseDeliveryCharge: 30,
  deliveryChargePerKm: 10,
  platformFee: 5,
  freeDeliveryThreshold: 499,
  mapProvider: 'openstreetmap',
  googleMapsApiKey: '',
};

// ==========================================
// HELPERS
// ==========================================

/** Strip Firestore Timestamp objects to plain ISO strings for app compatibility */
function normalizeDoc(data: any): any {
  if (!data) return data;
  const out: any = { ...data };
  for (const key of Object.keys(out)) {
    if (out[key] instanceof Timestamp) {
      out[key] = out[key].toDate().toISOString();
    } else if (out[key] && typeof out[key] === 'object' && !Array.isArray(out[key])) {
      out[key] = normalizeDoc(out[key]);
    }
  }
  return out;
}

function id10(): string {
  return Math.random().toString(36).substr(2, 9);
}

// ==========================================
// GEOLOCATION HELPERS
// ==========================================

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return Number((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2));
}

export async function resolveAddressFromLatLng(lat: number, lng: number, settings?: PlatformSettings): Promise<string> {
  const provider = settings?.mapProvider || 'openstreetmap';
  const apiKey = settings?.googleMapsApiKey;

  if (provider === 'google' && apiKey) {
    try {
      const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`);
      const data = await res.json();
      if (data?.results?.[0]?.formatted_address) {
        return data.results[0].formatted_address;
      }
    } catch (err) {
      console.error("Google Geocoding failed, falling back to openstreetmap:", err);
    }
  }

  // OpenStreetMap Nominatim Free Geocoder (fallback or primary)
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
      headers: {
        'Accept-Language': 'en'
      }
    });
    const data = await res.json();
    if (data?.display_name) {
      return data.display_name;
    }
  } catch (err) {
    console.error("Nominatim Geocoding failed:", err);
  }

  return `Custom Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
}

// ==========================================
// AUTH
// ==========================================

let currentAuthUser: any = null;
let currentUserListener: ((user: any) => void) | null = null;
const isBrowser = typeof window !== 'undefined' && typeof localStorage !== 'undefined';

/** Fetch or create user doc in Firestore after Firebase Auth resolves */
async function hydrateUser(fbUser: any, role: string = 'customer', extra: any = {}): Promise<any> {
  const ref = doc(db, 'users', fbUser.uid);
  const snap = await getDoc(ref);

  // Determine correct role using whitelist
  const cleanEmail = (fbUser.email || '').toLowerCase().trim();
  const isWhitelistAdmin = ADMIN_EMAILS.some(e => e.toLowerCase() === cleanEmail);
  const isWhitelistHr = HR_EMAILS.some(e => e.toLowerCase() === cleanEmail);
  const targetRole = isWhitelistAdmin ? 'admin' : (isWhitelistHr ? 'hr' : role);

  if (snap.exists()) {
    const currentData = snap.data() || {};
    const currentRole = currentData.role;
    // Always correct the role for whitelisted users (covers case where they previously got 'customer')
    const needsRoleUpdate = (isWhitelistAdmin && currentRole !== 'admin') || (isWhitelistHr && currentRole !== 'hr' && currentRole !== 'admin');
    const payload = {
      ...extra,
      ...(needsRoleUpdate ? { role: targetRole } : {})
    };
    if (needsRoleUpdate || Object.keys(extra).length > 0) {
      await setDoc(ref, payload, { merge: true });
      const updatedSnap = await getDoc(ref);
      return normalizeDoc({ uid: fbUser.uid, ...updatedSnap.data() });
    }
    return normalizeDoc({ uid: fbUser.uid, ...snap.data() });
  }
  const newUser = {
    name: fbUser.displayName || extra.name || 'User',
    email: fbUser.email || extra.email || '',
    phoneNumber: fbUser.phoneNumber || extra.phoneNumber || '',
    role: targetRole,
    status: 'active',
    createdAt: new Date().toISOString(),
    ...extra,
  };
  await setDoc(ref, newUser);
  return { uid: fbUser.uid, ...newUser };
}

let activeUserUnsub: (() => void) | null = null;

// Keep auth state in sync with Firestore user doc and monitor session state
firebaseOnAuthStateChanged(firebaseAuth, async (fbUser) => {
  if (activeUserUnsub) {
    activeUserUnsub();
    activeUserUnsub = null;
  }

  if (fbUser) {
    const userRef = doc(db, 'users', fbUser.uid);

    const cleanEmail = (fbUser.email || '').toLowerCase().trim();
    const isAdminEmail = ADMIN_EMAILS.some(e => e.toLowerCase() === cleanEmail);
    const isHrEmail = HR_EMAILS.some(e => e.toLowerCase() === cleanEmail);

    activeUserUnsub = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const normalized = normalizeDoc({ uid: fbUser.uid, ...data });
        if (isAdminEmail) {
          normalized.role = 'admin';
        } else if (isHrEmail) {
          normalized.role = 'hr';
        }
        currentAuthUser = normalized;
      } else {
        currentAuthUser = {
          uid: fbUser.uid,
          email: fbUser.email,
          role: isAdminEmail ? 'admin' : (isHrEmail ? 'hr' : 'customer'),
          name: fbUser.displayName || ''
        };
      }
      if (currentUserListener) currentUserListener(currentAuthUser);
    });
  } else {
    currentAuthUser = null;
    if (currentUserListener) currentUserListener(null);
  }
});

export const auth = {
  getCurrentUser: () => currentAuthUser,

  onAuthStateChanged: (callback: (user: any) => void) => {
    currentUserListener = callback;
    callback(currentAuthUser);
    return () => { currentUserListener = null; };
  },

  signUp: async (form: any) => {
    const newSessionId = 'sess_' + id10();
    if (isBrowser) {
      localStorage.setItem('buyqk_session_id', newSessionId);
    }
    const cred = await createUserWithEmailAndPassword(firebaseAuth, form.email, form.password);
    const user = await hydrateUser(cred.user, form.role || 'customer', {
      name: form.name,
      email: form.email,
      phoneNumber: form.phoneNumber || '',
      currentSessionId: newSessionId
    });

    if (form.role === 'seller') {
      await setDoc(doc(db, 'sellers', user.uid), {
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        status: 'pending',
        createdAt: user.createdAt,
      });
    } else {
      await setDoc(doc(db, 'customers', user.uid), {
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        walletBalance: 200,
        rewardPoints: 50,
        createdAt: user.createdAt,
      });
    }

    currentAuthUser = user;
    if (currentUserListener) currentUserListener(user);
    return user;
  },

  signIn: async (form: any) => {
    const newSessionId = 'sess_' + id10();
    if (isBrowser) {
      localStorage.setItem('buyqk_session_id', newSessionId);
    }
    const cleanE = (form.email || '').toLowerCase().trim();
    const isAdminEmail = ADMIN_EMAILS.some(e => e.toLowerCase() === cleanE);
    const isHrEmail = HR_EMAILS.some(e => e.toLowerCase() === cleanE);
    const targetRole = isAdminEmail ? 'admin' : (isHrEmail ? 'hr' : 'customer');

    let cred;
    try {
      cred = await signInWithEmailAndPassword(firebaseAuth, form.email, form.password);
    } catch (err: any) {
      if ((isAdminEmail || isHrEmail) && (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential')) {
        try {
          cred = await createUserWithEmailAndPassword(firebaseAuth, form.email, form.password);
        } catch (createErr) {
          throw err;
        }
      } else {
        throw err;
      }
    }

    const user = await hydrateUser(cred.user, targetRole, { currentSessionId: newSessionId });
    currentAuthUser = user;
    if (currentUserListener) currentUserListener(user);
    return user;
  },

  signInWithGoogle: async (defaultRole: 'customer' | 'seller' | 'admin' | 'hr' = 'customer') => {
    const newSessionId = 'sess_' + id10();
    if (isBrowser) {
      localStorage.setItem('buyqk_session_id', newSessionId);
    }
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(firebaseAuth, provider);
    const fbUser = result.user;
    const cleanE = (fbUser.email || '').toLowerCase().trim();
    const isAdminEmail = ADMIN_EMAILS.some(e => e.toLowerCase() === cleanE);
    const isHrEmail = HR_EMAILS.some(e => e.toLowerCase() === cleanE);
    const role = isAdminEmail ? 'admin' : (isHrEmail ? 'hr' : defaultRole);
    const user = await hydrateUser(fbUser, role, { currentSessionId: newSessionId });
    currentAuthUser = user;
    if (currentUserListener) currentUserListener(user);
    return user;
  },

  signOut: async () => {
    await firebaseSignOut(firebaseAuth);
    currentAuthUser = null;
    if (isBrowser) {
      localStorage.removeItem('buyqk_session_id');
    }
    if (currentUserListener) currentUserListener(null);
  },
};

// ==========================================
// SHOP SERVICE
// ==========================================

export const shopService = {
  createShop: async (sellerId: string, data: any): Promise<Shop> => {
    const shopId = 'shop_' + id10();
    const logoUrl = await storageService.uploadBase64(`shops/${shopId}/logo`, data.logoBase64 || '');
    const bannerUrl = await storageService.uploadBase64(`shops/${shopId}/banner`, data.bannerBase64 || '');

    const newShop: any = {
      sellerId,
      name: data.shopName,
      description: data.description,
      logoBase64: logoUrl,
      bannerBase64: bannerUrl,
      address: {
        street: data.street,
        city: data.city,
        state: data.state,
        postalCode: data.postalCode,
        formattedAddress: `${data.street}, ${data.city}, ${data.state} - ${data.postalCode}`,
        location: { latitude: data.latitude || 19.1136, longitude: data.longitude || 72.8258 },
      },
      location: { latitude: data.latitude || 19.1136, longitude: data.longitude || 72.8258 },
      deliveryRadiusKm: data.deliveryRadiusKm || 5,
      openingTime: data.openingTime || '08:00',
      closingTime: data.closingTime || '22:00',
      status: 'pending',
      isActive: true,
      categories: data.categories || ['cat_groceries'],
      createdAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'shops', shopId), newShop);

    // Update seller doc
    const sellerRef = doc(db, 'sellers', sellerId);
    const sellerSnap = await getDoc(sellerRef);
    if (sellerSnap.exists()) {
      await updateDoc(sellerRef, {
        shopId, status: 'pending',
        pan: data.pan || '', gst: data.gst || ''
      });
    } else {
      await setDoc(sellerRef, {
        name: currentAuthUser?.name || '',
        email: currentAuthUser?.email || '',
        phoneNumber: currentAuthUser?.phoneNumber || '',
        shopId, status: 'pending',
        pan: data.pan || '', gst: data.gst || '',
        createdAt: new Date().toISOString(),
      });
    }

    // Update user's shopId
    if (currentAuthUser) {
      await setDoc(doc(db, 'users', sellerId), { shopId }, { merge: true });
      currentAuthUser = { ...currentAuthUser, shopId };
      if (currentUserListener) currentUserListener(currentAuthUser);
    }

    return { id: shopId, ...newShop } as Shop;
  },

  getShops: async (): Promise<Shop[]> => {
    const snap = await getDocs(collection(db, 'shops'));
    return snap.docs.map(d => normalizeDoc({ id: d.id, ...d.data() })) as Shop[];
  },

  subscribeToShops: (callback: (shops: Shop[]) => void): (() => void) => {
    return onSnapshot(collection(db, 'shops'), (snap) => {
      const shops = snap.docs.map(d => normalizeDoc({ id: d.id, ...d.data() })) as Shop[];
      callback(shops);
    });
  },

  getShopById: async (id: string): Promise<Shop | undefined> => {
    const snap = await getDoc(doc(db, 'shops', id));
    return snap.exists() ? normalizeDoc({ id: snap.id, ...snap.data() }) as Shop : undefined;
  },

  getShopBySellerIdSync: (sellerId: string, allShops: Shop[]): Shop | undefined => {
    return allShops.find(s => s.sellerId === sellerId);
  },

  getNearbyShops: (lat: number, lng: number, allShops: Shop[]): (Shop & { distanceKm: number })[] => {
    const approved = allShops.filter(s => s.status === 'approved' && s.isActive);
    const listed = approved.map(s => {
      const shopLat = s.location?.latitude ?? 19.1136;
      const shopLng = s.location?.longitude ?? 72.8258;
      return { ...s, distanceKm: calculateDistance(lat, lng, shopLat, shopLng) };
    });
    const getRadius = (s: Shop) => (typeof s.deliveryRadiusKm === 'number' && s.deliveryRadiusKm > 0 ? s.deliveryRadiusKm : 5);
    const withinRadius = listed.filter(s => s.distanceKm <= getRadius(s));
    if (withinRadius.length > 0) return withinRadius.sort((a, b) => a.distanceKm - b.distanceKm);
    // Fallback: show all shops with simulated distance for testing
    return listed.map(s => ({ ...s, distanceKm: Number(Math.min(s.distanceKm, getRadius(s) - 0.5).toFixed(2)) }))
      .sort((a, b) => a.distanceKm - b.distanceKm);
  },

  approveShop: async (shopId: string): Promise<void> => {
    const shopRef = doc(db, 'shops', shopId);
    const shopSnap = await getDoc(shopRef);
    if (!shopSnap.exists()) return;
    const shopData = shopSnap.data();
    await updateDoc(shopRef, { status: 'approved' });
    if (shopData?.sellerId) {
      await setDoc(doc(db, 'sellers', shopData.sellerId), { status: 'approved' }, { merge: true });
      await setDoc(doc(db, 'users', shopData.sellerId), { status: 'approved' }, { merge: true });
    }
  },

  rejectShop: async (shopId: string): Promise<void> => {
    const shopRef = doc(db, 'shops', shopId);
    const shopSnap = await getDoc(shopRef);
    if (!shopSnap.exists()) return;
    const shopData = shopSnap.data();
    await updateDoc(shopRef, { status: 'suspended' });
    if (shopData?.sellerId) {
      await setDoc(doc(db, 'sellers', shopData.sellerId), { status: 'rejected' }, { merge: true });
    }
  },

  updateShopImages: async (shopId: string, logoBase64?: string, bannerBase64?: string): Promise<void> => {
    const updates: any = {};
    if (logoBase64) {
      updates.logoBase64 = await storageService.uploadBase64(`shops/${shopId}/logo`, logoBase64);
    }
    if (bannerBase64) {
      updates.bannerBase64 = await storageService.uploadBase64(`shops/${shopId}/banner`, bannerBase64);
    }
    if (Object.keys(updates).length > 0) {
      await updateDoc(doc(db, 'shops', shopId), updates);
    }
  },

  updateShopDetails: async (shopId: string, data: {
    name: string;
    description: string;
    street: string;
    city: string;
    state: string;
    postalCode: string;
    latitude: number;
    longitude: number;
    deliveryRadiusKm: number;
    openingTime: string;
    closingTime: string;
    categories: string[];
  }): Promise<void> => {
    const updates = {
      name: data.name,
      description: data.description,
      address: {
        street: data.street,
        city: data.city,
        state: data.state,
        postalCode: data.postalCode,
        formattedAddress: `${data.street}, ${data.city}, ${data.state} - ${data.postalCode}`,
        location: { latitude: Number(data.latitude), longitude: Number(data.longitude) }
      },
      location: { latitude: Number(data.latitude), longitude: Number(data.longitude) },
      deliveryRadiusKm: Number(data.deliveryRadiusKm),
      openingTime: data.openingTime,
      closingTime: data.closingTime,
      categories: data.categories
    };
    await updateDoc(doc(db, 'shops', shopId), updates);
  },
};

// ==========================================
// PRODUCT & CATALOG
// ==========================================

export const productService = {
  createProduct: async (data: any): Promise<Product> => {
    const productId = 'prod_' + id10();
    const imageUrl = await storageService.uploadBase64(`products/${productId}/image`, data.imageBase64 || '');

    const newProduct: any = {
      name: data.name,
      description: data.description,
      categoryId: data.categoryId,
      brandId: data.brandId || 'b_local',
      imageBase64: imageUrl,
      imageTextDescription: `Descriptive tag of ${data.name}`,
      isApproved: true,
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'products', productId), newProduct);
    return { id: productId, ...newProduct } as Product;
  },

  subscribeToProducts: (callback: (prods: Product[]) => void): (() => void) => {
    return onSnapshot(collection(db, 'products'), (snap) => {
      callback(snap.docs.map(d => normalizeDoc({ id: d.id, ...d.data() })) as Product[]);
    });
  },

  getProducts: async (): Promise<Product[]> => {
    const snap = await getDocs(collection(db, 'products'));
    return snap.docs.map(d => normalizeDoc({ id: d.id, ...d.data() })) as Product[];
  },

  getCategories: (): Category[] => CATEGORIES,
  getBrands: (): Brand[] => BRANDS,
};

// ==========================================
// INVENTORY
// ==========================================

export const inventoryService = {
  updateInventory: async (shopId: string, productId: string, stock: number, price: number): Promise<void> => {
    const id = `${shopId}_${productId}`;
    await setDoc(doc(db, 'inventory', id), {
      shopId, productId, stock, price,
      isAvailable: stock > 0,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  },

  getInventoryByShop: async (shopId: string): Promise<(InventoryItem & { product?: Product })[]> => {
    const invSnap = await getDocs(query(collection(db, 'inventory'), where('shopId', '==', shopId)));
    const prodSnap = await getDocs(collection(db, 'products'));
    const products: Product[] = prodSnap.docs.map(d => normalizeDoc({ id: d.id, ...d.data() })) as Product[];
    return invSnap.docs.map(d => {
      const item = normalizeDoc({ id: d.id, ...d.data() }) as InventoryItem;
      return { ...item, product: products.find(p => p.id === item.productId) };
    });
  },

  getInventoryByShopSync: (shopId: string, allInv: InventoryItem[], allProducts: Product[]): (InventoryItem & { product?: Product })[] => {
    return allInv.filter(i => i.shopId === shopId).map(item => ({
      ...item,
      product: allProducts.find(p => p.id === item.productId)
    }));
  },

  subscribeToInventory: (shopId: string | null, callback: (inv: InventoryItem[]) => void): (() => void) => {
    const q = shopId ? query(collection(db, 'inventory'), where('shopId', '==', shopId)) : collection(db, 'inventory');
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map(d => normalizeDoc({ id: d.id, ...d.data() })) as InventoryItem[]);
    });
  },

  subscribeToAllInventory: (callback: (inv: InventoryItem[]) => void): (() => void) => {
    return onSnapshot(collection(db, 'inventory'), (snap) => {
      callback(snap.docs.map(d => normalizeDoc({ id: d.id, ...d.data() })) as InventoryItem[]);
    });
  },

  getNearbyInventory: (lat: number, lng: number, allShops: Shop[], allInv: InventoryItem[], allProducts: Product[]) => {
    const nearbyShops = shopService.getNearbyShops(lat, lng, allShops);
    const results: any[] = [];
    nearbyShops.forEach(shop => {
      const shopInv = allInv.filter(i => i.shopId === shop.id && i.stock > 0 && i.isAvailable);
      shopInv.forEach(item => {
        const prod = allProducts.find(p => p.id === item.productId && p.isApproved);
        if (prod) results.push({ ...item, product: prod, shop, distanceKm: shop.distanceKm });
      });
    });
    return results;
  },
};

// ==========================================
// ORDER SERVICE
// ==========================================

const DEFAULT_SETTINGS = DEFAULT_PLATFORM_SETTINGS;

export const orderService = {
  checkoutCart: async (
    customerId: string,
    customerName: string,
    customerPhone: string,
    items: any[],
    deliveryAddress: Address,
    paymentMethod: PaymentMethod,
    allShops: Shop[]
  ): Promise<string> => {
    // Get settings
    const settingsSnap = await getDoc(doc(db, 'settings', 'platform'));
    const settings: PlatformSettings = settingsSnap.exists() ? (settingsSnap.data() as PlatformSettings) : DEFAULT_SETTINGS;

    const itemsByShop: { [shopId: string]: any[] } = {};
    items.forEach(item => {
      if (!itemsByShop[item.shopId]) itemsByShop[item.shopId] = [];
      itemsByShop[item.shopId].push(item);
    });

    const parentOrderId = 'group_' + id10();
    const subOrderIds: string[] = [];

    // If wallet payment, deduct first
    if (paymentMethod === 'wallet') {
      const totalBill = items.reduce((acc, i) => acc + i.price * i.quantity, 0) + settings.platformFee;
      const custRef = doc(db, 'customers', customerId);
      const custSnap = await getDoc(custRef);
      const custData = custSnap.data();
      if (!custData || custData.walletBalance < totalBill) {
        throw new Error('Insufficient wallet balance. Please recharge or choose COD.');
      }
      await updateDoc(custRef, { walletBalance: Number((custData.walletBalance - totalBill).toFixed(2)) });
    }

    const batch = writeBatch(db);

    for (const shopId of Object.keys(itemsByShop)) {
      const shopItems = itemsByShop[shopId];
      const shopInfo = allShops.find(s => s.id === shopId);
      const subtotal = shopItems.reduce((acc, i) => acc + i.price * i.quantity, 0);
      const deliveryCharge = subtotal >= settings.freeDeliveryThreshold ? 0 : settings.baseDeliveryCharge;
      const tax = Number((subtotal * 0.05).toFixed(2));
      const orderTotal = subtotal + deliveryCharge + settings.platformFee + tax;
      const subOrderId = 'ord_' + id10();
      subOrderIds.push(subOrderId);

      const orderData: any = {
        parentOrderId,
        customerId, customerName, customerPhone,
        shopId, shopName: shopInfo?.name || 'Unknown Store',
        items: shopItems.map(item => ({
          productId: item.productId,
          name: item.product?.name || '',
          quantity: item.quantity,
          unitPrice: item.price,
          totalPrice: item.price * item.quantity,
        })),
        deliveryAddress,
        paymentMethod,
        subtotal, deliveryCharge, tax,
        platformFee: settings.platformFee,
        total: orderTotal,
        status: 'placed' as OrderStatus,
        paymentStatus: (paymentMethod === 'wallet' ? 'paid' : 'pending') as PaymentStatus,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      batch.set(doc(db, 'orders', subOrderId), orderData);
    }

    // Group doc
    batch.set(doc(db, 'order_groups', parentOrderId), {
      customerId, customerName,
      orderIds: subOrderIds,
      status: 'placed',
      createdAt: new Date().toISOString(),
    });

    await batch.commit();
    return parentOrderId;
  },

  subscribeToOrders: (customerId: string | null, callback: (orders: Order[]) => void): (() => void) => {
    const q = customerId
      ? query(collection(db, 'orders'), where('customerId', '==', customerId))
      : collection(db, 'orders');
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map(d => normalizeDoc({ id: d.id, ...d.data() })) as Order[]);
    });
  },

  subscribeToShopOrders: (shopId: string, callback: (orders: Order[]) => void): (() => void) => {
    const q = query(collection(db, 'orders'), where('shopId', '==', shopId));
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map(d => normalizeDoc({ id: d.id, ...d.data() })) as Order[]);
    });
  },

  subscribeToAllOrders: (callback: (orders: Order[]) => void): (() => void) => {
    return onSnapshot(collection(db, 'orders'), (snap) => {
      callback(snap.docs.map(d => normalizeDoc({ id: d.id, ...d.data() })) as Order[]);
    });
  },

  updateOrderStatus: async (orderId: string, status: OrderStatus): Promise<void> => {
    await updateDoc(doc(db, 'orders', orderId), { status, updatedAt: new Date().toISOString() });
  },
};

// ==========================================
// WALLET SERVICE
// ==========================================

export const walletService = {
  getBalance: async (customerId: string): Promise<number> => {
    const snap = await getDoc(doc(db, 'customers', customerId));
    return snap.exists() ? (snap.data()?.walletBalance || 0) : 0;
  },

  subscribeToWallet: (customerId: string, callback: (balance: number) => void): (() => void) => {
    return onSnapshot(doc(db, 'customers', customerId), (snap) => {
      callback(snap.exists() ? (snap.data()?.walletBalance || 0) : 0);
    });
  },

  addFunds: async (customerId: string, amount: number): Promise<void> => {
    const ref = doc(db, 'customers', customerId);
    const snap = await getDoc(ref);
    const current = snap.exists() ? (snap.data()?.walletBalance || 0) : 0;
    await updateDoc(ref, { walletBalance: Number((current + amount).toFixed(2)) });
  },
};

// ==========================================
// CUSTOMER SERVICE
// ==========================================

export const customerService = {
  subscribeToCustomer: (customerId: string, callback: (customer: any) => void): (() => void) => {
    return onSnapshot(doc(db, 'customers', customerId), (snap) => {
      callback(snap.exists() ? normalizeDoc({ uid: snap.id, ...snap.data() }) : null);
    });
  },
};

// ==========================================
// ADMIN SERVICE
// ==========================================

export const adminService = {
  subscribeToUsers: (callback: (users: any[]) => void): (() => void) => {
    return onSnapshot(collection(db, 'users'), (snap) => {
      callback(snap.docs.map(d => normalizeDoc({ uid: d.id, ...d.data() })));
    });
  },

  subscribeToSellers: (callback: (sellers: any[]) => void): (() => void) => {
    return onSnapshot(collection(db, 'sellers'), (snap) => {
      callback(snap.docs.map(d => normalizeDoc({ uid: d.id, ...d.data() })));
    });
  },

  getPlatformSettings: async (): Promise<PlatformSettings> => {
    const snap = await getDoc(doc(db, 'settings', 'platform'));
    return snap.exists() ? (snap.data() as PlatformSettings) : DEFAULT_PLATFORM_SETTINGS;
  },

  updatePlatformSettings: async (settings: PlatformSettings): Promise<void> => {
    await setDoc(doc(db, 'settings', 'platform'), settings);
  },

  createCity: async (name: string, state: string, country: string): Promise<void> => {
    await addDoc(collection(db, 'cities'), { name, state, country, active: true });
  },

  createArea: async (name: string, cityId: string): Promise<void> => {
    await addDoc(collection(db, 'areas'), { name, cityId, active: true });
  },

  createZone: async (name: string, areaId: string, cityId: string, coordinates: LatLng[]): Promise<void> => {
    await addDoc(collection(db, 'zones'), { name, areaId, cityId, coordinates, active: true });
  },

  getUsers: async (): Promise<any[]> => {
    const snap = await getDocs(collection(db, 'users'));
    return snap.docs.map(d => normalizeDoc({ uid: d.id, ...d.data() }));
  },

  adminCreateShop: async (data: {
    sellerName: string; sellerEmail: string; sellerPhone: string;
    shopName: string; description: string;
    street: string; city: string; state: string; postalCode: string;
    latitude: number; longitude: number;
    deliveryRadiusKm: number; openingTime: string; closingTime: string;
    categories: string[]; logoBase64: string; bannerBase64: string;
    pan?: string; gst?: string;
  }): Promise<Shop> => {
    // Create Firebase Auth account for seller using a secondary app instance to preserve admin session
    let sellerId: string;
    try {
      const tempPass = 'BuyQk@' + id10();
      const secAppName = 'sec_' + id10();
      const secApp = initializeApp(firebaseConfig, secAppName);
      const secAuth = getAuth(secApp);
      const cred = await createUserWithEmailAndPassword(secAuth, data.sellerEmail, tempPass);
      sellerId = cred.user.uid;
      await firebaseSignOut(secAuth);
      await deleteApp(secApp);
    } catch (e: any) {
      if (e.code === 'auth/email-already-in-use') {
        // Find existing user
        const usersSnap = await getDocs(query(collection(db, 'users'), where('email', '==', data.sellerEmail)));
        if (!usersSnap.empty) {
          sellerId = usersSnap.docs[0].id;
        } else {
          sellerId = 'seller_' + id10();
        }
      } else {
        sellerId = 'seller_' + id10();
      }
    }

    const shopId = 'shop_' + id10();
    const logoUrl = await storageService.uploadBase64(`shops/${shopId}/logo`, data.logoBase64 || '');
    const bannerUrl = await storageService.uploadBase64(`shops/${shopId}/banner`, data.bannerBase64 || '');

    const batch = writeBatch(db);

    batch.set(doc(db, 'users', sellerId), {
      name: data.sellerName, email: data.sellerEmail, phoneNumber: data.sellerPhone,
      role: 'seller', status: 'approved', shopId,
      createdAt: new Date().toISOString(),
    }, { merge: true });

    batch.set(doc(db, 'sellers', sellerId), {
      name: data.sellerName, email: data.sellerEmail, phoneNumber: data.sellerPhone,
      shopId, status: 'approved', pan: data.pan || '', gst: data.gst || '',
      createdAt: new Date().toISOString(),
    }, { merge: true });

    const shopData: any = {
      sellerId,
      name: data.shopName, description: data.description,
      logoBase64: logoUrl, bannerBase64: bannerUrl,
      address: {
        street: data.street, city: data.city, state: data.state, postalCode: data.postalCode,
        formattedAddress: `${data.street}, ${data.city}, ${data.state} - ${data.postalCode}`,
        location: { latitude: data.latitude, longitude: data.longitude },
      },
      location: { latitude: data.latitude, longitude: data.longitude },
      deliveryRadiusKm: data.deliveryRadiusKm,
      openingTime: data.openingTime, closingTime: data.closingTime,
      categories: data.categories,
      status: 'approved', isActive: true,
      createdAt: new Date().toISOString(),
    };
    batch.set(doc(db, 'shops', shopId), shopData);

    await batch.commit();
    return { id: shopId, ...shopData } as Shop;
  },

  updateShopImages: async (shopId: string, logoBase64?: string, bannerBase64?: string): Promise<void> => {
    await shopService.updateShopImages(shopId, logoBase64, bannerBase64);
  },

  updateShopDetails: async (shopId: string, data: any): Promise<void> => {
    await shopService.updateShopDetails(shopId, data);
  },

  updateUserRole: async (userId: string, newRole: string): Promise<void> => {
    await updateDoc(doc(db, 'users', userId), { role: newRole });
  },

  adminCreateHRUser: async (data: { name: string; email: string; phoneNumber?: string; password?: string }): Promise<void> => {
    const userPass = data.password || 'HR' + Math.random().toString(36).substring(2, 9) + '!';
    const tempName = 'sec_' + Math.random().toString(36).substring(2, 9);
    const secApp = initializeApp(firebaseConfig, tempName);
    const secAuth = getAuth(secApp);
    const cred = await createUserWithEmailAndPassword(secAuth, data.email, userPass);
    const uid = cred.user.uid;
    
    await setDoc(doc(db, 'users', uid), {
      name: data.name,
      email: data.email,
      phoneNumber: data.phoneNumber || '',
      role: 'hr',
      status: 'active',
      createdAt: new Date().toISOString(),
      tempPasswordCreated: userPass
    });
    
    await firebaseSignOut(secAuth);
    await deleteApp(secApp);
  },
};



// ==========================================
// GEOGRAPHY SERVICE
// ==========================================

export const geoService = {
  subscribeToCities: (callback: (cities: City[]) => void): (() => void) => {
    return onSnapshot(collection(db, 'cities'), (snap) => {
      callback(snap.docs.map(d => normalizeDoc({ id: d.id, ...d.data() })) as City[]);
    });
  },
  subscribeToAreas: (callback: (areas: Area[]) => void): (() => void) => {
    return onSnapshot(collection(db, 'areas'), (snap) => {
      callback(snap.docs.map(d => normalizeDoc({ id: d.id, ...d.data() })) as Area[]);
    });
  },
  subscribeToZones: (callback: (zones: Zone[]) => void): (() => void) => {
    return onSnapshot(collection(db, 'zones'), (snap) => {
      callback(snap.docs.map(d => normalizeDoc({ id: d.id, ...d.data() })) as Zone[]);
    });
  },
};

// ==========================================
// GEMINI AI SERVICE
// ==========================================

export const geminiService = {
  askGeminiAssistant: async (userText: string, customerLocation?: LatLng): Promise<string> => {
    const apiKey = env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      return 'Gemini AI is not configured. Please define the VITE_GEMINI_API_KEY environment variable in your project/.env file.';
    }
    try {
      const lat = customerLocation?.latitude ?? 19.1136;
      const lng = customerLocation?.longitude ?? 72.8258;
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `You are buyQk shopping assistant. User location: ${lat},${lng}. Question: ${userText}` }] }]
          }),
        }
      );
      const data = await response.json();
      if (data?.error) {
        console.error("Gemini API Error details:", data.error);
        return `Gemini API Error: ${data.error.message || JSON.stringify(data.error)}`;
      }
      return data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from Gemini. The API key might be inactive, restricted, or blocked.';
    } catch (err: any) {
      console.error("Gemini assistant fetch failure:", err);
      return `AI assistant is temporarily offline: ${err?.message || err}`;
    }
  },
};

// Re-export db and rtdb for direct usage
export { db, firebaseApp, firebaseAuth, storage, rtdb };
export { CATEGORIES, BRANDS, DEFAULT_PLATFORM_SETTINGS };

// Keep backward compat for legacy imports
export const mockDb = {
  getData: () => [],
  saveData: () => {},
  subscribe: () => () => {},
};

export * from './whitelist';
