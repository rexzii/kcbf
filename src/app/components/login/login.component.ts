import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  loading = false;
  submitted = false;
  error = '';
  showPassword = false;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6), this.alphanumericValidator]]
    });
  }

  alphanumericValidator(control: any) {
    const value = control.value;
    if (!value) {
      return null;
    }
    const alphanumericRegex = /^[a-zA-Z0-9]*$/;
    return alphanumericRegex.test(value) ? null : { alphanumeric: true };
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
    this.cdr.markForCheck();
  }

  get f() {
    return this.loginForm.controls;
  }

  onSubmit(): void {
    this.submitted = true;
    this.error = '';
    this.cdr.markForCheck();

    if (this.loginForm.invalid) {
      return;
    }

    this.loading = true;
    this.cdr.markForCheck();
    this.authService.login(this.loginForm.value).subscribe({
      next: (response) => {
        if (response.success) {
          this.cdr.markForCheck();
          this.router.navigate(['/dashboard']);
        }
      },
      error: (error) => {
        this.error = error.message || 'Login failed';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }
}
