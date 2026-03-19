import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { 
  DashboardData, 
  MemberProfile, 
  Referral, 
  DoneBusiness, 
  Recommendation, 
  MeetingRequest,
  MeetingRequestPayload,
  MeetingRequestCreateResponse
} from '../models/dashboard.model';
import { UserLookup } from '../models/user.model';

interface ProfileApiResponse {
  success: boolean;
  message?: string;
  user: {
    id: number;
    name: string;
    email: string;
    ekda_type: string | null;
    whatsapp_number: string | null;
    date_of_birth: string | null;
    company_name: string | null;
    industry: string | null;
    brief_profile: string | null;
    working_since: number | string | null;
    areas_of_interest: string | null;
    linkedin_profile: string | null;
    website: string | null;
  };
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private apiUrl = 'http://localhost:3000/api';
  private dashboardData$ = new BehaviorSubject<DashboardData | null>(null);
  private memberProfile$ = new BehaviorSubject<MemberProfile | null>(null);

  constructor(private http: HttpClient) {}

  private mapProfileResponse(response: ProfileApiResponse): MemberProfile {
    return {
      id: String(response.user.id),
      name: response.user.name,
      email: response.user.email,
      ekda: response.user.ekda_type ?? '',
      whatsappNumber: response.user.whatsapp_number ?? '',
      dateOfBirth: response.user.date_of_birth,
      companyName: response.user.company_name ?? '',
      industry: response.user.industry ?? '',
      businessProfile: response.user.brief_profile ?? '',
      workingSince: response.user.working_since ? Number(response.user.working_since) : null,
      areasOfInterest: response.user.areas_of_interest ?? '',
      linkedinProfile: response.user.linkedin_profile ?? '',
      website: response.user.website ?? ''
    };
  }

  // Get dashboard data
  getDashboardData(): Observable<DashboardData> {
    return this.http.get<DashboardData>(`${this.apiUrl}/dashboard`);
  }

  // Get member profile
  getMemberProfile(userId: number): Observable<MemberProfile> {
    return this.http
      .get<ProfileApiResponse>(`${this.apiUrl}/auth/user/${userId}`)
      .pipe(map((response) => this.mapProfileResponse(response)));
  }

  // Update member profile
  updateMemberProfile(userId: number, profile: MemberProfile): Observable<MemberProfile> {
    return this.http
      .put<ProfileApiResponse>(`${this.apiUrl}/auth/user/${userId}`, profile)
      .pipe(map((response) => this.mapProfileResponse(response)));
  }

  // Submit referral
  submitReferral(referral: Omit<Referral, 'id' | 'createdAt' | 'status'>): Observable<Referral> {
    return this.http.post<Referral>(`${this.apiUrl}/referrals`, referral);
  }

  // Get referrals
  getReferrals(): Observable<Referral[]> {
    return this.http.get<Referral[]>(`${this.apiUrl}/referrals`);
  }

  // Submit done business
  submitDoneBusiness(business: Omit<DoneBusiness, 'id' | 'createdAt' | 'status'>): Observable<DoneBusiness> {
    return this.http.post<DoneBusiness>(`${this.apiUrl}/done-business`, business);
  }

  // Get done business
  getDoneBusiness(): Observable<DoneBusiness[]> {
    return this.http.get<DoneBusiness[]>(`${this.apiUrl}/done-business`);
  }

  // Submit recommendation
  submitRecommendation(recommendation: Omit<Recommendation, 'id' | 'createdAt' | 'status'>): Observable<Recommendation> {
    return this.http.post<Recommendation>(`${this.apiUrl}/recommendations`, recommendation);
  }

  // Get recommendations
  getRecommendations(): Observable<Recommendation[]> {
    return this.http.get<Recommendation[]>(`${this.apiUrl}/recommendations`);
  }

  // Submit meeting request
  submitMeetingRequest(request: MeetingRequestPayload): Observable<MeetingRequestCreateResponse> {
    return this.http.post<MeetingRequestCreateResponse>(`${this.apiUrl}/meeting-requests`, request);
  }

  // Get meeting requests
  getMeetingRequests(userId: number): Observable<MeetingRequest[]> {
    return this.http.get<MeetingRequest[]>(`${this.apiUrl}/meeting-requests?userId=${userId}`);
  }

  // Get registered users for member search dropdowns
  getRegisteredUsers(excludeUserId?: number): Observable<UserLookup[]> {
    const query = excludeUserId ? `?excludeUserId=${excludeUserId}` : '';
    return this.http.get<UserLookup[]>(`${this.apiUrl}/auth/users${query}`);
  }

  // Update dashboard data
  updateDashboardData(data: DashboardData): void {
    this.dashboardData$.next(data);
  }

  // Update member profile
  updateMemberProfileLocal(profile: MemberProfile): void {
    this.memberProfile$.next(profile);
  }

  // Get observables for components
  getDashboardData$(): Observable<DashboardData | null> {
    return this.dashboardData$.asObservable();
  }

  getMemberProfile$(): Observable<MemberProfile | null> {
    return this.memberProfile$.asObservable();
  }
}
