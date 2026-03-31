export interface BusinessListing {
  id: string;
  businessName: string;
  contactName: string;
  phone: string;
  email: string;
  city: string;
  state?: string;
  website?: string;
  description?: string;
  logoUrl?: string;
  keywords: string[];
}

export interface PaginatedBusinesses {
  data: BusinessListing[];
  meta: { total: number; page: number; limit: number; pages: number };
}
