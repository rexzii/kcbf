import { Component, OnInit, signal, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable, take } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { DashboardService } from '../../services/dashboard.service';
import { MemberProfile, Referral, DoneBusiness, Recommendation, MeetingRequest, DashboardData, MeetingRequestPayload, RecommendationRequestPayload, RecommendationResponsePayload, ReferralCreatePayload } from '../../models/dashboard.model';
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
  currentUserId: number | null = null;
  activeTab = signal<TabKey>('overview');
  sidebarOpen = signal(false);
  isProfileEditing = signal(false);

  navItems: DashboardNavItem[] = [
    { key: 'overview', label: 'Dashboard', shortLabel: 'Home' },
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
  recommendationResponseForm!: FormGroup;
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
  selectedRecommendationRequest: Recommendation | null = null;
  showRecommendationPopup = signal(false);

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
    this.loadMemberProfile();
    this.loadRegisteredMembers();
    this.loadMeetingRequestsForCurrentUser();
    this.loadRecommendationsForCurrentUser();
    this.loadReferralsForCurrentUser();
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

    this.profileForm.disable();

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
      remarks: ['', [Validators.required]]
    });

    this.recommendationForm = this.fb.group({
      memberSearch: ['', [Validators.required]],
      remarks: ['', [Validators.required]]
    });

    this.recommendationResponseForm = this.fb.group({
      contactInfo: ['', [Validators.required]],
      referralField: ['', [Validators.required]]
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

  private loadRecommendationsForCurrentUser(): void {
    const currentUserId = this.authService.currentUser$.value?.id;

    if (!currentUserId) {
      return;
    }

    this.dashboardService.getRecommendations(currentUserId).subscribe({
      next: (requests) => {
        this.recommendationRequests = requests;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error loading recommendation requests:', err);
        this.cdr.markForCheck();
      }
    });
  }

  private loadReferralsForCurrentUser(): void {
    const currentUserId = this.authService.currentUser$.value?.id;

    if (!currentUserId) {
      return;
    }

    this.dashboardService.getReferrals(currentUserId).subscribe({
      next: (items) => {
        this.referrals = items;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error loading referrals:', err);
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
    this.authService.getCurrentUser().pipe(take(1)).subscribe({
      next: (currentUser) => {
        if (!currentUser?.id) {
          this.errorMessage.set('Unable to identify logged-in user. Please login again.');
          this.cdr.markForCheck();
          return;
        }

        this.currentUserId = currentUser.id;
        this.dashboardService.getMemberProfile(currentUser.id).subscribe({
          next: (profile) => {
            this.memberProfile = profile;
            this.profileForm.patchValue(profile);
            this.profileForm.disable();
            this.isProfileEditing.set(false);
            this.cdr.markForCheck();
          },
          error: (err) => {
            console.error('Error loading member profile:', err);
            this.errorMessage.set('Unable to load profile data.');
            this.cdr.markForCheck();
          }
        });
      },
      error: (err) => {
        console.error('Error reading logged-in user:', err);
      }
    });
  }

  onStartProfileEdit(): void {
    this.isProfileEditing.set(true);
    this.profileForm.enable();
    this.clearMessages();
    this.cdr.markForCheck();
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

  getActiveTabLabel(): string {
    switch (this.activeTab()) {
      case 'profile':
        return 'Edit Profile';
      case 'referral':
        return 'Upload Referral';
      case 'business':
        return 'Upload Done Business';
      case 'recommendation':
        return 'Get Recommendation';
      case 'meeting':
        return 'Request Meeting';
      case 'overview':
      default:
        return 'Dashboard';
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
    if (!this.currentUserId) {
      this.errorMessage.set('Unable to update profile because user session was not found.');
      this.cdr.markForCheck();
      return;
    }

    if (!this.isProfileEditing()) {
      this.errorMessage.set('Click Edit Profile before saving changes.');
      this.cdr.markForCheck();
      return;
    }

    if (this.handleInvalidForm(this.profileForm, 'Please complete required profile fields first.')) {
      return;
    }

    this.loading.set(true);
    this.cdr.markForCheck();
    const profileData = this.profileForm.value;
    
    this.dashboardService.updateMemberProfile(this.currentUserId, profileData).subscribe({
      next: (updated) => {
        this.memberProfile = updated;
        this.profileForm.patchValue(updated);
        this.profileForm.disable();
        this.isProfileEditing.set(false);
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

  onProfileCancel(): void {
    if (this.memberProfile) {
      this.profileForm.patchValue(this.memberProfile);
    }
    this.profileForm.disable();
    this.isProfileEditing.set(false);
    this.clearMessages();
    this.cdr.markForCheck();
  }

  onReferralSubmit(): void {
    if (this.handleInvalidForm(this.referralForm, 'Please fill referral details correctly.')) {
      return;
    }

    const currentUser = this.authService.currentUser$.value;

    if (!currentUser?.id) {
      this.errorMessage.set('Unable to identify logged in user. Please log in again.');
      this.cdr.markForCheck();
      return;
    }

    const recipientId = Number(this.referralForm.value.memberSearch);

    if (!Number.isInteger(recipientId) || recipientId <= 0) {
      this.errorMessage.set('Please select a valid member from search list.');
      this.cdr.markForCheck();
      return;
    }

    this.loading.set(true);
    this.cdr.markForCheck();
    const referralData: ReferralCreatePayload = {
      senderId: currentUser.id,
      recipientId,
      referrerName: (this.referralForm.value.referrerName || '').trim(),
      referrerContact: (this.referralForm.value.referrerContact || '').trim(),
      referralType: this.referralForm.value.referralType === 'outside' ? 'outside' : 'inside',
      remarks: (this.referralForm.value.remarks || '').trim()
    };
    
    this.dashboardService.submitReferral(referralData).subscribe({
      next: (referral) => {
        this.referralForm.reset({ referralType: 'inside' });
        this.loading.set(false);
        this.successMessage.set('Referral submitted successfully!');
        this.loadReferralsForCurrentUser();
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
    const currentUser = this.authService.currentUser$.value;

if (!currentUser?.id) {
  this.errorMessage.set('Unable to identify logged in user. Please log in again.');
  this.loading.set(false);
  this.cdr.markForCheck();
  return;
}
    const businessData = {
      userId: currentUser.id,
      memberName: (this.businessForm.value.memberName || '').trim(),
      amountClosed: Number(this.businessForm.value.amountClosed),
      remarks: (this.businessForm.value.remarks || '').trim()
    };
    
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

    const currentUser = this.authService.currentUser$.value;

    if (!currentUser?.id) {
      this.errorMessage.set('Unable to identify logged in user. Please log in again.');
      this.cdr.markForCheck();
      return;
    }

    const recipientId = Number(this.recommendationForm.value.memberSearch);

    if (!Number.isInteger(recipientId) || recipientId <= 0) {
      this.errorMessage.set('Please select a valid member.');
      this.cdr.markForCheck();
      return;
    }

    this.loading.set(true);
    this.cdr.markForCheck();
    const recommendationData: RecommendationRequestPayload = {
      requesterId: currentUser.id,
      recipientId,
      remarks: (this.recommendationForm.value.remarks || '').trim()
    };
    
    this.dashboardService.submitRecommendation(recommendationData).subscribe({
      next: () => {
        this.recommendationForm.reset();
        this.loading.set(false);
        this.successMessage.set('Recommendation sent successfully!');
        this.loadRecommendationsForCurrentUser();
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

  onRecommendationCardClick(request: Recommendation): void {
    this.selectedRecommendationRequest = request;
    this.recommendationResponseForm.reset({
      contactInfo: request.contactInfo || '',
      referralField: request.referralDetails || ''
    });
    this.clearMessages();
    this.showRecommendationPopup.set(true);
    this.cdr.markForCheck();
  }

  closeRecommendationPopup(): void {
    this.showRecommendationPopup.set(false);
    this.selectedRecommendationRequest = null;
    this.recommendationResponseForm.reset();
    this.cdr.markForCheck();
  }

  submitRecommendationResponse(): void {
    if (!this.selectedRecommendationRequest) {
      return;
    }

    if (this.handleInvalidForm(this.recommendationResponseForm, 'Please complete contact info and referral field.')) {
      return;
    }

    const currentUser = this.authService.currentUser$.value;
    if (!currentUser?.id) {
      this.errorMessage.set('Unable to identify logged in user. Please log in again.');
      this.cdr.markForCheck();
      return;
    }

    const payload: RecommendationResponsePayload = {
      recipientUserId: currentUser.id,
      contactInfo: (this.recommendationResponseForm.value.contactInfo || '').trim(),
      referralDetails: (this.recommendationResponseForm.value.referralField || '').trim()
    };

    this.loading.set(true);
    this.cdr.markForCheck();
    this.dashboardService.respondToRecommendation(this.selectedRecommendationRequest.id, payload).subscribe({
      next: (response) => {
        this.loading.set(false);
        this.successMessage.set(response.message || 'Recommendation response submitted successfully!');
        this.closeRecommendationPopup();
        this.loadRecommendationsForCurrentUser();
        this.cdr.markForCheck();
        setTimeout(() => this.clearMessages(), 3000);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set('Error submitting recommendation response. Please try again.');
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