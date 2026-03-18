export interface Referral {
  id: string;
  referrerName: string;
  referrerContact: string;
  referralType: 'inside' | 'outside';
  remarks: string;
  createdAt: Date;
  status: 'pending' | 'approved' | 'rejected';
}

export interface DoneBusiness {
  id: string;
  memberName: string;
  amountClosed: number;
  remarks: string;
  createdAt: Date;
  status: 'pending' | 'approved' | 'rejected';
}

export interface Recommendation {
  id: string;
  recommendedMemberName: string;
  recommendedMemberEmail: string;
  remarks: string;
  createdAt: Date;
  status: 'pending' | 'sent';
}

export interface MeetingRequest {
  id: string;
  requesterName: string;
  requesterEmail: string;
  preferredDate: Date;
  remarks: string;
  createdAt: Date;
  status: 'pending' | 'scheduled' | 'cancelled';
}

export interface DashboardData {
  recommendationRequests: Recommendation[];
  meetingRequests: MeetingRequest[];
  referrals: Referral[];
  doneBusiness: DoneBusiness[];
}

export interface MemberProfile {
  id: string;
  name: string;
  email: string;
  ekda: string;
  whatsappNumber: string;
  dateOfBirth: string | null;
  companyName: string;
  industry: string;
  businessProfile: string;
  workingSince: number | null;
  areasOfInterest: string;
  linkedinProfile: string;
  website: string;
}
