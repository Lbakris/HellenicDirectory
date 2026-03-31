export interface Clergy {
  id: string;
  title?: string;
  fullName: string;
  email?: string;
  phone?: string;
}

export interface Metropolis {
  id: string;
  name: string;
  bishopName?: string;
  region?: string;
  website?: string;
}

export interface Parish {
  id: string;
  goarchId: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country: string;
  phone?: string;
  email?: string;
  website?: string;
  latitude?: number;
  longitude?: number;
  metropolisId?: string;
  metropolis?: Metropolis;
  clergy?: Clergy[];
}

export interface PaginatedParishes {
  data: Parish[];
  meta: { total: number; page: number; limit: number; pages: number };
}
