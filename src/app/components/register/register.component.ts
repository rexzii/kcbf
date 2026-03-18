import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegisterComponent implements OnInit {
  registerForm!: FormGroup;
  loading = false;
  submitted = false;
  error = '';
  successMessage = '';
  showOptionalFields = signal(false);

  states = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
    'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
    'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
    'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
  ];

  industries = [
    'Technology', 'Manufacturing', 'Finance', 'Healthcare', 'Education',
    'Retail', 'Real Estate', 'Transportation', 'Food & Beverage', 'Tourism',
    'Agriculture', 'Energy', 'Construction', 'Media & Entertainment', 'Other'
  ];

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.registerForm = this.formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      state: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      whatsappNumber: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      dateOfBirth: ['', Validators.required],
      companyName: ['', [Validators.required, Validators.minLength(2)]],
      industry: ['', Validators.required],
      briefProfile: ['', [Validators.required, Validators.minLength(10)]],
      workingSince: ['', [Validators.required, Validators.pattern(/^[0-9]{4}$/)]],
      areasOfInterest: ['', Validators.required],
      linkedinProfile: [''],
      website: [''],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (!password || !confirmPassword) {
      return null;
    }

    return password.value === confirmPassword.value ? null : { passwordMismatch: true };
  }

  get f() {
    return this.registerForm.controls;
  }

  onSubmit(): void {
    this.submitted = true;
    this.error = '';
    this.successMessage = '';
    this.cdr.markForCheck();

    if (this.registerForm.invalid) {
      return;
    }

    this.loading = true;
    this.cdr.markForCheck();
    const formValue = this.registerForm.value;
    delete formValue.confirmPassword;

    this.authService.register(formValue).subscribe({
      next: (response) => {
        if (response.success) {
          this.successMessage = 'Registration successful! Redirecting...';
          this.cdr.markForCheck();
          setTimeout(() => {
            this.router.navigate(['/dashboard']);
          }, 2000);
        }
      },
      error: (error) => {
        this.error = error.message || 'Registration failed';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }
}
