import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { UserLookup } from '../../../../models/user.model';

@Component({
  selector: 'app-meeting-section',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './meeting-section.component.html',
  styleUrl: './meeting-section.component.css'
})
export class MeetingSectionComponent {
  @Input({ required: true }) meetingForm!: FormGroup;
  @Input() memberOptions: UserLookup[] = [];
  @Input() loading = false;

  @Output() submitForm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
}
