import { Component, OnInit, signal, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable, take } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { DashboardService } from '../../services/dashboard.service';
import { MemberProfile, Referral, DoneBusiness, Recommendation, MeetingRequest, DashboardData, MeetingRequestPayload } from '../../models/dashboard.model';
import { User, UserLookup } from '../../models/user.model';
import { OverviewSectionComponent } from './sections/overview/overview-section.component';
import { ProfileSectionComponent } from './sections/profile/profile-section.component';
import { ReferralSectionComponent } from './sections/referral/referral-section.component';
import { BusinessSectionComponent } from './sections/business/business-section.component';
import { RecommendationSectionComponent } from './sections/recommendation/recommendation-section.component';
import { MeetingSectionComponent } from './sections/meeting/meeting-section.component';

type TabKey = 'overview' | 'profile' | 'referral' | 'business' | 'recommendation' | 'meeting';

interface DashboardNavItem {
  key: TabKey;
  label: string;
  shortLabel: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    OverviewSectionComponent,
    ProfileSectionComponent,
    ReferralSectionComponent,
    BusinessSectionComponent,
    RecommendationSectionComponent,
    MeetingSectionComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit {
  currentUser$!: Observable<User | null>;
  activeTab = signal<TabKey>('overview');
  sidebarOpen = signal(false);

  navItems: DashboardNavItem[] = [
    { key: 'overview', label: 'Dashboard', shortLabel: 'Home' },
    { key: 'profile', label: 'Edit Profile', shortLabel: 'Profile' },
    { key: 'referral', label: 'Upload Referral', shortLabel: 'Referral' },
    { key: 'business', label: 'Upload Done Business', shortLabel: 'Business' },
    { key: 'recommendation', label: 'Get Recommendation', shortLabel: 'Recommend' },
    { key: 'meeting', label: 'Request Meeting', shortLabel: 'Meeting' }
  ];
  
  dashboardData: DashboardData | null = null;
  memberProfile: MemberProfile | null = null;
  
  profileForm!: FormGroup;
  referralForm!: FormGroup;
  businessForm!: FormGroup;
  recommendationForm!: FormGroup;
  meetingForm!: FormGroup;

  loading = signal(false);
  successMessage = signal('');
  errorMessage = signal('');

  recommendationRequests: Recommendation[] = [];
  meetingRequests: MeetingRequest[] = [];
  referrals: Referral[] = [];
  doneBusinesses: DoneBusiness[] = [];
  registeredMembers: UserLookup[] = [];
  selectedMeetingMembers: UserLookup[] = [];

  constructor(
    private authService: AuthService,
    private dashboardService: DashboardService,
    private router: Router,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    this.currentUser$ = this.authService.currentUser$.asObservable();
    this.initializeForms();
  }

  ngOnInit(): void {
    this.loadDashboardData();
    this.loadMemberProfile();
    this.loadRegisteredMembers();
    this.loadMeetingRequestsForCurrentUser();
  }

  private loadRegisteredMembers(): void {
    this.authService.getCurrentUser().pipe(take(1)).subscribe({
      next: (currentUser) => {
        this.dashboardService.getRegisteredUsers(currentUser?.id).subscribe({
          next: (users) => {
            this.registeredMembers = users;
            this.cdr.markForCheck();
          },
          error: (err) => {
            console.error('Error loading registered members:', err);
            this.cdr.markForCheck();
          }
        });
      },
      error: (err) => {
        console.error('Error reading logged-in user:', err);
      }
    });
  }

  private initializeForms(): void {
    this.profileForm = this.fb.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      ekda: [''],
      whatsappNumber: ['', [Validators.pattern(/^[0-9]{10}$/)]],
      dateOfBirth: [''],
      companyName: [''],
      industry: [''],
      businessProfile: [''],
      workingSince: [''],
      areasOfInterest: [''],
      linkedinProfile: [''],
      website: ['']
    });

