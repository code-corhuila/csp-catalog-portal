import { Injectable, signal } from '@angular/core';

export type AdminToastType = 'success' | 'error';

export interface AdminToast {
  id: number;
  message: string;
  type: AdminToastType;
}

/**
 * Toast queue of the administration screens (bottom-right feedback of the
 * `index-admin.html` mockup). Toasts retire on their own after 3.5 seconds.
 */
@Injectable({ providedIn: 'root' })
export class AdminToastService {
  readonly toasts = signal<AdminToast[]>([]);

  private sequence = 0;

  success(message: string): void {
    this.push(message, 'success');
  }

  error(message: string): void {
    this.push(message, 'error');
  }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((toast) => toast.id !== id));
  }

  private push(message: string, type: AdminToastType): void {
    const id = (this.sequence += 1);
    this.toasts.update((list) => [...list, { id, message, type }]);
    setTimeout(() => this.dismiss(id), 3500);
  }
}
