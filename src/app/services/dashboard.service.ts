import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
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

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private apiUrl = 'http://localhost:3000/api';
  private dashboardData$ = new BehaviorSubject<DashboardData | null>(null);
  private memberProfile$ = new BehaviorSubject<MemberProfile | null>(null);

  constructor(private http: HttpClient) {}

  // Get dashboard data
  getDashboardData(): Observable<DashboardData> {
    return this.http.get<DashboardData>(`${this.apiUrl}/dashboard`);
  }

  // Get member profile
  getMemberProfile(): Observable<MemberProfile> {
    return this.http.get<MemberProfile>(`${this.apiUrl}/profile`);
  }

  // Update member profile
  updateMemberProfile(profile: MemberProfile): Observable<MemberProfile> {
    return this.http.put<MemberProfile>(`${this.apiUrl}/profile`, profile);
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
