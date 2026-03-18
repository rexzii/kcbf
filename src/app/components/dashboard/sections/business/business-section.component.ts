import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { UserLookup } from '../../../../models/user.model';

@Component({
  selector: 'app-business-section',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './business-section.component.html',
  styleUrl: './business-section.component.css'
})
export class BusinessSectionComponent {
  @Input({ required: true }) businessForm!: FormGroup;
  @Input() memberOptions: UserLookup[] = [];
  @Input() loading = false;

  @Output() submitForm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
}
