import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DoneBusiness, MeetingRequest, MemberProfile, Recommendation, Referral } from '../../../../models/dashboard.model';

@Component({
  selector: 'app-overview-section',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './overview-section.component.html',
  styleUrl: './overview-section.component.css'
})
export class OverviewSectionComponent {
  @Input() memberProfile: MemberProfile | null = null;
  @Input() recommendationRequests: Recommendation[] = [];
  @Input() meetingRequests: MeetingRequest[] = [];
  @Input() referrals: Referral[] = [];
  @Input() doneBusinesses: DoneBusiness[] = [];

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
