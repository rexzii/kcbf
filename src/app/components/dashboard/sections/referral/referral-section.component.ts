import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { UserLookup } from '../../../../models/user.model';
import { Referral } from '../../../../models/dashboard.model';

@Component({
  selector: 'app-referral-section',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './referral-section.component.html',
  styleUrl: './referral-section.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReferralSectionComponent {
  @Input({ required: true }) referralForm!: FormGroup;
  @Input() memberOptions: UserLookup[] = [];
  @Input() referrals: Referral[] = [];
  @Input() loading = false;

  @Output() submitForm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
  @Output() deleteReferral = new EventEmitter<string>();

  selectedReferral: Referral | null = null;

  isMobile = this.checkIfMobile();
  contactsAPIAvailable = this.checkContactsAPIAvailable();

  constructor(private cdr: ChangeDetectorRef) {}

  private checkIfMobile(): boolean {
    if (typeof window === 'undefined') return false;
    
    // Check user agent for mobile OS
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
    
    // Check for actual touch capability (not just dev tools emulation)
    const hasTouch = () => {
      try {
        document.createEvent('TouchEvent');
        return true;
      } catch (e) {
        return false;
      }
    };
    
    const isTouchDevice = hasTouch() || 
      (navigator as any).maxTouchPoints > 0 ||
      (navigator as any).msMaxTouchPoints > 0;
    
    // Only show on actual mobile devices or touch-capable devices
    // Not on desktop with dev tools mobile emulation
    return isMobileUA || (isTouchDevice && navigator.userAgent.includes('Mobile'));
  }

  private checkContactsAPIAvailable(): boolean {
    if (typeof window === 'undefined') return false;
    return 'contacts' in navigator;
  }

  async pickContact(): Promise<void> {
    try {
      // Check if Contacts API is available
      if (!('contacts' in navigator)) {
        alert('Contacts API is not supported on this device');
        return;
      }

      // Request contact with name and tel fields
      const contacts = await (navigator as any).contacts.select(
        ['name', 'tel'],
        { multiple: false }
      );

      if (contacts && contacts.length > 0) {
        const contact = contacts[0];
        
        // Extract name
        const name = contact.name?.[0] || '';
        if (name) {
          this.referralForm.patchValue({ referrerName: name });
        }

        // Extract phone number (remove non-digit characters)
        const phoneNumber = contact.tel?.[0] || '';
        if (phoneNumber) {
          const cleanedNumber = phoneNumber.replace(/\D/g, '');
          // Take last 10 digits if number is longer
          const lastTenDigits = cleanedNumber.slice(-10);
          if (lastTenDigits.length === 10) {
            this.referralForm.patchValue({ referrerContact: lastTenDigits });
          }
        }

        this.cdr.markForCheck();
      }
    } catch (error) {
      console.error('Error picking contact:', error);
      // Silently handle if user cancels the picker
    }
  }

  onDeleteReferral(referralId: string): void {
    const confirmed = window.confirm('Delete this referral?');
    if (!confirmed) {
      return;
    }

    this.deleteReferral.emit(referralId);
  }

  onViewReferral(referral: Referral): void {
    this.selectedReferral = referral;
    this.cdr.markForCheck();
  }

  closeReferralDetails(): void {
    this.selectedReferral = null;
    this.cdr.markForCheck();
  }
}
