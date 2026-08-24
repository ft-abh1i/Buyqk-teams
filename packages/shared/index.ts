import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

export const SignupSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.string().email({ message: "Invalid email address" }),
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, { message: "Invalid E.164 phone number" }),
  role: z.enum(['customer', 'seller']),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

export const SellerOnboardingSchema = z.object({
  shopName: z.string().min(3, { message: "Shop name must be at least 3 characters" }),
  description: z.string().min(10, { message: "Description must be at least 10 characters" }),
  street: z.string().min(5, { message: "Street is required" }),
  city: z.string().min(2, { message: "City is required" }),
  state: z.string().min(2, { message: "State is required" }),
  postalCode: z.string().min(5, { message: "Valid Postal Code is required" }),
  latitude: z.number({ required_error: "Shop location must be set on the map" }),
  longitude: z.number({ required_error: "Shop location must be set on the map" }),
  deliveryRadiusKm: z.number().min(1, { message: "Minimum delivery radius is 1km" }).max(50),
  openingTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: "Invalid time format (HH:MM)" }),
  closingTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: "Invalid time format (HH:MM)" }),
  pan: z.string().length(10, { message: "PAN must be exactly 10 characters" }),
  gst: z.string().max(15).optional().or(z.literal('')),
  categories: z.array(z.string()).min(1, { message: "Select at least one product category" }),
  logoBase64: z.string().min(100, { message: "Shop logo image is required" }),
  bannerBase64: z.string().min(100, { message: "Shop banner image is required" }),
});

export const ProductUploadSchema = z.object({
  name: z.string().min(2, { message: "Product name must be at least 2 characters" }),
  description: z.string().min(5, { message: "Product description is required" }),
  categoryId: z.string().min(1, { message: "Category is required" }),
  brandId: z.string().min(1, { message: "Brand is required" }),
  price: z.number().min(1, { message: "Price must be greater than 0" }),
  stock: z.number().int().min(0, { message: "Stock cannot be negative" }),
  imageBase64: z.string().min(100, { message: "Product image is required" }),
});

export const AddressSchema = z.object({
  street: z.string().min(5, { message: "Street is required" }),
  city: z.string().min(2, { message: "City is required" }),
  state: z.string().min(2, { message: "State is required" }),
  postalCode: z.string().min(5, { message: "Postal Code is required" }),
  latitude: z.number(),
  longitude: z.number(),
  formattedAddress: z.string(),
});

// Default settings
export const DEFAULT_PLATFORM_SETTINGS = {
  commissionPercent: 10, // 10%
  baseDeliveryCharge: 30, // ₹30 base
  deliveryChargePerKm: 10, // ₹10 per km after 2km
  platformFee: 5, // ₹5 platform fee
  freeDeliveryThreshold: 499, // Free delivery above ₹499
};