    this.referralForm = this.fb.group({
      referrerName: ['', [Validators.required]],
      referrerContact: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      referralType: ['inside', [Validators.required]],
      remarks: [''],
      memberSearch: ['', [Validators.required]]
    });

    this.businessForm = this.fb.group({
      memberName: ['', [Validators.required]],
      amountClosed: ['', [Validators.required, Validators.min(0)]],
      remark: ['']
    });

    this.recommendationForm = this.fb.group({
      memberSearch: ['', [Validators.required]],
      remarks: ['']
    });

    this.meetingForm = this.fb.group({
      memberSearch: [''],
      preferredDate: ['', [Validators.required]],
      remarks: ['']
    });
  }

  private loadMeetingRequestsForCurrentUser(): void {
    const currentUserId = this.authService.currentUser$.value?.id;

    if (!currentUserId) {
      return;
    }

    this.dashboardService.getMeetingRequests(currentUserId).subscribe({
      next: (requests) => {
        this.meetingRequests = requests;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error loading meeting requests:', err);
        this.cdr.markForCheck();
      }
    });
  }

  private loadDashboardData(): void {
    this.loading.set(true);
    this.cdr.markForCheck();
    this.dashboardService.getDashboardData().subscribe({
      next: (data) => {
        this.dashboardData = data;
        this.recommendationRequests = data.recommendationRequests;
        this.referrals = data.referrals;
        this.doneBusinesses = data.doneBusiness;
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error loading dashboard data:', err);
        this.loading.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  private loadMemberProfile(): void {
    this.dashboardService.getMemberProfile().subscribe({
      next: (profile) => {
        this.memberProfile = profile;
        this.profileForm.patchValue(profile);
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error loading member profile:', err);
        this.cdr.markForCheck();
      }
    });
  }

  setActiveTab(tab: TabKey): void {
    this.activeTab.set(tab);
    this.sidebarOpen.set(false);
    this.clearMessages();
  }

  toggleSidebar(): void {
    this.sidebarOpen.set(!this.sidebarOpen());
  }

  getTabCount(tab: TabKey): number {
    switch (tab) {
      case 'recommendation':
        return this.recommendationRequests.length;
      case 'meeting':
        return 0;
      case 'referral':
        return this.referrals.length;
      case 'business':
        return this.doneBusinesses.length;
      default:
        return 0;
    }
  }

  private handleInvalidForm(form: FormGroup, message: string): boolean {
    if (form.valid) {
      return false;
    }

    form.markAllAsTouched();
    this.errorMessage.set(message);
    this.cdr.markForCheck();
    return true;
  }

  onProfileSubmit(): void {
    if (this.handleInvalidForm(this.profileForm, 'Please complete required profile fields first.')) {
      return;
    }

    this.loading.set(true);
    this.cdr.markForCheck();
    const profileData = this.profileForm.value;
    
    this.dashboardService.updateMemberProfile(profileData).subscribe({
      next: (updated) => {
        this.memberProfile = updated;
        this.loading.set(false);
        this.successMessage.set('Profile updated successfully!');
        this.cdr.markForCheck();
        setTimeout(() => this.clearMessages(), 3000);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set('Error updating profile. Please try again.');
        this.cdr.markForCheck();
        console.error('Error:', err);
      }
    });
  }

  onReferralSubmit(): void {
    if (this.handleInvalidForm(this.referralForm, 'Please fill referral details correctly.')) {
      return;
    }

    this.loading.set(true);
    this.cdr.markForCheck();
    const { memberSearch, ...referralData } = this.referralForm.value;
    
    this.dashboardService.submitReferral(referralData).subscribe({
      next: (referral) => {
        this.referrals.unshift(referral);
        this.referralForm.reset({ referralType: 'inside' });
        this.loading.set(false);
        this.successMessage.set('Referral submitted successfully!');
        this.cdr.markForCheck();
        setTimeout(() => this.clearMessages(), 3000);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set('Error submitting referral. Please try again.');
        this.cdr.markForCheck();
        console.error('Error:', err);
      }
    });
  }

  onBusinessSubmit(): void {
    if (this.handleInvalidForm(this.businessForm, 'Please complete done business details.')) {
      return;
    }

    this.loading.set(true);
    this.cdr.markForCheck();
    const { memberName, ...businessData } = this.businessForm.value;
    
    this.dashboardService.submitDoneBusiness(businessData).subscribe({
      next: (business) => {
        this.doneBusinesses.unshift(business);
        this.businessForm.reset();
        this.loading.set(false);
        this.successMessage.set('Done Business submitted successfully!');
        this.cdr.markForCheck();
        setTimeout(() => this.clearMessages(), 3000);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set('Error submitting done business. Please try again.');
        this.cdr.markForCheck();
        console.error('Error:', err);
      }
    });
  }

  onRecommendationSubmit(): void {
    if (this.handleInvalidForm(this.recommendationForm, 'Please fill recommendation form first.')) {
      return;
    }

    this.loading.set(true);
    this.cdr.markForCheck();
    const { memberSearch, ...recommendationData } = this.recommendationForm.value;
    
    this.dashboardService.submitRecommendation(recommendationData).subscribe({
      next: (recommendation) => {
        this.recommendationRequests.unshift(recommendation);
        this.recommendationForm.reset();
        this.loading.set(false);
        this.successMessage.set('Recommendation sent successfully!');
        this.cdr.markForCheck();
        setTimeout(() => this.clearMessages(), 3000);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set('Error sending recommendation. Please try again.');
        this.cdr.markForCheck();
        console.error('Error:', err);
      }
    });
  }

  onMeetingSubmit(): void {
    if (this.handleInvalidForm(this.meetingForm, 'Please complete meeting request details.')) {
      return;
    }

    if (this.selectedMeetingMembers.length === 0) {
      this.errorMessage.set('Please add at least one member for the meeting request.');
      this.cdr.markForCheck();
      return;
    }

    const currentUser = this.authService.currentUser$.value;

    if (!currentUser?.id) {
      this.errorMessage.set('Unable to identify logged in user. Please log in again.');
      this.cdr.markForCheck();
      return;
    }

    this.loading.set(true);
    this.cdr.markForCheck();
    const payload: MeetingRequestPayload = {
      requesterId: currentUser.id,
      requesterName: currentUser.name,
      requesterEmail: currentUser.email,
      recipientIds: this.selectedMeetingMembers.map((member) => member.id),
      preferredDate: this.meetingForm.value.preferredDate,
      remarks: this.meetingForm.value.remarks || ''
    };
    
    this.dashboardService.submitMeetingRequest(payload).subscribe({
      next: (response) => {
        this.meetingForm.reset();
        this.selectedMeetingMembers = [];
        this.loading.set(false);
        this.successMessage.set(response.message || 'Meeting request submitted successfully!');
        this.loadMeetingRequestsForCurrentUser();
        this.cdr.markForCheck();
        setTimeout(() => this.clearMessages(), 3000);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set('Error submitting meeting request. Please try again.');
        this.cdr.markForCheck();
        console.error('Error:', err);
      }
    });
  }

  onMeetingAddMember(memberId: number): void {
    const alreadySelected = this.selectedMeetingMembers.some((member) => member.id === memberId);
    if (alreadySelected) {
      return;
    }

    const member = this.registeredMembers.find((item) => item.id === memberId);
    if (!member) {
      return;
    }

    this.selectedMeetingMembers = [...this.selectedMeetingMembers, member];
    this.meetingForm.patchValue({ memberSearch: '' });
    this.cdr.markForCheck();
  }

  onMeetingRemoveMember(memberId: number): void {
    this.selectedMeetingMembers = this.selectedMeetingMembers.filter((member) => member.id !== memberId);
    this.cdr.markForCheck();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  private clearMessages(): void {
    this.successMessage.set('');
    this.errorMessage.set('');
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'approved':
      case 'sent':
      case 'scheduled':
        return 'status-success';
      case 'rejected':
      case 'cancelled':
        return 'status-danger';
      default:
        return 'status-pending';
    }
  }
}
