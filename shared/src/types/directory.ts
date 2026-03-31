export type InvitationStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "EXPIRED";

export interface Directory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isVisible: boolean;
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  type?: string;
  description?: string;
}

export interface MemberOrganization {
  id: string;
  memberId: string;
  organization: Organization;
  verifiedAt?: string;
}

export interface DirectoryMember {
  id: string;
  directoryId: string;
  userId: string;
  photoUrl?: string;
  city?: string;
  industry?: string;
  employer?: string;
  preferredContact?: "email" | "phone" | "in-app";
  bio?: string;
  joinedAt: string;
  user: { id: string; fullName: string; email: string; phone?: string };
  organizations: MemberOrganization[];
}

export interface DirectoryInvitation {
  id: string;
  email: string;
  status: InvitationStatus;
  expiresAt: string;
}
