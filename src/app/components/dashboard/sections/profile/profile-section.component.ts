import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-profile-section',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile-section.component.html',
  styleUrl: './profile-section.component.css'
})
export class ProfileSectionComponent {
  @Input({ required: true }) profileForm!: FormGroup;
  @Input() loading = false;

  @Output() submitForm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
}
