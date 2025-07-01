// sms.service.ts
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SmsService {
  private endpoint = 'https://us-central1-prenatal-and-immunization.cloudfunctions.net/api/send-sms'; // <-- Replace with your actual URL

  constructor(private http: HttpClient) {}

  sendSms(phoneNumber: string, message: string, scheduledAt?: string): Observable<any> {
    const body: any = { phoneNumber, message };
    if (scheduledAt) body.scheduledAt = scheduledAt;
    return this.http.post(this.endpoint, body);
  }
}
