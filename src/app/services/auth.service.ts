import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { LoginRequest, RegisterRequest, AuthResponse, User } from '../models/user.model';
import { throwError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:3000/api/auth';
  currentUser$ = new BehaviorSubject<User | null>(null);
  private isAuthenticated$ = new BehaviorSubject<boolean>(false);

  constructor(private http: HttpClient) {
    this.loadUserFromStorage();
  }

  private loadUserFromStorage(): void {
    const user = localStorage.getItem('currentUser');
    
    if (user) {
      this.isAuthenticated$.next(true);
      this.currentUser$.next(JSON.parse(user));
    }
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials)
      .pipe(
        tap(response => {
          if (response.success && response.user) {
            localStorage.setItem('currentUser', JSON.stringify(response.user));
            this.isAuthenticated$.next(true);
            this.currentUser$.next(response.user as User);
          }
        }),
        catchError(this.handleError)
      );
  }

  register(data: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, data)
      .pipe(
        tap(response => {
          if (response.success && response.user) {
            localStorage.setItem('currentUser', JSON.stringify(response.user));
            this.isAuthenticated$.next(true);
            this.currentUser$.next(response.user as User);
          }
        }),
        catchError(this.handleError)
      );
  }

  logout(): void {
    localStorage.removeItem('currentUser');
    this.isAuthenticated$.next(false);
    this.currentUser$.next(null);
  }

  isAuthenticated(): Observable<boolean> {
    return this.isAuthenticated$.asObservable();
  }

  getCurrentUser(): Observable<User | null> {
    return this.currentUser$.asObservable();
  }

  isLoggedIn(): boolean {
    return localStorage.getItem('currentUser') !== null;
  }

  private handleError(error: any) {
    let errorMessage = 'An error occurred';
    if (error.error instanceof ErrorEvent) {
      errorMessage = error.error.message;
    } else if (error.error && error.error.message) {
      errorMessage = error.error.message;
    } else if (error.status === 0) {
      errorMessage = 'Cannot connect to server';
    }
    return throwError(() => new Error(errorMessage));
  }
}
