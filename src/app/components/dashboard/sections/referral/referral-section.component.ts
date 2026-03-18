import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { UserLookup } from '../../../../models/user.model';

@Component({
  selector: 'app-referral-section',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './referral-section.component.html',
  styleUrl: './referral-section.component.css'
})
export class ReferralSectionComponent {
  @Input({ required: true }) referralForm!: FormGroup;
  @Input() memberOptions: UserLookup[] = [];
  @Input() loading = false;

  @Output() submitForm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
}
