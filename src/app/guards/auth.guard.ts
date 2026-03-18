import { Injectable } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate: CanActivateFn = () => {
    const user = localStorage.getItem('currentUser');
    if (user) {
      return true;
    }
    this.router.navigate(['/login']);
    return false;
  };
}
