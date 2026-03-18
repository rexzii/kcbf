import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { UserLookup } from '../../../../models/user.model';

@Component({
  selector: 'app-recommendation-section',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './recommendation-section.component.html',
  styleUrl: './recommendation-section.component.css'
})
export class RecommendationSectionComponent {
  @Input({ required: true }) recommendationForm!: FormGroup;
  @Input() memberOptions: UserLookup[] = [];
  @Input() loading = false;

  @Output() submitForm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
}
